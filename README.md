# riftbound-meta

Estudo de meta do **Riftbound** (o TCG de League of Legends) a partir dos decks de
torneio publicados no **riftdecks.com**. Irmão dos projetos `limitless-meta`
(Pokémon, :3030) e `limitless-op` (One Piece, :3031); este roda na porta **3032**.

Arquitetura: `data/deck_*.json` (fonte crua, 1 arquivo por deck) → `riftbound.db`
(SQLite) → app Next em `web/` que lê o banco direto via `node:sqlite`.
Imagens das cartas espelhadas em `web/public/img/` (o site fica atrás do
Cloudflare, hotlink não funciona).

## Diferença importante vs os irmãos

O riftdecks **não publica confrontos** (pairings): só a listagem de decks
publicados com o rank final. Não existe winrate nem matriz de matchups; as
leituras são **share de presença** (entre os decks top4 publicados) e
**conversão em 1º lugar**.

## Rotina de atualização

```powershell
cd E:\sites\personal\riftbound-meta
python scrape.py         # 1. coleta incremental (DAYS=14, RANK=top4)
python load_db.py        # 2. ingere no SQLite (idempotente)
python fetch_images.py   # 3. espelha imagens novas em web/public
```

App: `cd web; npm run dev` → http://localhost:3032

## Cloudflare (a parte chata)

O site usa **Turnstile interativo**. A sessão (`rift_clearance.json`, gitignored)
é cunhada pelo `rift_session.py` com **patchright headful + clique automático no
checkbox** (receita da Liga + clique; ver comentários no módulo). O scrape
re-cunha sozinho quando o cookie cai. O cookie só vale no MESMO IP + User-Agent.

- 429 = rate limit da zona: o scrape espera com backoff (45s, 90s...). NÃO
  re-cunhar em cima de 429 (endurece a zona - lição da Liga).
- `SLEEP=3.5` entre requests segura bem; mais rápido que isso toma 429 em rajada.

## Filtros da coleta

`deck_type=tournament`, `hide_banned=1`, `rank=top4` e `start_date = hoje - DAYS`
(default 14). Override: `$env:DAYS='30'`, `$env:RANK='top8'`,
`$env:START_DATE='2026-07-01'`. Deck já salvo em `data/` nunca é re-baixado
(deck publicado é imutável). **Nunca apagar `data/`.**

## Deploy (Netlify, conta gaiadev-pedro)

- Repo: https://github.com/pedroccm/riftbound-meta (conta `pedroccm`)
- Site: meta-rb-tcg.netlify.app ("riftbound-*" e "lol-*" são recusados pelo Netlify) (base `web/`, plugin `@netlify/plugin-nextjs`,
  Node 22 obrigatório por causa do `node:sqlite`)
- O `.db` e as imagens (`web/public/img`, ~330MB) VÃO no git: o site é servido
  a partir deles. O build copia `../riftbound.db` pra `web/` e o tracing do Next
  leva junto na função serverless (ver `next.config.ts` + `lib/data.ts`).
- Fluxo de atualização = rotina local + `git add -A && git commit && git push`
  (o push dispara o deploy). Sem push, o site fica com o snapshot anterior.
