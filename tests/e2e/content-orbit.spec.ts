import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { bootstrapSession, ensureSessionStorage, stubAuthApi, stubContentApi } from './utils'

async function ensureChronicleLoaded(page: Page) {
  const stage = page.locator('.ax-chronicle__stage')
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/dashboard/chronicle', { waitUntil: 'commit' })
    const loginHeading = page.getByRole('heading', { name: /welcome to axiom panel/i })
    const loginVisible = await loginHeading.isVisible({ timeout: 1500 }).catch(() => false)
    if (page.url().includes('/login') || loginVisible) {
      await ensureSessionStorage(page, { pins: [] })
      await page.goto('/dashboard/chronicle', { waitUntil: 'commit' })
    }
    try {
      await stage.waitFor({ state: 'visible', timeout: 45_000 })
      return
    } catch {
      // retry once
    }
  }
  await expect(stage).toBeVisible({ timeout: 60_000 })
}

test.describe('Chronicle orbit hub', () => {
  test('supports orbit drag/wheel + snap selecting updates active chapter', async ({ page }, testInfo) => {
    await stubAuthApi(page)
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await ensureChronicleLoaded(page)

    // Ensure selected chapter is materialized into URL.
    await expect.poll(() => page.url()).toMatch(/\bchapter=/)
    const initialUrl = new URL(page.url())
    const initialChapter = initialUrl.searchParams.get('chapter')
    expect(initialChapter).toBeTruthy()

    const orbit = page.getByRole('listbox', { name: 'Orbit view' })
    await expect(orbit).toBeVisible({ timeout: 60_000 })

    if (testInfo.project.name === 'firefox') {
      await orbit.hover()
      await page.mouse.wheel(0, 720)
    } else {
      const box = await orbit.boundingBox()
      expect(box).toBeTruthy()
      if (!box) return

      const startX = box.x + box.width * 0.5
      const startY = box.y + box.height * 0.5
      const endX = startX + 240

      await orbit.dispatchEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: startX,
        clientY: startY,
      })
      await orbit.dispatchEvent('pointermove', {
        pointerId: 1,
        pointerType: 'mouse',
        buttons: 1,
        clientX: endX,
        clientY: startY,
      })
      await orbit.dispatchEvent('pointerup', {
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: endX,
        clientY: startY,
      })
    }

    await orbit.press('ArrowRight')

    await expect
      .poll(() => new URL(page.url()).searchParams.get('chapter'), { timeout: 10_000 })
      .not.toBe(initialChapter)

    // Right panel should follow the selection.
    const selectedChapter = new URL(page.url()).searchParams.get('chapter')
    await expect(page.getByTestId('chronicle-active-slug')).toHaveText(selectedChapter ?? '')
  })

  test('uses reduced-motion fallback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await stubAuthApi(page)
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await ensureChronicleLoaded(page)

    await expect(page.getByText('Orbit disabled by Reduced Motion.')).toBeVisible()
  })
})
