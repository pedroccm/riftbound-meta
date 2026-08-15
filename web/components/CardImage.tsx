'use client'

import { useState } from 'react'

/** Carta com a imagem espelhada do riftdecks e o contador, estilo imggen. */
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

  return (
    <div className="imgcard" title={`${qty}× ${name} · ${code}`}>
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
    </div>
  )
}
