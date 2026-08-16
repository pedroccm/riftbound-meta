'use client'

/** Minha coleção: guardada no localStorage do browser (o site é read-only no
 *  servidor). Chave = código normalizado da carta ("UNL-002"), valor = qtd. */
import { useCallback, useEffect, useState } from 'react'

export const COLLECTION_KEY = 'rb-colecao-v1'
export type Collection = Record<string, number>

/** "UNL2" | "OGS9" | "OGN-007a" | "unl-2" -> "UNL-002" / "OGN-007a" (padrão do banco). */
export function normCode(raw: string): string {
  const m = /^([A-Za-z]{2,4})-?0*(\d+)([a-z]?)$/.exec(raw.trim())
  if (!m) return raw.trim().toUpperCase()
  return `${m[1].toUpperCase()}-${m[2].padStart(3, '0')}${m[3].toLowerCase()}`
}

export type ParsedLine = { qty: number; code: string; name: string; foil: boolean }

/** Aceita o texto colado do carrinho/pedido da Liga:
 *    "1x Master Yi - Honed (#9) (Código: OGS9)"  ... " Foil"
 *  e também formatos simples: "3x Inferna (UNL-002)", "3 UNL-002", "UNL2".
 *  Linhas de preço/loja são ignoradas. */
export function parseCollectionText(text: string): ParsedLine[] {
  const out: ParsedLine[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // formato Liga: "3x Nome (#num) (Código: SETnum)"
    let m = /^(\d+)\s*x\s+(.+?)\s*(?:\(#\d+[a-z]?\))?\s*\(C[oó]digo:\s*([A-Za-z]{2,4}-?\d+[a-z]?)\)/i.exec(line)
    if (m) {
      // foil aparece numa linha proxima (" Foil") antes do proximo "Nx"
      let foil = false
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        if (/^\d+\s*x\s+/i.test(lines[j].trim())) break
        if (/^foil$/i.test(lines[j].trim())) { foil = true; break }
      }
      out.push({ qty: Number(m[1]), name: m[2].trim(), code: normCode(m[3]), foil })
      continue
    }
    // "3x Nome (UNL-002)" | "3 Nome (UNL-002)"
    m = /^(\d+)\s*x?\s+(.+?)\s*\(([A-Za-z]{2,4}-?\d+[a-z]?)\)\s*$/i.exec(line)
    if (m) { out.push({ qty: Number(m[1]), name: m[2].trim(), code: normCode(m[3]), foil: false }); continue }
    // "3 UNL-002" | "3x UNL2"
    m = /^(\d+)\s*x?\s+([A-Za-z]{2,4}-?\d+[a-z]?)\s*$/i.exec(line)
    if (m) { out.push({ qty: Number(m[1]), name: '', code: normCode(m[2]), foil: false }); continue }
    // "UNL-002" sozinho = 1
    m = /^([A-Za-z]{2,4}-?\d+[a-z]?)$/i.exec(line)
    if (m) { out.push({ qty: 1, name: '', code: normCode(m[1]), foil: false }); continue }
  }
  return out
}

export function loadCollection(): Collection {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(COLLECTION_KEY) || '{}') } catch { return {} }
}
export function saveCollection(c: Collection) {
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(c))
  window.dispatchEvent(new Event('rb-colecao'))
}

/** Hook: coleção reativa (atualiza em todas as abas/componentes ao salvar). */
export function useCollection() {
  const [col, setCol] = useState<Collection>({})
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const load = () => { setCol(loadCollection()); setReady(true) }
    load()
    window.addEventListener('rb-colecao', load)
    window.addEventListener('storage', load)
    return () => { window.removeEventListener('rb-colecao', load); window.removeEventListener('storage', load) }
  }, [])
  const set = useCallback((c: Collection) => { saveCollection(c); setCol(c) }, [])
  const has = useCallback((code: string) => col[normCode(code)] ?? 0, [col])
  return { col, set, has, ready, total: Object.values(col).reduce((a, b) => a + b, 0) }
}
