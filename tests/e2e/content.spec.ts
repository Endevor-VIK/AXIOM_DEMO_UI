import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { bootstrapSession, stubContentApi } from './utils'

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

test.describe('Content hub flows', () => {
  test('supports selection, filters, pinning, reader navigation, and sandbox view', async ({ page }) => {
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await page.goto('/dashboard/content/all', { waitUntil: 'networkidle' })

    const list = page.getByRole('list', { name: 'Content items' })
    await expect(list).toBeVisible({ timeout: 60_000 })

    const items = list.getByRole('listitem')
    await expect(items.first()).toBeVisible({ timeout: 60_000 })

    await clickTestId(page, 'content-select-CHR-VIKTOR-0301')
    const viktorButton = page.getByTestId('content-select-CHR-VIKTOR-0301')
    await expect(viktorButton).toHaveAttribute('aria-selected', 'true')

    await clickTestId(page, 'pin-toggle-CHR-VIKTOR-0301')
    const viktorPin = page.getByTestId('pin-toggle-CHR-VIKTOR-0301')
    await expect(viktorPin).toHaveAttribute('aria-pressed', 'true')

    await clickTestId(page, 'content-select-LOC-0001')
    const locationButton = page.getByTestId('content-select-LOC-0001')
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

    await page.evaluate(() => {
      const backButton = Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.trim().toLowerCase().includes('back'),
      )
      if (!(backButton instanceof HTMLElement)) {
        throw new Error('Back button not found')
      }
      backButton.click()
    })
    await expect(page).toHaveURL(/\/dashboard\/content\/all/)
    await expect(list.getByRole('listitem').first()).toBeVisible()

    const restoredViktorPin = page.getByTestId('pin-toggle-CHR-VIKTOR-0301')
    await expect(restoredViktorPin).toHaveAttribute('aria-pressed', 'true')
  })
})
