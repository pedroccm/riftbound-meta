import { getCards } from '@/lib/data'
import { getPeriod } from '@/lib/period'
import CardsTable from '@/components/CardsTable'

export const metadata = { title: 'Cartas · Meta Riftbound' }

export default async function Cartas() {
  const { cards, totalDecks } = getCards(await getPeriod())
  return (
    <div className="wrap">
      <CardsTable cards={cards} totalDecks={totalDecks} />
    </div>
  )
}
