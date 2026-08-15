import Link from 'next/link'
import { getTournaments } from '@/lib/data'
import { getPeriod } from '@/lib/period'
import { Panel } from '@/components/ui'

export const metadata = { title: 'Torneios · Meta Riftbound' }

export default async function Torneios() {
  const tournaments = getTournaments(await getPeriod())

  return (
    <div className="wrap">
      <Panel
        title="Torneios com deck publicado"
        note="Derivado dos decks publicados: um torneio aparece aqui com o número de decks (top 4) que o riftdecks publicou dele. As estrelas são a classificação de porte do próprio site."
      >
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Torneio</th>
                <th>Loja / organizador</th>
                <th className="num">Jogadores</th>
                <th className="num">Decks</th>
                <th>Porte</th>
                <th>Campeão</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.name}</td>
                  <td className="muted">{t.store || '—'}</td>
                  <td className="num">{t.players ?? '—'}</td>
                  <td className="num">{t.decks}</td>
                  <td>{'★'.repeat(t.stars) || '—'}</td>
                  <td>
                    {t.winner ? (
                      <>
                        {t.winner.player}{' '}
                        {t.winner.slug ? (
                          <Link href={`/lendas/${t.winner.slug}`} className="chip">
                            {t.winner.legend}
                          </Link>
                        ) : (
                          <span className="chip">{t.winner.legend}</span>
                        )}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
