import { test, expect } from '@playwright/test'

import { bootstrapSession, stubContentApi } from './utils'

test.describe('Content hub flows', () => {
  test('supports selection, filters, pinning, reader navigation, and sandbox view', async ({ page }) => {
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await page.goto('/dashboard/content/all', { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    const listItems = page.locator('[data-testid^="content-card-"]')
    await expect(listItems.first()).toBeVisible({ timeout: 15000 })

    const searchInput = page.getByLabel('Search content')
    await searchInput.fill('VIKTOR')
    await expect(listItems.filter({ hasText: 'VIKTOR' })).toHaveCount(1)

    const viktorCard = page.getByTestId('content-card-CHR-VIKTOR-0301')
    const viktorOption = viktorCard.getByRole('option')
    await viktorOption.click()
    await expect(viktorOption).toHaveAttribute('aria-selected', 'true')

    const viktorPin = page.getByTestId('pin-toggle-CHR-VIKTOR-0301')
    await viktorPin.click()
    await expect(viktorCard).toHaveClass(/is-pinned/)

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(searchInput).toHaveValue('')
    await expect(listItems.first()).toBeVisible()

    const locationCard = page.getByTestId('content-card-LOC-0001')
    await locationCard.getByRole('option').click()
    await expect(locationCard.getByRole('option')).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('button', { name: 'Expand' }).click()
    await expect(page).toHaveURL(/\/dashboard\/content\/read\/LOC-0001/)

    await page.getByRole('button', { name: /Sandbox/i }).click()
    await expect(page.locator('.ax-preview__iframe').first()).toBeVisible()

    await page.getByRole('button', { name: /Back/i }).click()
    await expect(page).toHaveURL(/\/dashboard\/content\/all/)
    await expect(listItems.first()).toBeVisible()
    await expect(page.getByTestId('content-card-CHR-VIKTOR-0301')).toHaveClass(/is-pinned/)
  })
})
