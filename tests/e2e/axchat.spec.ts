import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const API_PORT = Number(process.env.AX_API_PORT || 8787)
const API_BASE = `http://127.0.0.1:${API_PORT}`
const UI_PORT = Number(process.env.PLAYWRIGHT_PORT || 4173)
const UI_HOST = process.env.PLAYWRIGHT_HOST || '127.0.0.1'
const UI_BASE = process.env.PLAYWRIGHT_BASE_URL || `http://${UI_HOST}:${UI_PORT}`

const USER_EMAIL = process.env.AX_USER_EMAIL || 'user@local'
const USER_PASS = process.env.AX_USER_PASSWORD || 'user12345'
const TEST_EMAIL = process.env.AX_TEST_EMAIL || 'test@local'
const TEST_PASS = process.env.AX_TEST_PASSWORD || 'test12345'
const CREATOR_EMAIL = process.env.AX_CREATOR_EMAIL || 'creator@local'
const CREATOR_PASS = process.env.AX_CREATOR_PASSWORD || 'creator12345'

const stubRefs = [
  {
    title: 'LIZA · PROFILE',
    path: 'content-src/03.02_LIZA.md',
    route: '/api/axchat/file?path=content-src/03.02_LIZA.md',
    excerpt: 'Лиза — оперативный координатор Axiom. Ключевые роли и решения описаны в файле.',
    score: 0.12,
  },
  {
    title: 'Empty Stub',
    path: 'docs/empty.md',
    route: '',
    excerpt: '',
    score: 0.55,
  },
]

async function stubGoogleFonts(page: Page) {
  await page.route('**/fonts.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/css; charset=utf-8',
      body: '/* stub fonts */',
    })
  })
  await page.route('**/fonts.gstatic.com/**', async (route) => {
    await route.fulfill({ status: 204, body: '' })
  })
}

async function login(page: Page, email: string, password: string) {
  const res = await page.request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  })
  if (!res.ok()) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(`login_failed:${payload?.error || res.status()}`)
  }

  const setCookie = res.headers()['set-cookie']
  if (!setCookie) throw new Error('login_failed:no_set_cookie')
  const token = /ax_session=([^;]+)/.exec(setCookie)?.[1]
  if (!token) throw new Error('login_failed:no_session_cookie')
  await page.context().addCookies([
    { name: 'ax_session', value: token, url: UI_BASE },
  ])
}

async function registerIfNeeded(page: Page, email: string, password: string) {
  const res = await page.request.post(`${API_BASE}/api/auth/register`, {
    data: { email, password, displayName: email.toUpperCase() },
  })
  if (res.ok()) {
    const setCookie = res.headers()['set-cookie']
    if (setCookie) {
      const token = /ax_session=([^;]+)/.exec(setCookie)?.[1]
      if (token) {
        await page.context().addCookies([
          { name: 'ax_session', value: token, url: UI_BASE },
        ])
      }
    }
    return
  }
  const payload = await res.json().catch(() => ({}))
  if (payload?.error === 'user_exists') {
    await login(page, email, password)
    return
  }
  throw new Error(`register_failed:${payload?.error || res.status()}`)
}

async function stubAxchatApi(page: Page) {
  await page.route('**/api/axchat/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model: { name: 'mock-ollama', online: true },
        index: { ok: true, indexed_at: '2026-02-10T00:00:00Z', version: 'fts5-v1' },
      }),
    })
  })

  await page.route('**/api/axchat/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ refs: stubRefs }),
    })
  })

  await page.route('**/api/axchat/query', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        answer_markdown: 'Ответ: Лиза — координатор Axiom. См. источники ниже.',
        refs: stubRefs,
      }),
    })
  })

  await page.route('**/api/axchat/file?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'Stub file content for AXCHAT tests.',
    })
  })
}

test.describe('AXCHAT access control', () => {
  test.describe.configure({ timeout: 120_000 })

  test('user sees tab and gets ACCESS LOCKED', async ({ page }) => {
    await stubGoogleFonts(page)
    await registerIfNeeded(page, USER_EMAIL, USER_PASS)

    await page.route('**/api/axchat/**', async () => {
      throw new Error('AXCHAT API should not be called for user role')
    })

    await page.goto('/dashboard/axchat', { waitUntil: 'commit' })
    await expect(page.getByRole('link', { name: 'AXCHAT' })).toBeVisible()
    await expect(page.getByText(/access locked/i)).toBeVisible()
  })
})

test.describe('AXCHAT full access', () => {
  test.describe.configure({ timeout: 120_000 })

  test('test role: QA + Search flows', async ({ page, context }) => {
    await stubGoogleFonts(page)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await login(page, TEST_EMAIL, TEST_PASS)
    await stubAxchatApi(page)

    await page.goto('/dashboard/axchat', { waitUntil: 'commit' })
    await expect(page.locator('.ax-axchat')).toBeVisible()
    await expect(page.locator('.ax-axchat__status-item', { hasText: 'MODEL' })).toContainText('ONLINE')
    await expect(page.locator('.ax-axchat__status-item', { hasText: 'INDEX' })).toContainText('ONLINE')

    await page.getByPlaceholder('Спроси по базе (RU)…').fill('Кто такая Лиза?')
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.locator('.ax-axchat__message-body').last()).toContainText('Лиза')
    await expect(page.getByText('content-src/03.02_LIZA.md')).toBeVisible()

    const modalButton = page.getByRole('button', { name: 'Открыть в модалке' }).first()
    await modalButton.click()
    await expect(page.locator('.ax-modal__panel').getByText('Лиза — оперативный координатор', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: /close dialog/i }).click().catch(() => null)

    const openButton = page.getByRole('link', { name: 'Открыть' }).first()
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      openButton.click(),
    ])
    await expect(popup).toHaveURL(/api\/axchat\/file\?path=content-src\/03\.02_LIZA\.md/)
    await popup.close()

    const copyButton = page.getByRole('button', { name: 'Скопировать путь' }).first()
    await copyButton.click()

    await page.getByRole('button', { name: 'SEARCH' }).click()
    await page.getByPlaceholder('Спроси по базе (RU)…').fill('Nexus')
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.getByText('Поиск завершен', { exact: false })).toBeVisible()

    const emptyCard = page.locator('.ax-axchat__source', { hasText: 'docs/empty.md' })
    await expect(emptyCard.getByRole('link', { name: 'Открыть' })).toHaveCount(0)
    await expect(emptyCard.getByRole('button', { name: 'Открыть в модалке' })).toHaveCount(0)
  })

  test('creator role: UI status + screenshots', async ({ page }, testInfo) => {
    await stubGoogleFonts(page)
    await login(page, CREATOR_EMAIL, CREATOR_PASS)
    await stubAxchatApi(page)

    await page.goto('/dashboard/axchat', { waitUntil: 'commit' })
    await expect(page.locator('.ax-axchat')).toBeVisible()

    await page.screenshot({ path: testInfo.outputPath('axchat-desktop.png') })
  })

  test('creator role mobile snapshot', async ({ page }, testInfo) => {
    await stubGoogleFonts(page)
    await login(page, CREATOR_EMAIL, CREATOR_PASS)
    await stubAxchatApi(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard/axchat', { waitUntil: 'commit' })
    await expect(page.locator('.ax-axchat')).toBeVisible()

    await page.screenshot({ path: testInfo.outputPath('axchat-mobile.png') })
  })
})
