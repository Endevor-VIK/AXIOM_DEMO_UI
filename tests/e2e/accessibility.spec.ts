import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

import { bootstrapSession, stubContentApi } from './utils'

test.describe('Accessibility', () => {
  test('content dashboard has no axe violations', async ({ page }) => {
    page.setDefaultTimeout(120000)
    await stubContentApi(page)
    await bootstrapSession(page)

    page.on('console', (msg) => {
      console.log('[console]', msg.type(), msg.text())
    })

    await page.goto('/dashboard/content/all', { waitUntil: 'networkidle' })
    console.log('[debug] current URL', page.url())
    await page.waitForTimeout(1000)
    console.log(
      '[debug] card present?',
      await page.evaluate(() => !!document.querySelector('[data-testid^="content-card-"]')),
    )
    await expect(page.locator('[data-testid^="content-card-"]').first()).toBeVisible({ timeout: 15000 })

    const results = await new AxeBuilder({ page })
      .include('.ax-content-hub')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    if (results.violations.length) {
      console.log(
        'axe violations',
        results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          targets: violation.nodes.slice(0, 5).map((node) => node.target),
        })),
      )
    }

    expect(results.violations, results.violations.map((violation) => violation.id).join(', ')).toEqual([])
  })
})
