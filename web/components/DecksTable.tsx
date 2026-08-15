'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { DeckRow } from '@/lib/types'
import { usd } from '@/lib/format'
import { Domains, LegendIcon } from './ui'

type SortCol = 'date' | 'rank' | 'legend' | 'players' | 'price' | 'spice'

/** /decks: todos os decks publicados no recorte, com busca e filtros. */
export default function DecksTable({ decks }: { decks: DeckRow[] }) {
  const [q, setQ] = useState('')
  const [legend, setLegend] = useState('all')
  const [sort, setSort] = useState<{ col: SortCol; asc: boolean }>({ col: 'date', asc: false })

  const legends = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>()
    for (const d of decks) {
      if (!d.legendSlug) continue
      const e = m.get(d.legendSlug)
      if (e) e.n += 1
      else m.set(d.legendSlug, { name: d.legend, n: 1 })
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n)
  }, [decks])

  const rows = useMemo(() => {
    const ql = q.toLowerCase()
    const out = decks.filter(
      (d) =>
        (legend === 'all' || d.legendSlug === legend) &&
        (!ql ||
          d.legend.toLowerCase().includes(ql) ||
          d.player.toLowerCase().includes(ql) ||
          d.name.toLowerCase().includes(ql) ||
          d.tournament.toLowerCase().includes(ql) ||
          d.store.toLowerCase().includes(ql)),
    )
    const key = (d: DeckRow): string | number => {
      switch (sort.col) {
        case 'date': return d.date
        case 'rank': return -d.rankNum
        case 'legend': return d.legend
        case 'players': return d.players ?? -1
        case 'price': return d.price ?? -1
        case 'spice': return d.spice ?? -1
      }
    }
    out.sort((a, b) => {
      const x = key(a), y = key(b)
      const c = typeof x === 'string' ? (x as string).localeCompare(y as string) : (x as number) - (y as number)
      return (sort.asc ? c : -c) || a.rankNum - b.rankNum
    })
    return out
  }, [decks, q, legend, sort])

  const th = (col: SortCol, label: string, cls = '') => (
    <th
      className={`s ${cls}`}
      onClick={() => setSort((s) => ({ col, asc: s.col === col ? !s.asc : col === 'legend' }))}
    >
      {label}
      {sort.col === col ? (sort.asc ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div className="panel">
      <div className="controls">
        <h2 style={{ margin: 0, flex: 1 }}>Decks publicados</h2>
        <input
          placeholder="buscar lenda, jogador, torneio..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select value={legend} onChange={(e) => setLegend(e.target.value)}>
          <option value="all">todas as lendas</option>
          {legends.map(([slug, l]) => (
            <option key={slug} value={slug}>
              {l.name} ({l.n})
            </option>
          ))}
        </select>
        <span className="note">{rows.length} decks</span>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              {th('rank', 'Rank', 'num')}
              {th('legend', 'Lenda')}
              <th>Jogador</th>
              <th>Domínios</th>
              {th('date', 'Data')}
              <th>Torneio</th>
              {th('players', 'Jogadores', 'num')}
              {th('price', 'Preço', 'num')}
              {th('spice', 'Spice', 'num')}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="num">
                  <b>{d.rank}</b>
                  {d.record ? <div className="note">{d.record}</div> : null}
                </td>
                <td>
                  <Link className="deckcell" href={`/decks/${d.id}`}>
                    <LegendIcon src={d.legendImg} />
                    <span className="dn">{d.legend || d.name}</span>
                  </Link>
                </td>
                <td className="muted">{d.player}</td>
                <td>
                  <Domains domains={d.domains} />
                </td>
                <td>{d.date}</td>
                <td>
                  <div style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.tournament}
                  </div>
                  {d.store ? <div className="note">@{d.store}</div> : null}
                </td>
                <td className="num">{d.players ?? '—'}</td>
                <td className="num">{usd(d.price)}</td>
                <td className="num">{d.spice != null ? `${d.spice}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="note" style={{ padding: 10 }}>
          nada encontrado
        </div>
      )}
    </div>
  )
}
