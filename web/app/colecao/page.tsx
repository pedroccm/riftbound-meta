import { getCatalog } from '@/lib/data'
import CollectionEditor from '@/components/CollectionEditor'

export const metadata = { title: 'Minha coleção · Meta Riftbound' }

export default function Colecao() {
  const catalog = getCatalog()
  return (
    <div className="wrap">
      <CollectionEditor catalog={catalog} />
    </div>
  )
}
