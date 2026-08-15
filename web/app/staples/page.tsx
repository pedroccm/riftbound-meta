import { getCards } from '@/lib/data'
import { getPeriod } from '@/lib/period'
import StaplesTable from '@/components/StaplesTable'

export const metadata = { title: 'Mais usadas · Meta Riftbound' }

export default async function Staples() {
  const { cards, totalDecks } = getCards(await getPeriod())
  return (
    <div className="wrap">
      <StaplesTable cards={cards} totalDecks={totalDecks} />
    </div>
  )
}
