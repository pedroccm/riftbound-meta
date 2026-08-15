import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="panel">
        <h2>Não encontrado</h2>
        <div className="note" style={{ marginTop: 8 }}>
          Essa página não existe neste recorte de dados. Volte para a{' '}
          <Link href="/meta">visão geral</Link> ou para a lista de{' '}
          <Link href="/decks">decks</Link>.
        </div>
      </div>
    </div>
  )
}
