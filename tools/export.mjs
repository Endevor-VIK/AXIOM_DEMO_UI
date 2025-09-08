import { build } from 'vite'
import { cpSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = 'dist'
const TARGET = 'export/site'

async function main() {
  // Clean previous build outputs
  try { rmSync(OUT, { recursive: true, force: true }) } catch {}

  // Build via Vite using vite.config.ts
  await build()

  // Prepare export target
  try { rmSync(TARGET, { recursive: true, force: true }) } catch {}
  mkdirSync(TARGET, { recursive: true })
  cpSync(OUT, TARGET, { recursive: true })

  // SPA fallback + disable Jekyll processing on Pages
  const fallback = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./">'
  writeFileSync(join(TARGET, '404.html'), fallback)
  writeFileSync(join(TARGET, '.nojekyll'), '')

  // Basic sanity check
  if (!existsSync(join(TARGET, 'index.html'))) {
    throw new Error('Export failed: missing index.html in export/site')
  }

  console.log('[export] done →', TARGET)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

