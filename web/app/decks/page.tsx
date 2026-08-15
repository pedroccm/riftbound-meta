import { getDecks } from '@/lib/data'
import { getPeriod } from '@/lib/period'
import DecksTable from '@/components/DecksTable'

export const metadata = { title: 'Decks · Meta Riftbound' }

export default async function Decks() {
  const decks = getDecks(await getPeriod())
  return (
    <div className="wrap">
      <DecksTable decks={decks} />
    </div>
  )
}
