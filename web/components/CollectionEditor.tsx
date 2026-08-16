'use client'

import { useMemo, useState } from 'react'
import type { CatalogCard } from '@/lib/data'
import { CAT_NAME, RARITY_NAME } from '@/lib/format'
import { parseCollectionText, useCollection, type Collection } from '@/lib/collection'
import CopyButton from './CopyButton'

/** /colecao: cola a lista (formato do carrinho da Liga ou "3x Nome (UNL-002)"),
 *  guarda no browser e mostra o que foi reconhecido. */
export default function CollectionEditor({ catalog }: { catalog: CatalogCard[] }) {
  const { col, set, ready, total } = useCollection()
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'add' | 'replace'>('add')
  const [msg, setMsg] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const byCode = useMemo(() => new Map(catalog.map((c) => [c.code, c])), [catalog])

  const preview = useMemo(() => parseCollectionText(text), [text])

  const apply = () => {
    const next: Collection = mode === 'replace' ? {} : { ...col }
    for (const p of preview) next[p.code] = (next[p.code] ?? 0) + p.qty
    set(next)
    const unknown = preview.filter((p) => !byCode.has(p.code)).length
    setMsg(
      `${preview.length} linhas aplicadas (${preview.reduce((a, p) => a + p.qty, 0)} cartas)` +
        (unknown ? ` · ${unknown} código(s) não aparecem em nenhum deck do meta (guardados mesmo assim)` : ''),
    )
    setText('')
  }

  const rows = useMemo(
    () =>
      Object.entries(col)
        .map(([code, qty]) => ({ code, qty, info: byCode.get(code) }))
        .sort((a, b) => (b.info?.lists ?? -1) - (a.info?.lists ?? -1) || a.code.localeCompare(b.code)),
    [col, byCode],
  )

  const setQty = (code: string, qty: number) => {
    const next = { ...col }
    if (qty <= 0) delete next[code]
    else next[code] = qty
    set(next)
  }

  const exportText = rows.map((r) => `${r.qty}x ${r.info?.name ?? ''} (${r.code})`.replace('x  (', 'x (')).join('\n')

  return (
    <>
      <div className="panel">
        <div className="controls">
          <h2 style={{ margin: 0, flex: 1 }}>Minha coleção</h2>
          <span className="note">{ready ? `${rows.length} cartas distintas · ${total} no total` : '…'}</span>
          {rows.length > 0 && <CopyButton text={exportText} />}
        </div>
        <div className="note" style={{ marginBottom: 10 }}>
          Cole abaixo a lista do carrinho/pedido da Liga (formato{' '}
          <code>3x Nome (#2) (Código: UNL2)</code>) ou uma lista simples (<code>3x Nome (UNL-002)</code>,{' '}
          <code>3 UNL-002</code>). Fica guardado só neste navegador. Depois, em{' '}
          <b>Mais usadas</b> e em cada decklist, aparece o que você já tem e o que falta.
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'1x Master Yi - Honed (#9) (Código: OGS9)\n3x Inferna (#2) (Código: UNL2)\n...'}
          rows={8}
          style={{
            width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: 12,
            background: 'var(--panel2)', color: 'var(--tx)', border: '1px solid var(--line)',
            borderRadius: 6, padding: 8, resize: 'vertical',
          }}
        />
        <div className="controls" style={{ marginTop: 8 }}>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'add' | 'replace')}>
            <option value="add">somar ao que já tenho</option>
            <option value="replace">substituir a coleção inteira</option>
          </select>
          <button type="button" onClick={apply} disabled={!preview.length}>
            aplicar {preview.length ? `(${preview.length} linhas reconhecidas)` : ''}
          </button>
          {rows.length > 0 && !confirmClear && (
            <button type="button" onClick={() => setConfirmClear(true)} style={{ marginLeft: 'auto' }}>
              limpar tudo
            </button>
          )}
          {confirmClear && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span className="note">apagar a coleção deste navegador?</span>
              <button type="button" className="on" onClick={() => { set({}); setConfirmClear(false); setMsg('coleção apagada') }}>
                sim, apagar
              </button>
              <button type="button" onClick={() => setConfirmClear(false)}>cancelar</button>
            </span>
          )}
          {msg && <span className="note">{msg}</span>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="panel">
          <h2>Cartas na coleção</h2>
          <div className="note" style={{ marginBottom: 10 }}>
            Ordenadas por presença no meta. Edite a quantidade direto na tabela; 0 remove.
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th className="num">Qtd</th>
                  <th>Carta</th>
                  <th>Tipo</th>
                  <th>Raridade</th>
                  <th className="num">Decks no meta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <td className="num">
                      <input
                        type="number"
                        min={0}
                        value={r.qty}
                        onChange={(e) => setQty(r.code, Number(e.target.value))}
                        style={{ width: 56, textAlign: 'right' }}
                      />
                    </td>
                    <td>
                      {r.info?.name ?? <span className="muted">(fora do meta)</span>}{' '}
                      <span className="tag">{r.code}</span>
                    </td>
                    <td className="muted">{r.info ? CAT_NAME[r.info.cat] ?? r.info.cat : '—'}</td>
                    <td className="muted">{r.info ? RARITY_NAME[r.info.rarity] ?? r.info.rarity : '—'}</td>
                    <td className="num">{r.info?.lists ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
