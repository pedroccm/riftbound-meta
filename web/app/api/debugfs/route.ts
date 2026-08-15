import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'

// TEMPORARIO: mapa do filesystem da funcao no Netlify (achar o riftbound.db)
export const dynamic = 'force-dynamic'

function ls(p: string) {
  try { return fs.readdirSync(p).slice(0, 60) } catch (e) { return String(e) }
}
function findDb(root: string, depth = 4): string[] {
  const out: string[] = []
  const walk = (d: string, n: number) => {
    if (n > depth || out.length > 20) return
    let ents: fs.Dirent[] = []
    try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of ents) {
      const p = path.join(d, e.name)
      if (e.isFile() && e.name === 'riftbound.db') out.push(p)
      else if (e.isDirectory() && e.name !== 'node_modules') walk(p, n + 1)
    }
  }
  walk(root, 0)
  return out
}

export async function GET() {
  const cwd = process.cwd()
  const dn = typeof __dirname === 'string' ? __dirname : '(no __dirname)'
  return NextResponse.json({
    cwd, __dirname: dn,
    env_LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT ?? null,
    ls_cwd: ls(cwd),
    ls_task_root: process.env.LAMBDA_TASK_ROOT ? ls(process.env.LAMBDA_TASK_ROOT) : null,
    found_from_cwd: findDb(cwd),
    found_from_task_root: process.env.LAMBDA_TASK_ROOT ? findDb(process.env.LAMBDA_TASK_ROOT) : null,
    found_from_var_task: findDb('/var/task'),
  })
}
