import Link from 'next/link'
import { DOMAIN_COLOR, domainLabel, pct, convClass } from '@/lib/format'

export { convClass }

/** Icone da lenda = tile que o riftdecks usa na listagem (espelhado em public/). */
export function LegendIcon({ src }: { src?: string | null }) {
  if (!src) return <span className="ic" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="ic" src={src} alt="" loading="lazy" />
}

/** Bolinhas coloridas dos dominios (runas) do deck. */
export function Domains({ domains }: { domains: string[] }) {
  if (!domains?.length) return null
  return (
    <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle' }}>
      {domains.map((d) => (
        <span
          key={d}
          title={domainLabel(d)}
          style={{
            width: 9, height: 9, borderRadius: '50%',
            background: DOMAIN_COLOR[d] ?? 'var(--tx3)', display: 'inline-block',
          }}
        />
      ))}
    </span>
  )
}

export function Conv({ v, n }: { v: number | null | undefined; n?: number }) {
  return <span className={`pill ${convClass(v, n)}`}>{pct(v)}</span>
}

export function LegendLink({
  slug,
  name,
  icon,
}: {
  slug: string
  name: string
  icon?: string | null
}) {
  return (
    <Link className="deckcell" href={`/lendas/${slug}`}>
      <LegendIcon src={icon} />
      <span className="dn">{name}</span>
    </Link>
  )
}

export function Panel({
  title,
  note,
  children,
  right,
}: {
  title?: string
  note?: React.ReactNode
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="panel">
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: note ? 4 : 12,
          }}
        >
          <h2 style={{ margin: 0, flex: 1 }}>{title}</h2>
          {right}
        </div>
      )}
      {note && (
        <div className="note" style={{ marginBottom: 10 }}>
          {note}
        </div>
      )}
      {children}
    </div>
  )
}
