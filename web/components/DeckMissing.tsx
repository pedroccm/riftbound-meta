'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useCollection } from '@/lib/collection'

type C = { name: string; code: string; qty: number }

/** Resumo "o que me falta pra montar este deck" + copiar lista de compras. */
export default function DeckMissing({ cards }: { cards: C[] }) {
  const { has, ready, total } = useCollection()
  const missing = useMemo(() => {
    // agrupa por código (main + sideboard da mesma carta somam)
    const need = new Map<string, { name: string; qty: number }>()
    for (const c of cards) {
      const e = need.get(c.code)
      if (e) e.qty += c.qty
      else need.set(c.code, { name: c.name, qty: c.qty })
    }
    return [...need.entries()]
      .map(([code, e]) => ({ code, name: e.name, need: e.qty, have: Math.min(has(code), e.qty) }))
      .filter((x) => x.have < x.need)
      .map((x) => ({ ...x, missing: x.need - x.have }))
      .sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name))
  }, [cards, has])

  if (!ready) return null
  if (total === 0)
    return (
      <div className="note" style={{ marginBottom: 12 }}>
        Cadastre <Link href="/colecao">sua coleção</Link> pra ver aqui o que falta pra montar este deck.
      </div>
    )
  const totalMissing = missing.reduce((a, x) => a + x.missing, 0)
  const text = missing.map((x) => `${x.missing}x ${x.name}`).join('\n')
  return (
    <div className="controls" style={{ marginBottom: 12 }}>
      {totalMissing === 0 ? (
        <span className="pill pgood">você tem todas as cartas deste deck</span>
      ) : (
        <>
          <span className="pill pbad">
            faltam {totalMissing} cartas ({missing.length} distintas)
          </span>
          <span className="note">
            no botão copiar (topo), marque &ldquo;excluir o que já tenho&rdquo; pra sair só a lista de compras
          </span>
        </>
      )}
    </div>
  )
}
