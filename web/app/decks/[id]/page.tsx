import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDeck, CAT_NAME, CAT_ORDER, usd } from '@/lib/data'
import CardImage from '@/components/CardImage'
import CopyList from '@/components/CopyList'
import DeckMissing from '@/components/DeckMissing'
import { Domains, Panel } from '@/components/ui'

export const metadata = { title: 'Deck · Meta Riftbound' }

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deck = getDeck(Number(id))
  if (!deck) notFound()

  const byCat = new Map<string, typeof deck.cards>()
  for (const c of deck.cards) {
    if (!byCat.has(c.cat)) byCat.set(c.cat, [])
    byCat.get(c.cat)!.push(c)
  }
  const cats = CAT_ORDER.filter((c) => byCat.has(c)).concat(
    [...byCat.keys()].filter((c) => !CAT_ORDER.includes(c)),
  )
  const total = deck.cards.reduce((a, c) => a + c.qty, 0)

  return (
    <div className="wrap">
      <div className="crumb">
        <Link href="/decks">← todos os decks</Link>
        {deck.legendSlug ? (
          <>
            {' · '}
            <Link href={`/lendas/${deck.legendSlug}`}>página da lenda</Link>
          </>
        ) : null}
        {' · '}
        <a href={deck.url} target="_blank" rel="noreferrer">
          ver no riftdecks ↗
        </a>
      </div>

      <Panel
        title={`${deck.legend || deck.name} — ${deck.rank}`}
        note={
          <>
            por <b>{deck.player}</b> · {deck.tournament}
            {deck.store ? <> @{deck.store}</> : null}
            {deck.players ? <> · {deck.players} jogadores</> : null} · {deck.date}
            {deck.record ? <> · record {deck.record}</> : null}
          </>
        }
        right={
          <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
            <Domains domains={deck.domains} />
            <span className="tag">{deck.archetype}</span>
            {deck.price != null ? <span className="tag">{usd(deck.price)}</span> : null}
            {deck.spice != null ? <span className="tag">spice {deck.spice}%</span> : null}
            <CopyList cards={deck.cards.map((c) => ({ name: c.name, code: c.code, qty: c.qty }))} />
          </span>
        }
      >
        <div className="note" style={{ marginBottom: 12 }}>
          {total} cartas
        </div>
        <DeckMissing cards={deck.cards.map((c) => ({ name: c.name, code: c.code, qty: c.qty }))} />
        {cats.map((cat) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div className="catrow">
              {CAT_NAME[cat] ?? cat} (
              {byCat.get(cat)!.reduce((a, c) => a + c.qty, 0)})
            </div>
            <div className="imggrid">
              {byCat.get(cat)!.map((c) => (
                <CardImage
                  key={c.code + c.name}
                  name={c.name}
                  image={c.image}
                  code={c.code}
                  qty={c.qty}
                />
              ))}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  )
}
