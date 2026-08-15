import { getIndex, num } from '@/lib/data'

export const metadata = { title: 'Metodologia · Meta Riftbound' }

export default function Metodologia() {
  const idx = getIndex()
  const t = idx.totals
  const w = idx.window

  return (
    <div className="wrap">
      <div className="panel artigo">
        <h2>Metodologia e limites</h2>
        <p>
          <b>Fonte.</b> Listagem pública de decks do{' '}
          <a href="https://riftdecks.com/riftbound-decks" target="_blank" rel="noreferrer">
            riftdecks.com
          </a>{' '}
          (site da comunidade para o Riftbound, o TCG de League of Legends). O site não tem
          API: os dados vêm das páginas de listagem e de detalhe de cada deck, coletadas
          por script. Nenhum dado foi estimado.
        </p>
        <p>
          <b>Recorte.</b> Decks marcados como <i>tournament</i> no riftdecks, publicados
          com rank top 4, sem cartas banidas, de {w.start} a {w.end}: {num(t.decks)} decks
          de {num(t.tournaments)} torneios, {t.legends} lendas e {t.archetypes} combinações
          de domínios. O riftdecks publica os decks que jogadores e lojas sobem; não é o
          campo completo de nenhum torneio, é a amostra do que chegou ao top 4 e foi
          publicado.
        </p>
        <p>
          <b>Sem partidas.</b> Diferente da plataforma da Limitless (apps do Pokémon e do
          One Piece), o riftdecks não publica confrontos: não existe winrate nem matriz de
          matchups aqui. As leituras possíveis são de <b>presença</b> (share de decks
          publicados) e <b>conversão em 1º lugar</b> (títulos ÷ decks publicados da
          lenda). Como a amostra já é só top 4, o share mede sucesso relativo dentro da
          elite dos torneios, não popularidade geral.
        </p>
        <p>
          <b>Arquétipo.</b> A leitura principal é por <b>lenda</b> (a carta de lenda do
          deck, ex.: Leona, Radiant Dawn). O riftdecks também rotula cada deck pela dupla
          de domínios (ex.: Calm Order), que aparece aqui como segunda dimensão.
        </p>
        <p>
          <b>Esqueleto e consenso.</b> Na página de cada lenda, a inclusão de cada carta é
          o percentual das listas da lenda que jogam a carta, e a média de cópias conta só
          as listas que jogam. A lista consenso pega as cartas com 50% ou mais de inclusão
          na quantidade mais comum: é o núcleo compartilhado, não necessariamente uma
          lista legal completa.
        </p>
        <p>
          <b>Preço e spice.</b> O preço em dólar de cada deck e de cada carta vem do
          próprio riftdecks (preços de mercado dos EUA), assim como o índice de
          &ldquo;spiciness&rdquo; (quão fora do padrão a lista é). São informativos, não
          entram em nenhuma conta.
        </p>
        <p>
          <b>Atualização.</b> <code>python scrape.py</code> baixa o incremento (decks
          novos da janela configurada), <code>python load_db.py</code> recarrega o SQLite
          e <code>python fetch_images.py</code> espelha as imagens novas. O deck publicado
          é imutável, então nada é re-baixado.
        </p>
      </div>
    </div>
  )
}
