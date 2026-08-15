'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CardRow } from '@/lib/types'
import { CAT_NAME, RARITY_NAME, RARITY_ORDER, usd } from '@/lib/format'
import CopyButton from './CopyButton'

/** /staples: cartas mais usadas com filtros de raridade e coleção + copiar lista. */
export default function StaplesTable({
  cards,
  totalDecks,
}: {
  cards: CardRow[]
  totalDecks: number
}) {
  const [q, setQ] = useState('')
  // raridade e coleção são MULTI-seleção (vazio = todas)
  const [rarities, setRarities] = useState<Set<string>>(new Set())
  const [sets, setSets] = useState<Set<string>>(new Set())
  const [cat, setCat] = useState('all')
  const [minIncl, setMinIncl] = useState(0)

  const setOptions = useMemo(
    () => [...new Set(cards.map((c) => c.code.split('-')[0]).filter(Boolean))].sort(),
    [cards],
  )
  const rarityOptions = useMemo(() => {
    const have = new Set(cards.map((c) => c.rarity).filter(Boolean))
    return RARITY_ORDER.filter((r) => have.has(r))
  }, [cards])

  const toggle = (setter: (f: (s: Set<string>) => Set<string>) => void, v: string) =>
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })

  const rows = useMemo(
    () =>
      cards.filter(
        (c) =>
          (rarities.size === 0 || rarities.has(c.rarity)) &&
          (sets.size === 0 || sets.has(c.code.split('-')[0])) &&
          (cat === 'all' || c.cat === cat) &&
          c.incl >= minIncl &&
          (c.name.toLowerCase().includes(q.toLowerCase()) ||
            c.code.toLowerCase().includes(q.toLowerCase())),
      ),
    [cards, q, rarities, sets, cat, minIncl],
  )

  // lista copiável: "3x Nome" fixo, sem repetição (a mesma carta pode
  // aparecer em 2 linhas quando joga no main e no sideboard)
  const listText = [...new Set(rows.map((c) => c.name))]
    .map((n) => `3x ${n}`)
    .join('\n')

  return (
    <div className="panel">
      <div className="controls">
        <h2 style={{ margin: 0, flex: 1 }}>Cartas mais usadas</h2>
        <input
          placeholder="buscar carta..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">todos os tipos</option>
          {Object.entries(CAT_NAME).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={minIncl} onChange={(e) => setMinIncl(Number(e.target.value))}>
          <option value={0}>qualquer inclusão</option>
          <option value={10}>10%+ dos decks</option>
          <option value={25}>25%+ dos decks</option>
          <option value={50}>50%+ dos decks</option>
        </select>
        <span className="note">{rows.length} cartas</span>
        <CopyButton text={listText} />
      </div>
      <div className="controls" style={{ marginTop: 8 }}>
        <span className="note">raridade</span>
        {rarityOptions.map((r) => (
          <button
            key={r}
            type="button"
            className={rarities.has(r) ? 'on' : ''}
            onClick={() => toggle(setRarities, r)}
          >
            {RARITY_NAME[r] ?? r}
          </button>
        ))}
        <span className="note" style={{ marginLeft: 12 }}>coleção</span>
        {setOptions.map((st) => (
          <button
            key={st}
            type="button"
            className={sets.has(st) ? 'on' : ''}
            onClick={() => toggle(setSets, st)}
          >
            {st}
          </button>
        ))}
        {(rarities.size > 0 || sets.size > 0) && (
          <button
            type="button"
            onClick={() => {
              setRarities(new Set())
              setSets(new Set())
            }}
            style={{ marginLeft: 8 }}
          >
            limpar
          </button>
        )}
      </div>
      <div className="note" style={{ marginBottom: 10 }}>
        Ranking por presença nos {totalDecks} decks do recorte. O botão copiar leva a
        lista filtrada com um nome de carta por linha, sem repetição.
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Carta</th>
              <th>Raridade</th>
              <th>Coleção</th>
              <th>Tipo</th>
              <th className="num">Inclusão</th>
              <th className="num">Decks</th>
              <th className="num">Média de cópias</th>
              <th className="num">Preço un.</th>
              <th>Lendas que mais jogam</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((c, i) => (
              <tr key={`${c.cat}-${c.code}`}>
                <td className="num muted">{i + 1}</td>
                <td>
                  {c.name} <span className="tag">{c.code}</span>
                </td>
                <td className="muted">{RARITY_NAME[c.rarity] ?? (c.rarity || '—')}</td>
                <td className="muted">{c.code.split('-')[0]}</td>
                <td className="muted">{CAT_NAME[c.cat] ?? c.cat}</td>
                <td className="num">{c.incl.toFixed(1)}%</td>
                <td className="num">{c.lists}</td>
                <td className="num">{c.avg.toFixed(2)}</td>
                <td className="num">{usd(c.price)}</td>
                <td style={{ fontSize: 11 }}>
                  {c.legends.slice(0, 4).map(([slug, name, n]) => (
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
      {rows.length > 300 && (
        <div className="note" style={{ padding: 10 }}>
          mostrando 300 de {rows.length}; o copiar leva todas
        </div>
      )}
      {!rows.length && (
        <div className="note" style={{ padding: 10 }}>
          nada encontrado
        </div>
      )}
    </div>
  )
}
