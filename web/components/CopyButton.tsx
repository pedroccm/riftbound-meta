'use client'

import { useState } from 'react'

/** Botão que copia o texto pro clipboard, com feedback inline. */
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }}
      style={{
        background: copied ? 'var(--panel2)' : 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 6,
        padding: '3px 10px',
        fontSize: 12,
        cursor: 'pointer',
        color: 'var(--tx2)',
        fontFamily: 'inherit',
      }}
    >
      {copied ? 'copiado!' : 'copiar'}
    </button>
  )
}
