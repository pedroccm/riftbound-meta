'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CardRow } from '@/lib/types'
import { CAT_NAME, usd } from '@/lib/format'

export default function CardsTable({
  cards,
  totalDecks,
}: {
  cards: CardRow[]
  totalDecks: number
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  const rows = useMemo(
    () =>
      cards.filter(
        (c) =>
          (cat === 'all' || c.cat === cat) &&
          (c.name.toLowerCase().includes(q.toLowerCase()) ||
            c.code.toLowerCase().includes(q.toLowerCase())),
      ),
    [cards, q, cat],
  )

  return (
    <div className="panel">
      <div className="controls">
        <h2 style={{ margin: 0, flex: 1 }}>Cartas mais jogadas</h2>
        <input
          placeholder="buscar carta..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">todas</option>
          {Object.entries(CAT_NAME).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="note">{rows.length} cartas</span>
      </div>
      <div className="note" style={{ marginBottom: 10 }}>
        Inclusão sobre os {totalDecks} decks do recorte.
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Carta</th>
              <th>Tipo</th>
              <th className="num">Inclusão</th>
              <th className="num">Decks</th>
              <th className="num">Média de cópias</th>
              <th className="num">Preço un.</th>
              <th>Lendas que mais jogam</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((c) => (
              <tr key={`${c.cat}-${c.code}`}>
                <td>
                  {c.name} <span className="tag">{c.code}</span>
                </td>
                <td className="muted">{CAT_NAME[c.cat] ?? c.cat}</td>
                <td className="num">{c.incl.toFixed(1)}%</td>
                <td className="num">{c.lists}</td>
                <td className="num">{c.avg.toFixed(2)}</td>
                <td className="num">{usd(c.price)}</td>
                <td style={{ fontSize: 11 }}>
                  {c.legends.map(([slug, name, n]) => (
                    <Link key={slug} href={`/lendas/${slug}`} className="chip" style={{ marginRight: 4 }}>
                      {name} {n}
                    </Link>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
