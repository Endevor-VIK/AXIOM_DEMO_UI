import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const AUDIO_URL_RE = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i
const BOOT_READY_TIMEOUT_MS = 30_000

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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test.describe('Login boot sequence', () => {
  test.describe.configure({ timeout: 120_000 })

  test('shows boot loader then transitions to ready without audio assets', async ({ page }) => {
    await stubGoogleFonts(page)
    const audioRequests: string[] = []
    page.on('request', (request) => {
      if (AUDIO_URL_RE.test(request.url())) audioRequests.push(request.url())
    })

    await page.goto('/login', { waitUntil: 'commit' })
    const loginRoot = page.locator('section.ax-login:visible').first()
    const loginForm = loginRoot.locator('form.ax-login-card')

    await expect(page.locator('.ax-boot:visible')).toBeVisible()
    await expect(loginRoot).toHaveAttribute('data-boot', 'ready', { timeout: BOOT_READY_TIMEOUT_MS })
    await expect(page.locator('.ax-boot:visible')).toHaveCount(0)
    await expect(loginForm).not.toHaveAttribute('aria-hidden', 'true')
    await expect(loginRoot).toBeVisible()
    const finalOrion = await loginRoot.getAttribute('data-orion')
    const finalFallback = await loginRoot.getAttribute('data-boot-fallback')
    expect(
      finalOrion === 'ready' || finalFallback === 'watchdog' || finalFallback === 'orion-error',
    ).toBeTruthy()
    await expect(page.locator('audio, video')).toHaveCount(0)
    expect(audioRequests).toEqual([])
  })

  test('keeps boot gate until Orion level asset is loaded', async ({ page }) => {
    await stubGoogleFonts(page)
    await page.route('**/assets/orion/original/high/level.glb**', async (route) => {
      await wait(6000)
      await route.continue()
    })

    await page.goto('/login', { waitUntil: 'commit' })
    const loginRoot = page.locator('section.ax-login:visible').first()

    await page.waitForTimeout(4200)
    await expect(loginRoot).toHaveAttribute('data-boot', /(booting|reveal)/)
    await expect(loginRoot).toHaveAttribute('data-orion', 'loading')
    await expect(page.locator('.ax-boot:visible')).toBeVisible()
    await expect(loginRoot).not.toHaveAttribute('data-boot-fallback', 'watchdog')

    await expect(loginRoot).toHaveAttribute('data-boot', 'ready', { timeout: BOOT_READY_TIMEOUT_MS })
    const finalOrion = await loginRoot.getAttribute('data-orion')
    const finalFallback = await loginRoot.getAttribute('data-boot-fallback')
    expect(
      finalOrion === 'ready' || finalFallback === 'watchdog' || finalFallback === 'orion-error',
    ).toBeTruthy()
  })

  test('restarts boot sequence on repeated login entry', async ({ page }) => {
    await stubGoogleFonts(page)
    const loginRoot = page.locator('section.ax-login:visible').first()

    await page.goto('/login', { waitUntil: 'commit' })
    await expect(page.locator('.ax-boot:visible')).toBeVisible()
    await expect(loginRoot).toHaveAttribute('data-boot', 'ready', { timeout: BOOT_READY_TIMEOUT_MS })
    expect(await loginRoot.getAttribute('data-orion')).toMatch(/^(ready|loading)$/)

    await page.goto('/login?again=1', { waitUntil: 'commit' })
    await expect(page.locator('.ax-boot:visible')).toBeVisible()
    await expect(loginRoot).toHaveAttribute('data-boot', 'ready', { timeout: BOOT_READY_TIMEOUT_MS })
    expect(await loginRoot.getAttribute('data-orion')).toMatch(/^(ready|loading)$/)
    await expect(loginRoot).toBeVisible()
  })

  test('respects prefers-reduced-motion path', async ({ page }) => {
    await stubGoogleFonts(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })

    await page.goto('/login', { waitUntil: 'commit' })
    const loginRoot = page.locator('section.ax-login:visible')

    await expect(page.locator('.ax-boot.is-reduced:visible')).toBeVisible()
    await expect(page.locator('.ax-boot:visible')).toHaveCount(0, { timeout: 3_000 })
    await expect(loginRoot).toBeVisible()
  })
})
