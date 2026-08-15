import path from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  // ha outros lockfiles acima na arvore (E:\sites); fixa a raiz neste projeto
  turbopack: { root: path.resolve() },
  // o SQLite precisa ir junto na funcao serverless (Netlify): o build copia
  // ../riftbound.db pra web/riftbound.db e o tracing inclui ele
  outputFileTracingIncludes: {
    '/**': ['./riftbound.db'],
  },
}

export default config
