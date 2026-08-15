import Link from 'next/link'
import { getOverview, pct, usd } from '@/lib/data'
import { getPeriod } from '@/lib/period'
import { Conv, Domains, LegendLink, Panel } from '@/components/ui'

export const metadata = { title: 'Visão geral · Meta Riftbound' }

export default async function Meta() {
  const o = getOverview(await getPeriod())
  const maxShare = Math.max(...o.legends.map((l) => l.share), 1)

  return (
    <div className="wrap">
      <Panel
        title="Meta share por lenda"
        note={
          <>
            Share sobre os {o.totals.decks} decks publicados no recorte (só decks de
            torneio, top 4, sem cartas banidas). Sem partidas: o riftdecks não publica
            confrontos, então a leitura é de presença e conversão em 1º lugar.
          </>
        }
      >
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 60 }}>#</th>
                <th style={{ minWidth: 220 }}>Lenda</th>
                <th>Domínios</th>
                <th className="num">Decks</th>
                <th className="num" style={{ minWidth: 160 }}>Share</th>
                <th className="num">1º lugar</th>
                <th className="num">Conv. 1º</th>
                <th className="num">Torneios</th>
                <th className="num">Preço médio</th>
                <th>Arquétipos</th>
              </tr>
            </thead>
            <tbody>
              {o.legends.map((l, i) => (
                <tr key={l.slug}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <LegendLink slug={l.slug} name={l.name} icon={l.img} />
                  </td>
                  <td>
                    <Domains domains={l.domains} />
                  </td>
                  <td className="num">{l.n}</td>
                  <td className="num">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="barbg" style={{ flex: 1 }}>
                        <div
                          className="bar"
                          style={{ width: `${(100 * l.share) / maxShare}%` }}
                        />
                      </div>
                      <span style={{ minWidth: 46, textAlign: 'right' }}>{pct(l.share)}</span>
                    </div>
                  </td>
                  <td className="num">{l.top1 || '—'}</td>
                  <td className="num">
                    <Conv v={l.conv_top1} n={l.n} />
                  </td>
                  <td className="num">{l.tours}</td>
                  <td className="num">{usd(l.avg_price)}</td>
                  <td style={{ fontSize: 11 }}>
                    {l.archetypes.slice(0, 3).map((a) => (
                      <span key={a.slug} className="chip" style={{ marginRight: 4 }}>
                        {a.name} {a.n}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Por combinação de domínios"
        note="O riftdecks chama a dupla de domínios de arquétipo (ex.: Calm Order). Mesma leitura de share, agrupada pelas runas."
      >
        <div className="scroll">
          <table style={{ width: 'auto', minWidth: 520 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Arquétipo</th>
                <th className="num">Decks</th>
                <th className="num">Share</th>
                <th className="num">1º lugar</th>
                <th>Lendas</th>
              </tr>
            </thead>
            <tbody>
              {o.archetypes.map((a) => (
                <tr key={a.slug}>
                  <td>
                    <Domains domains={a.domains} />{' '}
                    <b style={{ marginLeft: 6 }}>{a.name}</b>
                  </td>
                  <td className="num">{a.n}</td>
                  <td className="num">{pct(a.share)}</td>
                  <td className="num">{a.top1 || '—'}</td>
                  <td style={{ fontSize: 11 }}>
                    {a.legends.slice(0, 4).map((l) => (
                      <Link key={l.slug} href={`/lendas/${l.slug}`} className="chip" style={{ marginRight: 4 }}>
                        {l.name} {l.n}
                      </Link>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Movimento dia a dia"
        note="Share de cada lenda dentro dos decks publicados em cada dia. Dias com poucos torneios oscilam mais; confira o total na última linha."
      >
        <div className="scroll">
          <table style={{ width: 'auto', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 230 }}>Lenda</th>
                {o.days.map((d) => (
                  <th key={d} className="num" style={{ minWidth: 64 }}>
                    {d.slice(5).replace('-', '/')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {o.trend.map((t) => {
                const mx = Math.max(...t.pts.map((p) => p.share), 8)
                return (
                  <tr key={t.slug}>
                    <td>
                      <Link href={`/lendas/${t.slug}`}>{t.name}</Link>
                    </td>
                    {t.pts.map((p) => (
                      <td
                        key={p.d}
                        className="num"
                        title={`${p.n} decks`}
                        style={{
                          background: `rgba(59,125,216,${(
                            Math.min(p.share / mx, 1) * 0.55
                          ).toFixed(2)})`,
                        }}
                      >
                        {p.share ? `${p.share.toFixed(0)}%` : '—'}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th>decks no dia</th>
                {o.days.map((d) => (
                  <th key={d} className="num">
                    {o.dayTotals[d] ?? 0}
                  </th>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  )
}
