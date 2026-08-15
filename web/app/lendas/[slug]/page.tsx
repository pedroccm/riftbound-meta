import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLegend, pct, usd, CAT_NAME } from '@/lib/data'
import type { SkelCard } from '@/lib/types'
import { getPeriod } from '@/lib/period'
import CardImage from '@/components/CardImage'
import CopyButton from '@/components/CopyButton'
import { Conv, Domains, LegendIcon, Panel } from '@/components/ui'

export const metadata = { title: 'Lenda · Meta Riftbound' }

function SkelTable({ cards }: { cards: SkelCard[] }) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>Carta</th>
            <th>Tipo</th>
            <th className="num">Inclusão</th>
            <th className="num">Listas</th>
            <th className="num">Média</th>
            <th>Cópias (nº de listas)</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={`${c.cat}-${c.code}`}>
              <td>
                {c.name} <span className="tag">{c.code}</span>
              </td>
              <td className="muted">{CAT_NAME[c.cat] ?? c.cat}</td>
              <td className="num">{c.incl.toFixed(0)}%</td>
              <td className="num">{c.lists}</td>
              <td className="num">{c.avg.toFixed(2)}</td>
              <td className="spread">
                {c.spread.map(([q, n]) => (
                  <span key={q} className="chip" style={{ marginRight: 4 }}>
                    {q}× em {n}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function LegendPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const legend = getLegend(slug, await getPeriod())
  if (!legend) notFound()
  const s = legend.stats

  const conText = legend.consensus
    .map((c) => `${c.count} ${c.name} (${c.code})`)
    .join('\n')

  return (
    <div className="wrap">
      <div className="crumb">
        <Link href="/meta">← visão geral</Link>
      </div>

      <Panel
        title={legend.name}
        right={
          <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
            <LegendIcon src={legend.img} />
            <Domains domains={s.domains} />
          </span>
        }
        note={
          <>
            {s.n} decks ({pct(s.share)} do campo) em {s.tours} torneios · {s.top1} título(s){' '}
            <Conv v={s.conv_top1} n={s.n} /> · preço médio {usd(s.avg_price)}
            {s.archetypes.length ? (
              <>
                {' '}
                · arquétipos:{' '}
                {s.archetypes.map((a) => (
                  <span key={a.slug} className="chip" style={{ marginRight: 4 }}>
                    {a.name} {a.n}
                  </span>
                ))}
              </>
            ) : null}
          </>
        }
      >
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th className="num">Rank</th>
                <th>Jogador</th>
                <th>Data</th>
                <th>Torneio</th>
                <th className="num">Jogadores</th>
                <th className="num">Preço</th>
              </tr>
            </thead>
            <tbody>
              {legend.decks.map((d) => (
                <tr key={d.id}>
                  <td className="num">
                    <b>{d.rank}</b>
                  </td>
                  <td>
                    <Link href={`/decks/${d.id}`}>{d.player || d.name}</Link>
                  </td>
                  <td>{d.date}</td>
                  <td>
                    {d.tournament}
                    {d.store ? <span className="note"> @{d.store}</span> : null}
                  </td>
                  <td className="num">{d.players ?? '—'}</td>
                  <td className="num">{usd(d.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {legend.consensus.length > 0 && (
        <Panel
          title={`Lista consenso (${legend.consensusTotal} cartas)`}
          note="Cartas presentes em 50% ou mais das listas da lenda, na quantidade mais comum de cada uma. Não é necessariamente uma lista legal completa: é o núcleo que o campo concorda em jogar."
          right={<CopyButton text={conText} />}
        >
          <div className="imggrid">
            {legend.consensus.map((c) => (
              <CardImage
                key={c.code + c.name}
                name={c.name}
                image={c.image}
                code={c.code}
                qty={c.count}
              />
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Esqueleto da lista"
        note={`Inclusão e cópias de cada carta nas ${s.n} listas da lenda no recorte. Core = 90%+, flex = 25–89%, tech = abaixo de 25% (2+ listas).`}
      >
        {legend.core.length > 0 && (
          <>
            <div className="catrow">Core ({legend.core.length})</div>
            <SkelTable cards={legend.core} />
          </>
        )}
        {legend.flex.length > 0 && (
          <>
            <div className="catrow" style={{ marginTop: 14 }}>Flex ({legend.flex.length})</div>
            <SkelTable cards={legend.flex} />
          </>
        )}
        {legend.tech.length > 0 && (
          <>
            <div className="catrow" style={{ marginTop: 14 }}>Tech ({legend.tech.length})</div>
            <SkelTable cards={legend.tech} />
          </>
        )}
      </Panel>
    </div>
  )
}
