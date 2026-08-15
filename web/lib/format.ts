/** Helpers de apresentacao. Sem node:fs, entao pode ser usado em Client Components. */

/** Imagens espelhadas do riftdecks.com em web/public (fetch_images.py preserva o
 *  caminho: /img/cards/riftbound/OGN/ogn-306-298_full.png). Se faltar, o onError
 *  do componente mostra o nome. */
export const img = (path: string) => path || ''

export const CAT_NAME: Record<string, string> = {
  legend: 'Lenda',
  champion: 'Campeão',
  unit: 'Unidade',
  spell: 'Feitiço',
  gear: 'Equipamento',
  runes: 'Runas',
  battlefields: 'Campos de batalha',
  sideboard: 'Sideboard',
}

/** Ordem canonica das secoes da decklist (nomes como vêm do riftdecks). */
export const CAT_ORDER = [
  'legend', 'champion', 'unit', 'spell', 'gear', 'runes', 'battlefields', 'sideboard',
]

export const DOMAIN_COLOR: Record<string, string> = {
  fury: '#e05252',
  calm: '#4caf7d',
  mind: '#5b8fd9',
  body: '#e0913f',
  order: '#e6c84a',
  chaos: '#a06bd4',
}

export const domainLabel = (d: string) => (d ? d.charAt(0).toUpperCase() + d.slice(1) : d)

export const RARITY_NAME: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  epic: 'Épica',
  showcase: 'Showcase',
}

/** Ordem canonica das raridades (pro filtro e ordenacao). */
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'showcase']

export const pct = (v: number | null | undefined, d = 1) =>
  v == null ? '—' : `${v.toFixed(d)}%`

export const num = (v: number) => v.toLocaleString('pt-BR')

export const usd = (v: number | null | undefined) =>
  v == null ? '—' : `$${v.toFixed(2)}`

/** Classe do selo por taxa de conversao em 1º lugar (amostra pequena = neutro). */
export function convClass(v: number | null | undefined, n = 999) {
  if (v == null || n < 5) return 'pmid'
  return v >= 30 ? 'pgood' : v <= 10 ? 'pbad' : 'pmid'
}
