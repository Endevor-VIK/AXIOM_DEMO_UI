import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { bootstrapSession, ensureSessionStorage, stubAuthApi, stubContentApi } from './utils'

async function ensureContentLoaded(page: Page) {
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
      return
    } catch {
      // retry once
    }
  }
  await expect(list).toBeVisible({ timeout: 60_000 })
}

test.describe('Content orbit view', () => {
  test('supports orbit drag/wheel + snap selecting updates details', async ({ page }, testInfo) => {
    await stubAuthApi(page)
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await ensureContentLoaded(page)

    // Ensure selected item is materialized into URL.
    await expect.poll(() => page.url()).toMatch(/\bitem=/)
    const initialUrl = new URL(page.url())
    const initialItem = initialUrl.searchParams.get('item')
    expect(initialItem).toBeTruthy()

    await page.getByRole('button', { name: 'Orbit' }).click()

    const orbit = page.getByRole('listbox', { name: 'Orbit view' })
    await expect(orbit).toBeVisible({ timeout: 60_000 })

    const box = await orbit.boundingBox()
    expect(box).toBeTruthy()
    if (!box) return

    const startX = box.x + box.width * 0.5
    const startY = box.y + box.height * 0.5
    const endX = startX + 240

    if (testInfo.project.name === 'firefox') {
      await page.mouse.move(startX, startY)
      await page.mouse.wheel(0, 720)
    } else {
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

    await expect
      .poll(() => new URL(page.url()).searchParams.get('item'), { timeout: 10_000 })
      .not.toBe(initialItem)

    // Details should follow the selection.
    await page.getByRole('tab', { name: 'Meta' }).click()
    const selectedItem = new URL(page.url()).searchParams.get('item')
    await expect(page.getByTestId('content-details-id')).toHaveText(selectedItem ?? '')
  })

  test('uses reduced-motion fallback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await stubAuthApi(page)
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await ensureContentLoaded(page)

    await page.getByRole('button', { name: 'Orbit' }).click()
    await expect(page.getByText('Orbit disabled by Reduced Motion.')).toBeVisible()
  })
})
