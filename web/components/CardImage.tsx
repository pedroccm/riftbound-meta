'use client'

import { useState } from 'react'
import { useCollection } from '@/lib/collection'

/** Carta com a imagem espelhada do riftdecks e o contador, estilo imggen.
 *  Se houver coleção no browser, mostra "tenho X/qty" e esmaece o que falta. */
export default function CardImage({
  name,
  image,
  code,
  qty,
}: {
  name: string
  image: string
  code: string
  qty: number
}) {
  const [failed, setFailed] = useState(false)
  const { has, ready, total } = useCollection()
  const showCol = ready && total > 0
  const have = showCol ? Math.min(has(code), qty) : 0
  const missing = showCol ? qty - have : 0

  return (
    <div
      className="imgcard"
      title={`${qty}× ${name} · ${code}${showCol ? ` · tenho ${has(code)}` : ''}`}
      style={showCol && missing > 0 ? { opacity: have === 0 ? 0.55 : 0.8 } : undefined}
    >
      {failed || !image ? (
        <div className="fallback">
          <div>
            <b style={{ color: 'var(--tx2)' }}>{name}</b>
            <br />
            {code}
          </div>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          width={245}
          height={342}
        />
      )}
      <div className="qty">{qty}</div>
      {showCol && (
        <div
          className={`pill ${missing === 0 ? 'pgood' : have > 0 ? 'pmid' : 'pbad'}`}
          style={{ position: 'absolute', left: 6, bottom: 6, fontSize: 11 }}
        >
          {missing === 0 ? '✓' : `falta ${missing}`}
        </div>
      )}
    </div>
  )
}
