import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { bootstrapSession, ensureSessionStorage, stubAuthApi, stubContentApi } from './utils'

async function clickTestId(page: Page, testId: string): Promise<void> {
  await page.waitForFunction(
    (id) => {
      const element = document.querySelector(`[data-testid="${id}"]`)
      return !!element && element instanceof HTMLElement
    },
    testId,
    { timeout: 60_000 },
  )
  await page.evaluate((id) => {
    const element = document.querySelector(`[data-testid="${id}"]`)
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Test id ${id} not found`)
    }
    element.click()
  }, testId)
}

async function ensureContentList(page: Page) {
  const list = page.locator('.ax-content-list')
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/dashboard/content/all', { waitUntil: 'commit' })
    const loginHeading = page.getByRole('heading', { name: /welcome to axiom panel/i })
    const loginVisible = await loginHeading.isVisible({ timeout: 1500 }).catch(() => false)
    if (page.url().includes('/login') || loginVisible) {
      await ensureSessionStorage(page, { pins: [] })
      await page.goto('/dashboard/content/all', { waitUntil: 'commit' })
    }
    try {
      await list.waitFor({ state: 'visible', timeout: 45_000 })
      return list
    } catch {
      // retry once
    }
  }
  await expect(list).toBeVisible({ timeout: 60_000 })
  return list
}

test.describe('Content hub flows', () => {
  test('supports selection, pinning, reader navigation, and images load', async ({ page }) => {
    if (process.env.PLAYWRIGHT_AUTH_DEBUG === '1') {
      page.on('request', (req) => {
        if (req.url().includes('/api/auth/')) {
          console.log('[auth request]', req.method(), req.url())
        }
      })
      page.on('response', (res) => {
        if (res.url().includes('/api/auth/')) {
          console.log('[auth response]', res.status(), res.url())
        }
      })
    }
    await stubAuthApi(page)
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    const list = await ensureContentList(page)

    const items = list.getByRole('listitem')
    await expect(items.first()).toBeVisible({ timeout: 60_000 })

    await clickTestId(page, 'content-select-CHR-VIKTOR-0301')
    const viktorButton = page.getByTestId('content-select-CHR-VIKTOR-0301')
    await expect(viktorButton).toHaveAttribute('aria-selected', 'true')

    await clickTestId(page, 'pin-toggle-CHR-VIKTOR-0301')
    const viktorPin = page.getByTestId('pin-toggle-CHR-VIKTOR-0301')
    await expect(viktorPin).toHaveAttribute('aria-pressed', 'true')

    const previewImage = page.locator('.axcp-media img').first()
    await expect(previewImage).toBeVisible({ timeout: 60_000 })
    const previewLoaded = await previewImage.evaluate((img) => {
      if (!(img instanceof HTMLImageElement)) return false
      return img.complete && img.naturalWidth > 0
    })
    expect(previewLoaded).toBe(true)

    await Promise.all([
      page.waitForURL(/\/content\/(CHR-VIKTOR-0301|03\.01_VIKTOR)(\?|$)/),
      page.getByRole('button', { name: 'Open source' }).click(),
    ])
    await page.waitForLoadState('domcontentloaded')

    await page.waitForSelector('img.axv-img', { state: 'attached', timeout: 60_000 })
    await expect.poll(
      async () =>
        page.evaluate(() => {
          const img = document.querySelector('img.axv-img') as HTMLImageElement | null
          if (!img) return false
          img.scrollIntoView({ block: 'center', inline: 'center' })
          return img.complete && img.naturalWidth > 0
        }),
      { timeout: 10_000 },
    ).toBe(true)

    await page.getByRole('button', { name: 'Content' }).click()
    await expect(page).toHaveURL(/\/dashboard\/content(\/all)?/)
    await expect(list.getByRole('listitem').first()).toBeVisible()

    const restoredViktorPin = page.getByTestId('pin-toggle-CHR-VIKTOR-0301')
    await expect(restoredViktorPin).toHaveAttribute('aria-pressed', 'true')
  })
})
