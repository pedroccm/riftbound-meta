"""Espelha as imagens do riftdecks.com usadas pelo app em web/public.

O riftdecks fica atras do Cloudflare: hotlink direto no app quebraria (o browser
do visitante nao tem o cf_clearance). Entao o app so usa caminhos locais
(/img/...) e este script baixa o que faltar, preservando o caminho original:

  /img/cards/riftbound/OGN/ogn-306-298_tile.png  (tile da lenda, listagem)
  /img/cards/riftbound/OGN/ogn-306-298_full.png  (carta inteira, decklist)

Incremental: imagem ja baixada (arquivo nao-vazio) nao e re-baixada.

Env:
  SLEEP=0.8   pausa entre downloads
"""
import os
import sqlite3
import sys
import time

import requests

import rift_session

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, 'riftbound.db')
PUBLIC = os.path.join(HERE, 'web', 'public')
BASE = 'https://riftdecks.com'
SLEEP = float(os.environ.get('SLEEP', 0.8))


def wanted_paths():
    cx = sqlite3.connect(DB)
    paths = set()
    for (p,) in cx.execute("SELECT DISTINCT legend_img FROM decks WHERE legend_img <> ''"):
        paths.add(p)
    for (p,) in cx.execute("SELECT DISTINCT image FROM cartas WHERE image <> ''"):
        paths.add(p)
    cx.close()
    return sorted(paths)


def main():
    paths = wanted_paths()
    todo = []
    for p in paths:
        local = os.path.join(PUBLIC, p.lstrip('/').replace('/', os.sep))
        if not (os.path.exists(local) and os.path.getsize(local) > 0):
            todo.append((p, local))
    print(f'{len(paths)} imagens no banco, {len(todo)} faltando', flush=True)
    if not todo:
        return

    ua, cookies = rift_session.ensure_session()
    ok = fail = 0
    for i, (p, local) in enumerate(todo, 1):
        os.makedirs(os.path.dirname(local), exist_ok=True)
        try:
            r = requests.get(BASE + p, headers={'User-Agent': ua},
                             cookies=cookies, timeout=60)
            if r.status_code == 200 and r.content[:4] != b'<!DO':
                with open(local, 'wb') as f:
                    f.write(r.content)
                ok += 1
            else:
                print(f'  [{i}/{len(todo)}] HTTP {r.status_code} em {p}', flush=True)
                fail += 1
                if r.status_code == 429:
                    time.sleep(45)
        except Exception as e:
            print(f'  [{i}/{len(todo)}] erro {e} em {p}', flush=True)
            fail += 1
        if i % 50 == 0:
            print(f'  {i}/{len(todo)} ({ok} ok, {fail} falhas)', flush=True)
        time.sleep(SLEEP)
    print(f'pronto: {ok} baixadas, {fail} falhas', flush=True)


if __name__ == '__main__':
    main()
