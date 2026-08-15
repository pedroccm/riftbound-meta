import type { Metadata } from 'next'
import Link from 'next/link'
import { getBounds, getIndex, num } from '@/lib/data'
import { getPeriod } from '@/lib/period'
import Tabs from '@/components/Tabs'
import PeriodFilter from '@/components/PeriodFilter'
import './globals.css'

export const metadata: Metadata = {
  title: 'Meta do Riftbound · riftdecks',
  description:
    'Metagame do Riftbound (o TCG de League of Legends) a partir dos decks de torneio publicados no riftdecks.com: share por lenda, domínios, decklists e cartas.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const period = await getPeriod()
  const idx = getIndex(period)
  const b = getBounds()
  const t = idx.totals
  const w = idx.window

  return (
    <html lang="pt-BR">
      {/* extensoes de browser injetam atributos no body e quebram a hidratacao */}
      <body suppressHydrationWarning>
        <header className="site">
          <div className="wrap">
            <h1>
              <Link href="/">
                Meta do Riftbound <span style={{ color: 'var(--acc)' }}>·</span> riftdecks
              </Link>
            </h1>
            <div className="sub">
              {t.decks} decks de {w.start} a {w.end} · base completa: {b.decks} decks (
              {b.min} a {b.max})
            </div>
            <div className="kpis">
              <div className="kpi">
                <div className="v">{num(t.decks)}</div>
                <div className="l">decks</div>
              </div>
              <div className="kpi">
                <div className="v">{num(t.tournaments)}</div>
                <div className="l">torneios</div>
              </div>
              <div className="kpi">
                <div className="v">{t.legends}</div>
                <div className="l">lendas</div>
              </div>
              <div className="kpi">
                <div className="v">{t.archetypes}</div>
                <div className="l">arquétipos</div>
              </div>
              <div className="kpi">
                <div className="v">{num(t.players)}</div>
                <div className="l">jogadores</div>
              </div>
            </div>
            <PeriodFilter min={b.min} max={b.max} from={period.from} to={period.to} />
            <Tabs />
          </div>
        </header>
        {children}
        <footer className="site">
          Dados: riftdecks.com (decks de torneio, top 4) · banco atualizado em{' '}
          {b.updated.replace('T', ' ')}
        </footer>
      </body>
    </html>
  )
}
