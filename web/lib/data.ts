// Modulo exclusivo de servidor: le o SQLite (riftbound.db, raiz do projeto) com
// node:sqlite. Nao importar de Client Components (para isso existem lib/format.ts
// e lib/types.ts). Toda funcao aceita um Period {from,to} (dias ISO, inclusivos).
//
// Diferente dos apps irmaos (Pokemon 3030, OP 3031), aqui NAO ha partidas: o
// riftdecks.com so publica os decks com o rank final. Toda estatistica deriva
// da listagem de decks publicados (top4 por padrao) e das decklists.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Period } from './period'
import type {
  ArchStats,
  CardRow,
  DeckCard,
  DeckFull,
  DeckRow,
  LegendDetail,
  LegendStats,
  SkelCard,
  Totals,
  Tournament,
} from './types'

export type * from './types'
export * from './format'

// Onde esta o riftbound.db:
//   dev:    ../riftbound.db (raiz do projeto, cwd = web/)
//   deploy: o build copia pra web/riftbound.db e o outputFileTracingIncludes leva
//           junto na funcao serverless. La o process.cwd() NAO e a raiz do app,
//           entao alem do cwd procuramos subindo a partir do proprio modulo.
function findDb(): string {
  if (process.env.RIFTBOUND_DB) return process.env.RIFTBOUND_DB
  const cands: string[] = [
    path.join(process.cwd(), 'riftbound.db'),
    path.join(process.cwd(), '..', 'riftbound.db'),
    path.join(process.cwd(), 'web', 'riftbound.db'),
  ]
  // sobe ate 8 niveis a partir de __dirname (chunk compilado em .next/server/...)
  let dir = typeof __dirname === 'string' ? __dirname : process.cwd()
  for (let i = 0; i < 8; i++) {
    cands.push(path.join(dir, 'riftbound.db'))
    dir = path.dirname(dir)
  }
  return cands.find((p) => fs.existsSync(p)) ?? cands[1]
}
const DB_PATH = findDb()

let _db: DatabaseSync | null = null
function db(): DatabaseSync {
  if (!_db) _db = new DatabaseSync(DB_PATH, { readOnly: true })
  return _db
}

type Row = Record<string, any>
function all(sql: string, args: (string | number)[] = []): Row[] {
  return db().prepare(sql).all(...args) as Row[]
}
function one(sql: string, args: (string | number)[] = []): Row {
  return (db().prepare(sql).get(...args) ?? {}) as Row
}

/** WHERE do periodo para uma tabela cuja coluna de data e `col`. */
function per(p: Period, col = 'dia'): { sql: string; args: string[] } {
  const cond: string[] = []
  const args: string[] = []
  if (p.from) { cond.push(`${col} >= ?`); args.push(p.from) }
  if (p.to) { cond.push(`${col} <= ?`); args.push(p.to) }
  return { sql: cond.length ? ' AND ' + cond.join(' AND ') : '', args }
}

/** Cobertura total do banco (independe do periodo): pro filtro e pro rodape. */
export function getBounds() {
  const b = one('SELECT MIN(dia) mn, MAX(dia) mx, COUNT(*) n FROM decks')
  let mtime = ''
  try { mtime = fs.statSync(DB_PATH).mtime.toISOString().slice(0, 19) } catch {}
  return { min: (b.mn as string) ?? '', max: (b.mx as string) ?? '', decks: b.n as number, updated: mtime }
}

function totals(p: Period): Totals {
  const w = per(p)
  const r = one(
    `SELECT COUNT(*) decks, COUNT(DISTINCT tournament_id) tours,
            COUNT(DISTINCT legend_slug) legends,
            COUNT(DISTINCT archetype_slug) archs,
            COUNT(DISTINCT player) players
       FROM decks WHERE 1=1${w.sql}`, w.args)
  return {
    decks: r.decks ?? 0, tournaments: r.tours ?? 0,
    legends: r.legends ?? 0, archetypes: r.archs ?? 0, players: r.players ?? 0,
  }
}

function windowOf(p: Period) {
  const w = per(p)
  const r = one(`SELECT COUNT(DISTINCT dia) d, MIN(dia) s, MAX(dia) e FROM decks WHERE 1=1${w.sql}`, w.args)
  return { days: (r.d as number) ?? 0, start: (r.s as string) ?? '', end: (r.e as string) ?? '' }
}

export const getIndex = (p: Period = {}) => ({
  generated: getBounds().updated,
  window: windowOf(p),
  totals: totals(p),
})

const splitDomains = (s: string | null) => (s ? s.split(',').filter(Boolean) : [])

/** Meta share por LENDA (o "arquetipo" natural do Riftbound). */
export function legendStats(p: Period): LegendStats[] {
  const w = per(p)
  const base = all(
    `SELECT legend_slug slug, MAX(legend) name, MAX(legend_img) img, COUNT(*) n,
            SUM(CASE WHEN rank_num = 1 THEN 1 ELSE 0 END) top1,
            COUNT(DISTINCT tournament_id) tours,
            AVG(price_usd) avg_price, AVG(spiciness) avg_spice
       FROM decks WHERE legend_slug <> ''${w.sql} GROUP BY legend_slug`, w.args)
  const archs = new Map<string, { slug: string; name: string; n: number }[]>()
  for (const r of all(
    `SELECT legend_slug k, archetype_slug slug, MAX(archetype) name, COUNT(*) n
       FROM decks WHERE legend_slug <> '' AND archetype_slug IS NOT NULL${w.sql}
      GROUP BY legend_slug, archetype_slug`, w.args)) {
    if (!archs.has(r.k)) archs.set(r.k, [])
    archs.get(r.k)!.push({ slug: r.slug, name: r.name, n: r.n })
  }
  const doms = new Map<string, string>()
  for (const r of all(
    `SELECT legend_slug k, domains d, COUNT(*) c FROM decks
      WHERE legend_slug <> '' AND domains <> ''${w.sql}
      GROUP BY legend_slug, domains ORDER BY c`, w.args))
    doms.set(r.k, r.d) // ORDER BY c ASC: a ultima gravada e a mais comum
  const byDay = new Map<string, Record<string, number>>()
  for (const r of all(
    `SELECT legend_slug k, dia d, COUNT(*) c FROM decks
      WHERE legend_slug <> ''${w.sql} GROUP BY legend_slug, dia`, w.args)) {
    if (!byDay.has(r.k)) byDay.set(r.k, {})
    byDay.get(r.k)![r.d] = r.c
  }
  const total = base.reduce((a, r) => a + r.n, 0)
  const out: LegendStats[] = base.map((r) => ({
    slug: r.slug, name: r.name, img: r.img ?? '', n: r.n,
    share: total ? (100 * r.n) / total : 0,
    top1: r.top1 ?? 0,
    conv_top1: r.n ? (100 * (r.top1 ?? 0)) / r.n : 0,
    tours: r.tours ?? 0,
    domains: splitDomains(doms.get(r.slug) ?? ''),
    archetypes: (archs.get(r.slug) ?? []).sort((a, b) => b.n - a.n),
    avg_price: r.avg_price ?? null,
    avg_spice: r.avg_spice ?? null,
    by_day: byDay.get(r.slug) ?? {},
  }))
  out.sort((a, b) => b.n - a.n || b.top1 - a.top1)
  return out
}

/** Meta share por combinacao de dominios (o "archetype" do riftdecks). */
export function archStats(p: Period): ArchStats[] {
  const w = per(p)
  const base = all(
    `SELECT archetype_slug slug, MAX(archetype) name, MAX(domains) doms, COUNT(*) n,
            SUM(CASE WHEN rank_num = 1 THEN 1 ELSE 0 END) top1
       FROM decks WHERE archetype_slug IS NOT NULL${w.sql} GROUP BY archetype_slug`, w.args)
  const legs = new Map<string, { slug: string; name: string; n: number }[]>()
  for (const r of all(
    `SELECT archetype_slug k, legend_slug slug, MAX(legend) name, COUNT(*) n
       FROM decks WHERE archetype_slug IS NOT NULL AND legend_slug <> ''${w.sql}
      GROUP BY archetype_slug, legend_slug`, w.args)) {
    if (!legs.has(r.k)) legs.set(r.k, [])
    legs.get(r.k)!.push({ slug: r.slug, name: r.name, n: r.n })
  }
  const total = base.reduce((a, r) => a + r.n, 0)
  const out: ArchStats[] = base.map((r) => ({
    slug: r.slug, name: r.name, domains: splitDomains(r.doms),
    n: r.n, share: total ? (100 * r.n) / total : 0, top1: r.top1 ?? 0,
    legends: (legs.get(r.slug) ?? []).sort((a, b) => b.n - a.n),
  }))
  out.sort((a, b) => b.n - a.n)
  return out
}

export function getOverview(p: Period = {}) {
  const w = per(p)
  const legends = legendStats(p)
  const days = all(`SELECT DISTINCT dia d FROM decks WHERE 1=1${w.sql} ORDER BY dia`, w.args)
    .map((r) => r.d as string)
  const dayTotals: Record<string, number> = {}
  for (const r of all(`SELECT dia d, COUNT(*) c FROM decks WHERE 1=1${w.sql} GROUP BY dia`, w.args))
    dayTotals[r.d] = r.c
  const trend = legends.slice(0, 14).map((l) => ({
    slug: l.slug, name: l.name,
    pts: days.map((day) => ({
      d: day, n: l.by_day[day] ?? 0,
      share: dayTotals[day] ? (100 * (l.by_day[day] ?? 0)) / dayTotals[day] : 0,
    })),
  }))
  return {
    totals: totals(p), window: windowOf(p), generated: getBounds().updated,
    legends, archetypes: archStats(p), days, dayTotals, trend,
  }
}

const DECK_COLS = `id, url, name, player, legend, legend_slug, legend_img, rank,
  rank_num, record, archetype, domains, tournament_id, tournament, store,
  players, stars, price_usd, spiciness, dia`

function toRow(r: Row): DeckRow {
  return {
    id: r.id, url: r.url ?? '', name: r.name ?? '', player: r.player ?? '',
    legend: r.legend ?? '', legendSlug: r.legend_slug ?? '', legendImg: r.legend_img ?? '',
    rank: r.rank ?? '', rankNum: r.rank_num ?? 99, record: r.record ?? '',
    archetype: r.archetype ?? '', domains: splitDomains(r.domains),
    tournament: r.tournament ?? '', tournamentId: r.tournament_id ?? null,
    store: r.store ?? '', players: r.players ?? null, stars: r.stars ?? 0,
    price: r.price_usd ?? null, spice: r.spiciness ?? null, date: r.dia ?? '',
  }
}

export function getDecks(p: Period = {}): DeckRow[] {
  const w = per(p)
  return all(
    `SELECT ${DECK_COLS} FROM decks WHERE 1=1${w.sql}
      ORDER BY dia DESC, rank_num ASC, id DESC`, w.args).map(toRow)
}

const toCard = (r: Row): DeckCard => ({
  cat: r.cat ?? '', name: r.nome ?? '', qty: r.qtd ?? 1,
  set: r.set_code ?? '', num: r.num ?? '', code: r.code ?? '',
  rarity: r.rarity ?? '', price: r.price_usd ?? null,
  domains: splitDomains(r.domains), image: r.image ?? '',
})

export function getDeck(id: number): DeckFull | null {
  const r = one(`SELECT ${DECK_COLS}, card_count FROM decks WHERE id = ?`, [id])
  if (!r.id) return null
  const cards = all('SELECT * FROM cartas WHERE deck_id = ?', [id]).map(toCard)
  return { ...toRow(r), cards, cardCount: r.card_count ?? null }
}

/* ---------- pagina da lenda: esqueleto + consenso ---------- */

function skeleton(deckIds: number[], cardsBy: Map<number, DeckCard[]>): SkelCard[] {
  type Agg = { cat: string; code: string; name: string; image: string
    lists: number; total: number; copies: Map<number, number> }
  const agg = new Map<string, Agg>()
  for (const id of deckIds) {
    for (const c of cardsBy.get(id) ?? []) {
      const k = `${c.cat}#${c.code}`
      if (!agg.has(k))
        agg.set(k, { cat: c.cat, code: c.code, name: c.name, image: c.image,
          lists: 0, total: 0, copies: new Map() })
      const a = agg.get(k)!
      a.lists += 1
      a.total += c.qty
      a.copies.set(c.qty, (a.copies.get(c.qty) ?? 0) + 1)
    }
  }
  const n = deckIds.length
  const out: SkelCard[] = [...agg.values()].map((a) => ({
    cat: a.cat, code: a.code, name: a.name, image: a.image, lists: a.lists,
    incl: n ? (100 * a.lists) / n : 0,
    avg: a.lists ? a.total / a.lists : 0,
    mode: [...a.copies.entries()].sort((x, y) => y[1] - x[1])[0][0],
    spread: [...a.copies.entries()].sort((x, y) => x[0] - y[0]),
  }))
  out.sort((a, b) => b.incl - a.incl || b.avg - a.avg || a.name.localeCompare(b.name))
  return out
}

export function getLegend(slug: string, p: Period = {}): LegendDetail | null {
  const stats = legendStats(p).find((l) => l.slug === slug)
  if (!stats) return null
  const w = per(p)
  const decks = all(
    `SELECT ${DECK_COLS} FROM decks WHERE legend_slug = ?${w.sql}
      ORDER BY rank_num ASC, dia DESC`, [slug, ...w.args]).map(toRow)
  const ids = decks.map((d) => d.id)
  const cardsBy = new Map<number, DeckCard[]>()
  if (ids.length) {
    const marks = ids.map(() => '?').join(',')
    for (const r of all(`SELECT * FROM cartas WHERE deck_id IN (${marks})`, ids)) {
      if (!cardsBy.has(r.deck_id)) cardsBy.set(r.deck_id, [])
      cardsBy.get(r.deck_id)!.push(toCard(r))
    }
  }
  const sk = skeleton(ids, cardsBy)
  // consenso: cartas em >=50% das listas, na quantidade mais comum de cada uma
  const consensus = sk
    .filter((c) => c.incl >= 50)
    .map((c) => ({ cat: c.cat, code: c.code, name: c.name, image: c.image, count: c.mode }))
  return {
    slug, name: stats.name, img: stats.img, stats, decks,
    skeleton: sk,
    consensus,
    consensusTotal: consensus.reduce((a, c) => a + c.count, 0),
    core: sk.filter((c) => c.incl >= 90),
    flex: sk.filter((c) => c.incl >= 25 && c.incl < 90),
    tech: sk.filter((c) => c.incl < 25 && c.lists >= 2),
  }
}

export const getLegendSlugs = (p: Period = {}) => legendStats(p).map((l) => l.slug)

export function getCards(p: Period = {}): { cards: CardRow[]; totalDecks: number } {
  const w = per(p)
  const totalDecks = one(`SELECT COUNT(*) n FROM decks WHERE 1=1${w.sql}`, w.args).n as number
  const cards = all(
    `SELECT c.cat, c.code, MAX(c.nome) name, MAX(c.image) image, MAX(c.rarity) rarity,
            COUNT(DISTINCT c.deck_id) lists, SUM(c.qtd) copies, AVG(c.price_usd) price
       FROM cartas c JOIN decks d ON d.id = c.deck_id
      WHERE c.code <> ''${w.sql.replaceAll('dia', 'd.dia')}
      GROUP BY c.cat, c.code ORDER BY lists DESC LIMIT 500`, w.args)
  const inTop = new Set(cards.map((c) => `${c.cat}#${c.code}`))
  const legs = new Map<string, [string, string, number][]>()
  for (const r of all(
    `SELECT c.cat, c.code, d.legend_slug slug, MAX(d.legend) legend,
            COUNT(DISTINCT c.deck_id) n
       FROM cartas c JOIN decks d ON d.id = c.deck_id
      WHERE c.code <> '' AND d.legend_slug <> ''${w.sql.replaceAll('dia', 'd.dia')}
      GROUP BY c.cat, c.code, d.legend_slug`, w.args)) {
    const k = `${r.cat}#${r.code}`
    if (!inTop.has(k)) continue
    if (!legs.has(k)) legs.set(k, [])
    legs.get(k)!.push([r.slug, r.legend, r.n])
  }
  return {
    totalDecks,
    cards: cards.map((c) => ({
      cat: c.cat, code: c.code, name: c.name, image: c.image ?? '', rarity: c.rarity ?? '',
      lists: c.lists,
      incl: totalDecks ? (100 * c.lists) / totalDecks : 0,
      avg: c.lists ? c.copies / c.lists : 0,
      price: c.price ?? null,
      legends: (legs.get(`${c.cat}#${c.code}`) ?? [])
        .sort((a, b) => b[2] - a[2]).slice(0, 6),
    })),
  }
}

export function getTournaments(p: Period = {}): Tournament[] {
  const w = per(p)
  const rows = all(
    `SELECT t.id, t.name, t.store, t.players, t.stars, t.dia, t.decks,
            win.player wplayer, win.legend wlegend, win.legend_slug wslug
       FROM torneios t
       LEFT JOIN decks win ON win.tournament_id = t.id AND win.rank_num = 1
      WHERE 1=1${w.sql.replaceAll('dia', 't.dia')} GROUP BY t.id ORDER BY t.dia DESC`, w.args)
  return rows.map((r) => ({
    id: r.id, name: r.name ?? '', store: r.store ?? '', players: r.players ?? null,
    stars: r.stars ?? 0, date: r.dia ?? '', decks: r.decks ?? 0,
    winner: r.wplayer ? { player: r.wplayer, legend: r.wlegend ?? '', slug: r.wslug ?? '' } : null,
  }))
}

/** Catálogo de cartas conhecidas (1 linha por código) pra enriquecer a coleção. */
export type CatalogCard = { code: string; name: string; cat: string; rarity: string; image: string; lists: number }
export function getCatalog(): CatalogCard[] {
  return all(
    `SELECT code, MAX(nome) name, MAX(cat) cat, MAX(rarity) rarity, MAX(image) image,
            COUNT(DISTINCT deck_id) lists
       FROM cartas WHERE code <> '' GROUP BY code ORDER BY lists DESC`).map((r) => ({
    code: r.code, name: r.name ?? '', cat: r.cat ?? '', rarity: r.rarity ?? '',
    image: r.image ?? '', lists: r.lists ?? 0,
  }))
}
