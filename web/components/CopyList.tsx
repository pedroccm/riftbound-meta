'use client'

import { useMemo, useState } from 'react'
import { useCollection } from '@/lib/collection'

export type CopyCard = { name: string; code: string; qty: number }

/** Botão "copiar" unificado (deck, lenda, mais usadas). Formato de saída sempre
 *  "Nx Nome", um por linha, sem repetição. Opções:
 *   - excluir o que já tenho (desconta a coleção do browser; some se zerar)
 *   - escolher quais edições (sets) entram
 *  Sem opção marcada, copia tudo. */
export default function CopyList({ cards, label = 'copiar' }: { cards: CopyCard[]; label?: string }) {
  const { has, ready, total } = useCollection()
  const [open, setOpen] = useState(false)
  const [skipOwned, setSkipOwned] = useState(false)
  const [sets, setSets] = useState<Set<string>>(new Set()) // vazio = todas
  const [copied, setCopied] = useState(false)

  const setOptions = useMemo(
    () => [...new Set(cards.map((c) => c.code.split('-')[0]).filter(Boolean))].sort(),
    [cards],
  )

  // agrupa por código (main + sideboard somam), aplica os filtros
  const lines = useMemo(() => {
    const need = new Map<string, { name: string; qty: number }>()
    for (const c of cards) {
      const e = need.get(c.code)
      if (e) e.qty += c.qty
      else need.set(c.code, { name: c.name, qty: c.qty })
    }
    const out: string[] = []
    for (const [code, e] of need) {
      if (sets.size && !sets.has(code.split('-')[0])) continue
      const qty = skipOwned ? Math.max(0, e.qty - has(code)) : e.qty
      if (qty <= 0) continue
      out.push(`${qty}x ${e.name}`)
    }
    return out
  }, [cards, sets, skipOwned, has])

  const copy = () => {
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }
  const toggleSet = (s: string) =>
    setSets((prev) => {
      const n = new Set(prev)
      if (n.has(s)) n.delete(s)
      else n.add(s)
      return n
    })

  const btn: React.CSSProperties = {
    background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6,
    padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--tx2)', fontFamily: 'inherit',
  }
  const active = skipOwned || sets.size > 0

  return (
    <span style={{ position: 'relative', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <button type="button" onClick={copy} style={{ ...btn, background: copied ? 'var(--panel2)' : 'var(--panel)' }}>
        {copied ? 'copiado!' : `${label} (${lines.length})`}
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ ...btn, borderColor: active ? 'var(--acc2)' : 'var(--line)', color: active ? 'var(--acc2)' : 'var(--tx2)' }}
        title="opções do copiar"
      >
        ⚙{active ? ' •' : ''}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 20, marginTop: 6,
            background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8,
            padding: 12, minWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,.35)', fontSize: 12,
          }}
        >
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: ready && total > 0 ? 'pointer' : 'not-allowed', opacity: ready && total > 0 ? 1 : 0.5 }}>
            <input
              type="checkbox"
              checked={skipOwned}
              disabled={!ready || total === 0}
              onChange={(e) => setSkipOwned(e.target.checked)}
            />
            excluir o que já tenho na coleção
          </label>
          {(!ready || total === 0) && (
            <div className="note" style={{ marginLeft: 22 }}>cadastre a coleção em &ldquo;Minha coleção&rdquo;</div>
          )}
          <div className="note" style={{ marginTop: 10, marginBottom: 4 }}>
            edições a copiar {sets.size === 0 ? '(todas)' : `(${sets.size} de ${setOptions.length})`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {setOptions.map((s) => (
              <label key={s} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={sets.size === 0 || sets.has(s)} onChange={() => {
                  // primeiro clique com "todas": vira "todas menos esta"
                  if (sets.size === 0) setSets(new Set(setOptions.filter((x) => x !== s)))
                  else toggleSet(s)
                }} />
                {s}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" style={btn} onClick={() => { setSets(new Set()); setSkipOwned(false) }}>
              limpar opções
            </button>
            <button type="button" style={{ ...btn, marginLeft: 'auto' }} onClick={() => setOpen(false)}>
              fechar
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
