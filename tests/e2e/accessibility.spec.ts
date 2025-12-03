import { test, expect } from '@playwright/test'
import axe from 'axe-core'

import { bootstrapSession, stubContentApi } from './utils'

test.describe('Accessibility', () => {
  test('content dashboard has no axe violations', async ({ page }, testInfo) => {
    test.setTimeout(180_000)
    page.setDefaultTimeout(120_000)
    await stubContentApi(page)
    await bootstrapSession(page)
    await page.addInitScript({ content: axe.source })

    await page.goto('/dashboard/content/all', { waitUntil: 'domcontentloaded' })

    await page.waitForFunction(
      () => document.querySelectorAll('.ax-content-list [role="listitem"]').length > 0,
      { timeout: 60_000 },
    )

    const list = page.getByRole('list', { name: 'Content items' })
    await expect(list).toBeVisible({ timeout: 60_000 })
    await expect(list.getByRole('listitem').first()).toBeVisible({ timeout: 60_000 })

    const rules = ['aria-required-children', 'aria-required-parent', 'nested-interactive']
    const results = await page.evaluate(async (selectedRules) => {
      const axeRuntime = (window as unknown as { axe?: typeof axe }).axe
      if (!axeRuntime) {
        throw new Error('axe not available on window')
      }
      const context = document.querySelector('.ax-content-list')
      if (!context) {
        throw new Error('content list not found')
      }
      const output = await axeRuntime.run(
        context,
        {
          iframes: false,
          runOnly: { type: 'rule', values: selectedRules },
        },
      )
      return {
        violations: output.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact ?? null,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          targets: violation.nodes.map((node) => node.target),
        })),
      }
    }, rules)

    if (results.violations.length) {
      await testInfo.attach('axe-violations', {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      })
    }

    expect(results.violations, results.violations.map((violation) => violation.id).join(', ')).toEqual(
      [],
    )
  })
})

export {}
