import { test, expect } from "@playwright/test"
import axe from "axe-core"

import { bootstrapSession, stubContentApi } from "./utils"

test.describe("Accessibility", () => {
  test("content dashboard has no axe violations", async ({ page }) => {
    page.setDefaultTimeout(120000)
    await stubContentApi(page)
    await bootstrapSession(page)

    page.on('console', (msg) => {
      console.log('[console]', msg.type(), msg.text())
    })

    await page.goto('/dashboard/content/all', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.waitForFunction(
      () => {
        const nodes = Array.from(document.querySelectorAll('[data-testid^="content-card-"]'))
        return nodes.length > 0 && nodes.some((node) => node instanceof HTMLElement && node.offsetParent !== null)
      },
      { timeout: 60000 },
    )
    await expect(page.locator('[data-testid^="content-card-"]').first()).toBeVisible({ timeout: 15000 })

    await page.evaluate((source: string) => {
      const script = document.createElement('script')
      script.textContent = source
      document.head.appendChild(script)
    }, axe.source)
    const results = await page.evaluate(async () => {
      if (!('axe' in window)) {
        throw new Error('axe not injected')
      }
      const context = document.querySelector('.ax-content-hub') ?? document.body
      const output = await window.axe.run(context, {
        runOnly: {
          type: 'rule',
          values: ['aria-required-children', 'aria-required-parent', 'color-contrast'],
        },
        iframes: false,
        resultTypes: ['violations'],
      })
      return { violations: output.violations }
    })

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

