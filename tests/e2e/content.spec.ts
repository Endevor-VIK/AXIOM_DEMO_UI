import { test, expect } from '@playwright/test'

import { bootstrapSession, stubContentApi } from './utils'

test.describe('Content hub flows', () => {
  test('supports selection, filters, pinning, reader navigation, and sandbox view', async ({ page }) => {
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await page.goto('/dashboard/content/all', { waitUntil: 'networkidle' })

    const list = page.getByRole('list', { name: 'Content items' })
    await expect(list).toBeVisible({ timeout: 60_000 })

    const items = list.getByRole('listitem')
    await expect(items.first()).toBeVisible({ timeout: 60_000 })

    await page.waitForSelector('[data-testid="content-select-CHR-VIKTOR-0301"]', {
      state: 'visible',
      timeout: 60_000,
    })
    const viktorButton = page.getByTestId('content-select-CHR-VIKTOR-0301')
    await expect(viktorButton).toBeVisible()
    await page.evaluate((testId) => {
      const button = document.querySelector(`[data-testid="${testId}"]`)
      if (!(button instanceof HTMLElement)) throw new Error(`Button ${testId} not found`)
      button.click()
    }, 'content-select-CHR-VIKTOR-0301')
    await expect(viktorButton).toHaveAttribute('aria-selected', 'true')

    const viktorPin = page.getByTestId('pin-toggle-CHR-VIKTOR-0301')
    await viktorPin.click()
    await expect(viktorPin).toHaveAttribute('aria-pressed', 'true')

    await page.waitForSelector('[data-testid="content-select-LOC-0001"]', {
      state: 'visible',
      timeout: 60_000,
    })
    const locationButton = page.getByTestId('content-select-LOC-0001')
    await expect(locationButton).toBeVisible()
    await page.evaluate((testId) => {
      const button = document.querySelector(`[data-testid="${testId}"]`)
      if (!(button instanceof HTMLElement)) throw new Error(`Button ${testId} not found`)
      button.click()
    }, 'content-select-LOC-0001')
    await expect(locationButton).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('button', { name: 'Expand' }).click()
    await expect(page).toHaveURL(/\/dashboard\/content\/read\/LOC-0001/)

    await page.evaluate(() => {
      const sandbox = Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.trim().toLowerCase().includes('sandbox'),
      )
      if (!(sandbox instanceof HTMLElement)) throw new Error('Sandbox button not found')
      sandbox.click()
    })
    await expect(page.locator('.ax-preview__iframe').first()).toBeVisible()

    await page.getByRole('button', { name: /Back/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/content\/all/)
    await expect(list.getByRole('listitem').first()).toBeVisible()

    const restoredViktorPin = page.getByTestId('pin-toggle-CHR-VIKTOR-0301')
    await expect(restoredViktorPin).toHaveAttribute('aria-pressed', 'true')
  })
})
