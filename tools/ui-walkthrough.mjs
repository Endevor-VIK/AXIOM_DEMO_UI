import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const defaultBases = ['http://127.0.0.1:5173', 'http://127.0.0.1:4173']
const baseCandidates = [
  process.env.UI_WALK_BASE,
  process.env.UI_SCAN_BASE,
  ...defaultBases,
].filter(Boolean)

const outputRoot = process.env.UI_WALK_OUT || 'ops/artifacts/ui_walkthrough'

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function resolveBaseUrl(page) {
  for (const base of baseCandidates) {
    try {
      await page.goto(new URL('/login', base).toString(), { waitUntil: 'domcontentloaded' })
      return base
    } catch {
      // try next base
    }
  }
  throw new Error(
    `UI dev server not reachable. Tried: ${baseCandidates.join(', ') || 'none'}`,
  )
}

async function registerUser(page) {
  const suffix = Date.now().toString(36)
  const user = `ui_scan_${suffix}`
  const pass = `Access-${suffix}`

  await page.getByRole('button', { name: 'REQUEST ACCESS' }).click()
  await page.getByPlaceholder('USER ID').fill(user)
  await page.getByPlaceholder('ACCESS KEY').fill(pass)
  await page.getByRole('button', { name: 'REGISTER' }).click()
  await page.waitForURL('**/dashboard', { timeout: 30_000 })

  return { user, pass }
}

async function capture(page, outputDir, name, options = {}) {
  const fileName = `${name}.png`
  const filePath = path.join(outputDir, fileName)
  await page.screenshot({ path: filePath, ...options })
  return fileName
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputDir = path.resolve(process.cwd(), outputRoot, timestamp)
  await ensureDir(outputDir)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const baseUrl = await resolveBaseUrl(page)

  const results = []

  // Login page before register
  results.push({
    route: '/login',
    screenshot: await capture(page, outputDir, 'login', { fullPage: true }),
  })

  const creds = await registerUser(page)

  // Main pages
  const mainRoutes = [
    { name: 'dashboard', route: '/dashboard' },
    { name: 'roadmap', route: '/dashboard/roadmap' },
    { name: 'audit', route: '/dashboard/audit' },
    { name: 'news', route: '/dashboard/news' },
  ]

  for (const entry of mainRoutes) {
    const url = new URL(entry.route, baseUrl).toString()
    await page.goto(url, { waitUntil: 'networkidle' })
    results.push({
      route: entry.route,
      screenshot: await capture(page, outputDir, entry.name, { fullPage: true }),
    })
  }

  // Content page (top)
  await page.goto(new URL('/dashboard/content/all', baseUrl).toString(), {
    waitUntil: 'networkidle',
  })
  await page.waitForSelector('.ax-content-list', { timeout: 30_000 })
  results.push({
    route: '/dashboard/content/all',
    screenshot: await capture(page, outputDir, 'content', { fullPage: true }),
  })

  // Content page (scrolled)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(600)
  results.push({
    route: '/dashboard/content/all#scroll',
    screenshot: await capture(page, outputDir, 'content-scroll', { fullPage: false }),
  })

  // Content read page
  await page.goto(new URL('/dashboard/content/read/LOC-ECHELON-CORE', baseUrl).toString(), {
    waitUntil: 'networkidle',
  })
  results.push({
    route: '/dashboard/content/read/LOC-ECHELON-CORE',
    screenshot: await capture(page, outputDir, 'content-read', { fullPage: true }),
  })

  await browser.close()

  const report = {
    baseUrl,
    outputDir,
    credentials: creds,
    pages: results,
  }
  const reportPath = path.join(outputDir, 'report.json')
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(`[ui-walk] report saved to ${reportPath}`)
}

main().catch((err) => {
  console.error('[ui-walk] failed', err)
  process.exit(1)
})
