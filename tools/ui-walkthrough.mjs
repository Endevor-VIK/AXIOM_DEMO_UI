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
const debugEnabled = (process.env.UI_WALK_DEBUG ?? '1').toLowerCase() !== '0'
const deviceScaleFactor = Number.parseFloat(process.env.UI_WALK_DPR || '1')
const navTimeout = Number.parseInt(process.env.UI_WALK_TIMEOUT || '60000', 10)
const authMode = (process.env.UI_WALK_AUTH || 'auto').toLowerCase()
const authUserEnv = process.env.UI_WALK_USER || process.env.AX_TEST_EMAIL || ''
const authPassEnv = process.env.UI_WALK_PASSWORD || process.env.AX_TEST_PASSWORD || ''
const viewports = (process.env.UI_WALK_VIEWPORTS || '1920x1080')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [w, h] = entry.toLowerCase().split('x').map((value) => Number.parseInt(value, 10))
    if (!w || !h) {
      throw new Error(`Invalid viewport entry: ${entry}`)
    }
    return { width: w, height: h, label: `${w}x${h}` }
  })

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function gotoWithRetry(page, url, options = {}, attempts = 2) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      await page.goto(url, { timeout: navTimeout, ...options })
      return
    } catch (error) {
      lastError = error
      await page.waitForTimeout(1200)
    }
  }
  throw lastError
}

function withDebug(baseUrl, route) {
  const url = new URL(route, baseUrl)
  if (debugEnabled) {
    url.searchParams.set('debug', '1')
  }
  return url.toString()
}

async function resolveBaseUrl(page) {
  for (const base of baseCandidates) {
    try {
      await gotoWithRetry(page, withDebug(base, '/login'), { waitUntil: 'domcontentloaded' })
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

async function ensureMode(page, mode) {
  if (mode === 'register') {
    const toggle = page.getByRole('button', { name: 'REQUEST ACCESS' })
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click()
    }
    return
  }
  const back = page.getByRole('button', { name: 'BACK TO LOGIN' })
  if (await back.isVisible().catch(() => false)) {
    await back.click()
  }
}

async function loginUser(page, user, pass) {
  await ensureMode(page, 'login')
  await page.getByPlaceholder('USER ID').fill(user)
  await page.getByPlaceholder('ACCESS KEY').fill(pass)
  await page.getByRole('button', { name: 'ENTRANCE' }).click()
  await page.waitForURL('**/dashboard', { timeout: 30_000 })
  return { user, pass }
}

async function capture(page, outputDir, name, options = {}) {
  const fileName = `${name}.png`
  const filePath = path.join(outputDir, fileName)
  await page.screenshot({ path: filePath, ...options })
  return fileName
}

async function runViewport(browser, baseUrl, viewport) {
  const viewportDir = path.resolve(
    process.cwd(),
    outputRoot,
    `${new Date().toISOString().replace(/[:.]/g, '-')}_${viewport.label}`,
  )
  await ensureDir(viewportDir)

  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: Number.isFinite(deviceScaleFactor) ? deviceScaleFactor : 1,
  })
  const page = await context.newPage()

  const results = []

  await gotoWithRetry(page, withDebug(baseUrl, '/login'), { waitUntil: 'domcontentloaded' })
  results.push({
    route: '/login',
    screenshot: await capture(page, viewportDir, 'login', { fullPage: true }),
  })

  let creds
  if (authMode === 'login' || (authMode === 'auto' && authUserEnv && authPassEnv)) {
    creds = await loginUser(page, authUserEnv, authPassEnv)
  } else {
    creds = await registerUser(page)
  }

  const mainRoutes = [
    { name: 'dashboard', route: '/dashboard' },
    { name: 'roadmap', route: '/dashboard/roadmap' },
    { name: 'axchat', route: '/dashboard/axchat' },
    { name: 'news', route: '/dashboard/news' },
  ]

  for (const entry of mainRoutes) {
    await gotoWithRetry(page, withDebug(baseUrl, entry.route), { waitUntil: 'networkidle' })
    results.push({
      route: entry.route,
      screenshot: await capture(page, viewportDir, entry.name, { fullPage: true }),
    })
  }

  await gotoWithRetry(page, withDebug(baseUrl, '/dashboard/content/all'), { waitUntil: 'networkidle' })
  await page.waitForSelector('.ax-content-list', { timeout: 30_000 })
  results.push({
    route: '/dashboard/content/all',
    screenshot: await capture(page, viewportDir, 'content', { fullPage: true }),
  })

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(600)
  results.push({
    route: '/dashboard/content/all#scroll',
    screenshot: await capture(page, viewportDir, 'content-scroll', { fullPage: false }),
  })

  await gotoWithRetry(page, withDebug(baseUrl, '/dashboard/content/read/LOC-ECHELON-CORE'), {
    waitUntil: 'networkidle',
  })
  results.push({
    route: '/dashboard/content/read/LOC-ECHELON-CORE',
    screenshot: await capture(page, viewportDir, 'content-read', { fullPage: true }),
  })

  await context.close()

  const report = {
    baseUrl,
    outputDir: viewportDir,
    viewport,
    debug: debugEnabled,
    deviceScaleFactor: Number.isFinite(deviceScaleFactor) ? deviceScaleFactor : 1,
    credentials: creds,
    pages: results,
  }
  const reportPath = path.join(viewportDir, 'report.json')
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(`[ui-walk] report saved to ${reportPath}`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const probeContext = await browser.newContext()
  const probePage = await probeContext.newPage()
  const baseUrl = await resolveBaseUrl(probePage)
  await probeContext.close()

  for (const viewport of viewports) {
    await runViewport(browser, baseUrl, viewport)
  }

  await browser.close()
}

main().catch((err) => {
  console.error('[ui-walk] failed', err)
  process.exit(1)
})
