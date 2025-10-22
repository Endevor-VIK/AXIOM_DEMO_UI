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
    const contentManifests = [
      '/data/content/manifest.json',
      '/data/content/locations/manifest.json',
      '/data/content/characters/manifest.json',
      '/data/content/technologies/manifest.json',
      '/data/content/factions/manifest.json',
      '/data/content/events/manifest.json',
    ]
    await Promise.all(
      contentManifests.map((needle) =>
        page.waitForResponse(
          (response) => response.url().includes(needle) && response.ok(),
          { timeout: 60_000 },
        ),
      ),
    )

    const cardLocator = page.locator('[data-testid^="content-card-"]')
    const cardCount = await cardLocator.count()
    console.log('[axe-test] card count', cardCount)
    await expect(cardLocator.first()).toBeVisible({ timeout: 15000 })

    const violations = await page.evaluate<AxeViolationSummary[]>(async () => {
      const axe = (window as any).axe
      if (!axe) {
        throw new Error('axe not injected')
      }
      const context = document.querySelector('.ax-content-hub') ?? document.body
      const AXE_TIMEOUT_MS = 45_000
      const runPromise: Promise<AxeViolationSummary[]> = axe
        .run(context, {
          runOnly: {
            type: 'rule',
            values: ['aria-required-children', 'aria-required-parent', 'color-contrast'],
          },
          iframes: false,
          resultTypes: ['violations'],
        })
        .then((output: AxeResults) =>
          output.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact ?? null,
            targets: violation.nodes.map((node: NodeResult) => node.target as string[]),
          })),
        )
      const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`axe timeout after ${AXE_TIMEOUT_MS}ms`)), AXE_TIMEOUT_MS),
        )
      return Promise.race([runPromise, timeoutPromise])
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

