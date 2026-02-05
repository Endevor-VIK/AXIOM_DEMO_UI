import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const baseUrl = process.env.UI_SCAN_BASE || 'http://127.0.0.1:4173'
const routeList = process.env.UI_SCAN_ROUTES
  ? process.env.UI_SCAN_ROUTES.split(',').map((route) => route.trim()).filter(Boolean)
  : [
      '/',
      '/dashboard',
      '/dashboard/content/all',
      '/dashboard/content/read/LOC-ECHELON-CORE',
    ]

const outputRoot = process.env.UI_SCAN_OUT || 'ops/artifacts/ui_scan'

function buildSessionPayload() {
  return {
    auth: JSON.stringify({
      isAuthenticated: true,
      user: {
        id: 'ui-scan',
        displayName: 'UI SCAN',
        handle: '@ui-scan',
        role: 'user',
        lang: 'EN',
      },
    }),
    pins: JSON.stringify([]),
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputDir = path.resolve(process.cwd(), outputRoot, timestamp)
  await ensureDir(outputDir)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const payload = buildSessionPayload()
  await page.addInitScript(({ auth, pins }) => {
    if (!window.localStorage.getItem('ax_session_v1')) {
      window.localStorage.setItem('ax_session_v1', auth)
    }
    if (!window.localStorage.getItem('ax_favorites_v1')) {
      window.localStorage.setItem('ax_favorites_v1', pins)
    }
  }, payload)

  const results = []
  for (const route of routeList) {
    const url = new URL(route, baseUrl).toString()
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const safeName = route.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'root'
    const fileName = `${safeName}.png`
    const filePath = path.join(outputDir, fileName)
    await page.screenshot({ path: filePath, fullPage: true })
    results.push({ route, url, screenshot: fileName })
    console.log(`[ui-scan] captured ${route}`)
  }

  await browser.close()

  const report = {
    baseUrl,
    outputDir,
    routes: results,
  }
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`[ui-scan] report saved to ${path.join(outputDir, 'report.json')}`)
}

main().catch((err) => {
  console.error('[ui-scan] failed', err)
  process.exit(1)
})
