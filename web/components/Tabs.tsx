'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/meta', label: 'Visão geral' },
  { href: '/decks', label: 'Decks' },
  { href: '/cartas', label: 'Cartas' },
  { href: '/staples', label: 'Mais usadas' },
  { href: '/torneios', label: 'Torneios' },
  { href: '/colecao', label: 'Minha coleção' },
  { href: '/metodologia', label: 'Metodologia' },
]

export default function Tabs() {
  const path = usePathname()
  return (
    <nav className="tabs">
      {TABS.map((t) => {
        const on = path.startsWith(t.href) || (t.href === '/meta' && path.startsWith('/lendas'))
        return (
          <Link key={t.href} href={t.href} className={on ? 'on' : ''}>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
