"""Carrega os decks crus de data/deck_*.json no SQLite (riftbound.db).

Idempotente e incremental: um deck so e (re)carregado se ainda nao esta no banco
ou se o arquivo foi re-baixado (scraped_at diferente). data/*.json segue sendo a
fonte crua; o banco e a camada de consulta (app Next + SQL ad-hoc).

Riftbound (riftdecks.com): NAO ha confrontos/pairings - o site so publica os
decks (rank final no torneio). O "arquetipo" tem 2 niveis: a LENDA (Leona,
Radiant Dawn) e a combinacao de dominios que o site chama de archetype
(Calm Order). A decklist tem tipos: legend, champion, unit, spell, gear, rune,
battlefield; main deck padrao = 66 cartas (40 main + runas + battlefields + ...).

Tabelas:
  decks     1 linha por deck publicado (com torneio embutido)
  cartas    1 linha por carta de decklist
  torneios  view derivada de decks (1 linha por torneio)

Uso:  python load_db.py            # carrega o que falta
      python load_db.py --rebuild  # apaga o .db e recarrega tudo
"""

import json
import os
import re
import sqlite3
import sys
import unicodedata

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
DB = os.path.join(HERE, 'riftbound.db')

SCHEMA = """
CREATE TABLE IF NOT EXISTS decks(
  id INTEGER PRIMARY KEY, url TEXT,
  name TEXT, player TEXT,
  legend TEXT, legend_slug TEXT, legend_img TEXT,
  rank TEXT, rank_num INTEGER, record TEXT,
  meta TEXT, archetype TEXT, archetype_slug TEXT, domains TEXT,
  card_count INTEGER,
  tournament_id INTEGER, tournament TEXT, store TEXT,
  players INTEGER, stars INTEGER,
  price_usd REAL, spiciness INTEGER,
  dia TEXT, scraped_at TEXT);
CREATE TABLE IF NOT EXISTS cartas(
  deck_id INTEGER NOT NULL,
  cat TEXT, nome TEXT, slug TEXT, qtd INTEGER,
  set_code TEXT, num TEXT, code TEXT,
  rarity TEXT, price_usd REAL, domains TEXT, image TEXT);
CREATE INDEX IF NOT EXISTS ix_decks_dia    ON decks(dia);
CREATE INDEX IF NOT EXISTS ix_decks_legend ON decks(legend_slug, dia);
CREATE INDEX IF NOT EXISTS ix_decks_arch   ON decks(archetype_slug, dia);
CREATE INDEX IF NOT EXISTS ix_ct_deck      ON cartas(deck_id);
CREATE INDEX IF NOT EXISTS ix_ct_code      ON cartas(code);
DROP VIEW IF EXISTS torneios;
CREATE VIEW torneios AS
  SELECT tournament_id AS id, MAX(tournament) AS name, MAX(store) AS store,
         MAX(players) AS players, MAX(stars) AS stars, MAX(dia) AS dia,
         COUNT(*) AS decks
    FROM decks WHERE tournament_id IS NOT NULL
   GROUP BY tournament_id;
"""


def slug(text):
    t = unicodedata.normalize('NFKD', str(text))
    t = ''.join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', t)).strip('-')


def load_file(cx, d):
    did = d['id']
    cx.execute('DELETE FROM decks WHERE id=?', (did,))
    cx.execute('DELETE FROM cartas WHERE deck_id=?', (did,))
    cx.execute(
        'INSERT INTO decks VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        (did, d.get('url'), d.get('name'), d.get('player'),
         d.get('legend'), slug(d.get('legend', '')), d.get('legend_img'),
         d.get('rank'), d.get('rank_num'), d.get('record'),
         d.get('meta'), d.get('archetype'), d.get('archetype_slug'),
         ','.join(d.get('domains') or []),
         d.get('card_count'),
         d.get('tournament_id'), d.get('tournament'), d.get('store'),
         d.get('players'), d.get('stars'),
         d.get('price_usd'), d.get('spiciness'),
         d.get('date'), d.get('scraped_at')))
    rows = [(did, c.get('type'), c.get('name'), c.get('slug'),
             int(c.get('qty', 1)), c.get('set'), c.get('num'), c.get('code'),
             c.get('rarity'), c.get('price_usd'),
             ','.join(c.get('domains') or []), c.get('image'))
            for c in d.get('cards') or []]
    cx.executemany('INSERT INTO cartas VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', rows)
    return len(rows)


def main():
    if '--rebuild' in sys.argv and os.path.exists(DB):
        os.remove(DB)
    cx = sqlite3.connect(DB)
    cx.executescript('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;')
    cx.executescript(SCHEMA)

    have = {r[0]: r[1] for r in cx.execute('SELECT id, scraped_at FROM decks')}
    done = skipped = bad = 0
    for fn in sorted(os.listdir(DATA)):
        if not fn.endswith('.json'):
            continue
        try:
            d = json.load(open(os.path.join(DATA, fn), encoding='utf-8'))
        except Exception:
            bad += 1
            continue
        if have.get(d['id']) == d.get('scraped_at'):
            skipped += 1
            continue
        with cx:
            load_file(cx, d)
        done += 1
    cx.execute('PRAGMA wal_checkpoint(TRUNCATE)')
    # arquivo unico e autocontido: no Netlify (Lambda) o filesystem e read-only e
    # um banco em WAL nao abre (o SQLite quer criar o -shm ao lado)
    cx.execute('PRAGMA journal_mode=DELETE')

    q = lambda s: cx.execute(s).fetchone()[0]
    print(f'{done} decks carregados, {skipped} ja no banco'
          + (f', {bad} arquivos ilegiveis' if bad else ''))
    print(f'  decks    {q("SELECT COUNT(*) FROM decks"):>7}'
          f'   ({q("SELECT MIN(dia) FROM decks")} a {q("SELECT MAX(dia) FROM decks")})')
    print(f'  cartas   {q("SELECT COUNT(*) FROM cartas"):>7}')
    print(f'  torneios {q("SELECT COUNT(*) FROM torneios"):>7}')
    print(f'  lendas   {q("SELECT COUNT(DISTINCT legend_slug) FROM decks"):>7}')
    cx.close()


if __name__ == '__main__':
    main()
