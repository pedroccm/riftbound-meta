"""Baixa decks de torneio do riftdecks.com (Riftbound, o TCG de League of Legends).

O site nao tem API: e server-rendered (PHP/Tabler) atras de Cloudflare com
Turnstile interativo. A sessao vem do rift_session.py (cf_clearance cunhado com
patchright headful + clique no checkbox; ver comentarios la).

Fluxo:
  1. pagina a listagem /riftbound-decks (20 decks/pagina) com os filtros padrao
     (deck_type=tournament, hide_banned=1, rank=top4, start_date=hoje-DAYS);
  2. para cada deck NOVO (sem data/deck_{id}.json), baixa a pagina de detalhe e
     salva o JSON com meta + decklist. Deck ja salvo nao e re-baixado (o deck e
     imutavel depois de publicado) -> rodadas seguintes so pegam o incremento.

O site nao publica confrontos (pairings); so a listagem de decks publicados.

Env:
  DAYS=14      janela: start_date = hoje - DAYS
  START_DATE=  override direto (YYYY-MM-DD; ignora DAYS)
  RANK=top4    filtro de rank da listagem (top4 | top8 | all)
  MAX=0        limite de decks novos a baixar (0 = sem limite)
  SLEEP=1.5    pausa entre requests
"""
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta

import requests
from bs4 import BeautifulSoup

import rift_session

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
BASE = 'https://riftdecks.com'

DAYS = int(os.environ.get('DAYS', 14))
START_DATE = os.environ.get('START_DATE', '')
RANK = os.environ.get('RANK', 'top4')
MAX = int(os.environ.get('MAX', 0))
SLEEP = float(os.environ.get('SLEEP', 1.5))

_session = {'ua': None, 'cookies': None}


def get(url, tries=5):
    """GET com a sessao cf_clearance.

    429 = rate limit da zona: ESPERAR com backoff, sem mexer na sessao (re-cunhar
    aqui endurece a zona - mesma licao da Liga, 16/07/2026). So 403/challenge em
    status normal derruba a sessao e re-cunha.
    """
    for n in range(tries):
        if _session['ua'] is None:
            _session['ua'], _session['cookies'] = rift_session.ensure_session()
        try:
            r = requests.get(url, headers={'User-Agent': _session['ua']},
                             cookies=_session['cookies'], timeout=60)
            if r.status_code == 200 and 'Just a moment' not in r.text:
                return r.text
            if r.status_code == 429:
                back = 45 * (n + 1)
                print(f'    HTTP 429 (rate limit) - espera {back}s', flush=True)
                time.sleep(back)
                continue
            print(f'    HTTP {r.status_code} (challenge={"Just a moment" in r.text}) '
                  f'em {url[:90]}', flush=True)
        except Exception as e:
            print(f'    erro {type(e).__name__}: {str(e)[:120]} em {url[:90]}', flush=True)
        # cookie caiu de verdade: forca re-cunhagem no proximo loop
        _session['ua'] = None
        try:
            os.remove(rift_session.CLEARANCE_FILE)
        except OSError:
            pass
        time.sleep(10 * (n + 1))
    raise RuntimeError(f'nao consegui baixar {url}')


def txt(el):
    return re.sub(r'\s+', ' ', el.get_text(' ', strip=True)) if el else ''


RANK_NUM = {'1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6,
            '7th': 7, '8th': 8}


def parse_listing(html):
    """Extrai as linhas da tabela de decks de uma pagina da listagem."""
    soup = BeautifulSoup(html, 'lxml')
    out = []
    for tr in soup.select('tr[id^="desktop-deck-"]'):
        deck_id = int(tr['id'].replace('desktop-deck-', ''))
        d = {'id': deck_id, 'url': tr.get('data-href', '')}

        td = tr.select_one('td.deck-rank')
        if td:
            d['rank'] = txt(td.select_one('strong'))
            d['rank_num'] = RANK_NUM.get(d['rank'], 99)
            d['record'] = txt(td.select_one('.text-secondary'))

        leg = tr.select_one('td.deck-legend-image span[title]')
        if leg:
            d['legend'] = leg['title']
            m = re.search(r"url\('([^']+)'\)", leg.get('style', ''))
            d['legend_img'] = m.group(1).replace('//', '/').replace(':/', '://') if m else ''

        td = tr.select_one('td.deck-name')
        if td:
            d['name'] = txt(td.select_one('a'))
            by = txt(td.select_one('.small.text-secondary'))
            d['player'] = re.sub(r'^by\s+', '', by)

        td = tr.select_one('td.deck-metagame')
        if td:
            d['meta'] = txt(td.select_one('.badge'))
            m = re.search(r'(\d+)\s*Cards', txt(td))
            d['card_count'] = int(m.group(1)) if m else None

        d['domains'] = [img['alt'] for img in tr.select('span.deck-domains img[alt]')]

        # célula do torneio: nome + @loja + N Players + estrelas
        for td in tr.select('td.small.text-left'):
            t = txt(td)
            m = re.search(r'(\d+)\s*Players', t)
            d['players'] = int(m.group(1)) if m else None
            store = td.select_one('.text-theme-light')
            d['store'] = txt(store).lstrip('@')
            trunc = td.select_one('.text-truncate')
            if trunc:
                name = txt(trunc)
                if store:
                    name = name.replace(txt(store), '').strip()
                d['tournament'] = name
            d['stars'] = len(td.select('.ti-star-filled'))

        m = re.search(r'\$([\d,.]+)', txt(tr))
        d['price_usd'] = float(m.group(1).replace(',', '')) if m else None
        m = re.search(r'--pct:\s*(\d+)%', str(tr))
        d['spiciness'] = int(m.group(1)) if m else None
        m = re.search(r'(\d{4}-\d{2}-\d{2})', txt(tr))
        d['date'] = m.group(1) if m else None
        out.append(d)
    return out


def parse_deck(html, row):
    """Extrai decklist + metadados da pagina de detalhe. row = dados da listagem."""
    soup = BeautifulSoup(html, 'lxml')
    d = dict(row)

    # arquetipo ("Calm Order") e id do torneio vem dos botoes-pilula do header
    a = soup.select_one('a[href*="/riftbound-metagame/constructed/"]')
    if a:
        d['archetype'] = txt(a)
        d['archetype_slug'] = a['href'].rstrip('/').rsplit('/', 1)[-1]
    a = soup.select_one('a[href*="/riftbound-tournaments/"]')
    if a:
        m = re.search(r'-(\d+)$', a['href'].rstrip('/'))
        d['tournament_id'] = int(m.group(1)) if m else None

    cards = []
    for tr in soup.select('#decklist tr.card-list-item'):
        c = {'type': tr.get('data-card-type', ''),
             'qty': int(tr.get('data-quantity', 1)),
             'image': tr.get('data-image-src', '')}
        m = re.search(r'/([a-z]{2,4})-(\w+)-\d+_full', c['image'])
        c['set'] = m.group(1).upper() if m else ''
        c['num'] = m.group(2) if m else ''
        c['code'] = f"{c['set']}-{c['num']}" if m else ''
        a = tr.select_one('a[href*="/cards/details-"]')
        c['name'] = txt(a)
        c['slug'] = a['href'].rsplit('details-', 1)[-1] if a else ''
        rar = tr.select_one('img[src*="rarity_"]')
        c['rarity'] = rar['alt'] if rar else ''
        m = re.search(r'\$([\d,.]+)', txt(tr))
        c['price_usd'] = float(m.group(1).replace(',', '')) if m else None
        c['domains'] = [i['alt'] for i in tr.select('img[src*="rune_"]')]
        cards.append(c)
    d['cards'] = cards
    d['scraped_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return d


def listing_url(page):
    start = START_DATE or (datetime.now() - timedelta(days=DAYS)).strftime('%Y-%m-%d')
    u = (f'{BASE}/riftbound-decks?deck_type=tournament&hide_banned=1'
         f'&rank={RANK}&start_date={start}')
    return f'{u}&page={page}' if page > 1 else u


def main():
    os.makedirs(DATA, exist_ok=True)
    have = {int(m.group(1)) for f in os.listdir(DATA)
            if (m := re.match(r'deck_(\d+)\.json$', f))}
    print(f'{len(have)} decks ja salvos em data/', flush=True)

    rows, page = [], 1
    while True:
        html = get(listing_url(page))
        batch = parse_listing(html)
        if not batch:
            break
        rows += batch
        print(f'pagina {page}: {len(batch)} decks (total {len(rows)})', flush=True)
        if len(batch) < 20:
            break
        page += 1
        time.sleep(SLEEP)

    # a listagem repete decks (o "156 published" do site conta linhas, nao decks);
    # dedupe por id mantendo a primeira ocorrencia
    seen, uniq = set(), []
    for r in rows:
        if r['id'] not in seen:
            seen.add(r['id'])
            uniq.append(r)
    new = [r for r in uniq if r['id'] not in have]
    print(f'{len(rows)} linhas na listagem ({len(uniq)} decks unicos), '
          f'{len(new)} novos', flush=True)
    if MAX:
        new = new[:MAX]

    for i, row in enumerate(new, 1):
        time.sleep(SLEEP)
        try:
            deck = parse_deck(get(row['url']), row)
        except Exception as e:
            print(f'  [{i}/{len(new)}] FALHOU {row["id"]}: {e}', flush=True)
            continue
        path = os.path.join(DATA, f'deck_{row["id"]}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(deck, f, ensure_ascii=False, indent=1)
        print(f'  [{i}/{len(new)}] {row["id"]} {deck.get("legend", "?")} '
              f'({len(deck["cards"])} cartas) - {deck.get("tournament", "?")[:40]}',
              flush=True)

    print('pronto.', flush=True)


if __name__ == '__main__':
    main()
