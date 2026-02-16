import { test, expect } from '@playwright/test'
import { bootstrapSession, stubContentApi } from './utils'

test.describe('AXCHAT ghpages guard', () => {
  test('shows hold banner and does not call AXCHAT API in ghpages mode', async ({ page }) => {
    let axchatCalls = 0
    await page.route('**/api/axchat/**', async (route) => {
      axchatCalls += 1
      await route.continue()
    })

    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await page.goto('/dashboard/axchat', { waitUntil: 'commit' })
    await expect(page.getByText('AXCHAT закрыт')).toBeVisible()
    await expect(
      page.getByText('GitHub Pages не поддерживает серверный инференс. Раздел доступен только локально.'),
    ).toBeVisible()
    await expect(page.locator('.ax-axchat')).toHaveCount(0)
    await expect.poll(() => axchatCalls).toBe(0)
  })
})
