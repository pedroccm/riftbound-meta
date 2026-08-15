/** Período ativo do app (filtro global de datas), guardado em cookie.

Cookie em vez de searchParams: sobrevive à navegação sem precisar propagar
query string em todo <Link>, e Server Components leem via next/headers. */
import { cookies } from 'next/headers'

export type Period = { from?: string; to?: string }

// sufixo -rb: localhost compartilha cookies entre portas (3030 Pokémon, 3031 OP)
export const PERIOD_COOKIE = 'periodo-rb'

export async function getPeriod(): Promise<Period> {
  const raw = (await cookies()).get(PERIOD_COOKIE)?.value
  if (!raw) return {}
  try {
    const p = JSON.parse(decodeURIComponent(raw))
    const ok = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
    return { from: ok(p.from), to: ok(p.to) }
  } catch {
    return {}
  }
}
