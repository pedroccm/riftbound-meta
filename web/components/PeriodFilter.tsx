'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/** Filtro global de periodo. Grava um cookie e da router.refresh():
 *  todo Server Component rele o banco com o novo recorte, sem query string. */
export default function PeriodFilter({
  min,
  max,
  from,
  to,
}: {
  min: string
  max: string
  from?: string
  to?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [f, setF] = useState(from ?? '')
  const [t, setT] = useState(to ?? '')

  const apply = (nf: string, nt: string) => {
    setF(nf)
    setT(nt)
    const v = encodeURIComponent(JSON.stringify({ from: nf || undefined, to: nt || undefined }))
    document.cookie = `periodo-rb=${v}; path=/; max-age=31536000; samesite=lax`
    start(() => router.refresh())
  }

  const shift = (days: number) => {
    const d = new Date(`${max}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - (days - 1))
    return d.toISOString().slice(0, 10)
  }
  const active = f || t

  return (
    <div className="controls" style={{ marginTop: 10, opacity: pending ? 0.6 : 1 }}>
      <span className="note">período</span>
      <input
        type="date"
        value={f}
        min={min}
        max={max}
        onChange={(e) => apply(e.target.value, t)}
      />
      <span className="note">até</span>
      <input
        type="date"
        value={t}
        min={min}
        max={max}
        onChange={(e) => apply(f, e.target.value)}
      />
      <button type="button" onClick={() => apply(shift(7), '')}>últimos 7 dias</button>
      <button type="button" onClick={() => apply(shift(30), '')}>últimos 30 dias</button>
      <button type="button" onClick={() => apply('', '')} disabled={!active}>
        tudo ({min} a {max})
      </button>
      {active ? <span className="tag">recorte ativo</span> : null}
    </div>
  )
}
