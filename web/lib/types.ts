/** Tipos puros, seguros para importar do cliente (nao tocam em node:fs). */

export type LegendStats = {
  slug: string
  name: string
  img: string
  n: number
  share: number
  top1: number
  conv_top1: number
  tours: number
  domains: string[]
  archetypes: { slug: string; name: string; n: number }[]
  avg_price: number | null
  avg_spice: number | null
  by_day: Record<string, number>
}

export type ArchStats = {
  slug: string
  name: string
  domains: string[]
  n: number
  share: number
  top1: number
  legends: { slug: string; name: string; n: number }[]
}

export type DeckRow = {
  id: number
  url: string
  name: string
  player: string
  legend: string
  legendSlug: string
  legendImg: string
  rank: string
  rankNum: number
  record: string
  archetype: string
  domains: string[]
  tournament: string
  tournamentId: number | null
  store: string
  players: number | null
  stars: number
  price: number | null
  spice: number | null
  date: string
}

export type DeckCard = {
  cat: string
  name: string
  qty: number
  set: string
  num: string
  code: string
  rarity: string
  price: number | null
  domains: string[]
  image: string
}

export type DeckFull = DeckRow & { cards: DeckCard[]; cardCount: number | null }

export type SkelCard = {
  cat: string
  code: string
  name: string
  image: string
  lists: number
  incl: number
  avg: number
  mode: number
  spread: [number, number][]
}

export type LegendDetail = {
  slug: string
  name: string
  img: string
  stats: LegendStats
  decks: DeckRow[]
  skeleton: SkelCard[]
  consensus: { cat: string; code: string; name: string; image: string; count: number }[]
  consensusTotal: number
  core: SkelCard[]
  flex: SkelCard[]
  tech: SkelCard[]
}

export type CardRow = {
  cat: string
  code: string
  name: string
  image: string
  rarity: string
  lists: number
  incl: number
  avg: number
  price: number | null
  legends: [string, string, number][] // [slug, nome, n decks]
}

export type Tournament = {
  id: number
  name: string
  store: string
  players: number | null
  stars: number
  date: string
  decks: number
  winner: { player: string; legend: string; slug: string } | null
}

export type Totals = {
  decks: number
  tournaments: number
  legends: number
  archetypes: number
  players: number
}
