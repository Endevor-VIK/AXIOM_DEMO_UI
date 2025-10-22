import { test, expect } from '@playwright/test'
import axe, { type AxeResults, type NodeResult } from 'axe-core'

import { bootstrapSession, stubContentApi } from './utils'

type AxeViolationSummary = {
  id: string
  impact: string | null
  targets: string[][]
}

declare global {
  interface Window {
    axe: typeof axe
  }
}

test.describe("Accessibility", () => {
  test("content dashboard has no axe violations", async ({ page }) => {
    page.setDefaultTimeout(120000)
    await stubContentApi(page)
    await bootstrapSession(page)
    await page.addInitScript({ content: axe.source })

    page.on('console', (msg) => {
      console.log('[console]', msg.type(), msg.text())
    })

    await page.goto('/dashboard/content/all', { waitUntil: 'domcontentloaded' })
    const cards = page.locator('[data-testid^="content-card-"]')
    await expect(cards.first()).toBeVisible({ timeout: 60_000 })
    const cardCount = await cards.count()
    console.log('[axe-test] card count', cardCount)
    const violations = await page.evaluate<AxeViolationSummary[]>(async () => {
      const axe = (window as any).axe
      if (!axe) {
        throw new Error('axe not injected')
      }
      const context =
        document.querySelector('.ax-content-list') ??
        document.querySelector('.ax-content-hub') ??
        document.body
      const ruleGroups: Array<ReadonlyArray<string>> = [
        ['aria-required-children'],
        ['aria-required-parent'],
      ]
      const aggregated: AxeViolationSummary[] = []
      for (const rules of ruleGroups) {
        const output: AxeResults = await axe.run(context, {
          runOnly: { type: 'rule', values: Array.from(rules) },
          iframes: false,
          resultTypes: ['violations'],
          include: [['.ax-content-list']],
        })
        aggregated.push(
          ...output.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact ?? null,
            targets: violation.nodes.map((node: NodeResult) => node.target as string[]),
          })),
        )
      }
      return aggregated
    })

    if (violations.length) {
      console.log(
        'axe violations',
        violations.slice(0, 10),
      )
    }

    expect(violations, violations.map((violation) => violation.id).join(', ')).toEqual([])
  })
})

export {}

