import { redirect } from 'next/navigation'

/** A home é a visão geral do meta. */
export default function Home() {
  redirect('/meta')
}
