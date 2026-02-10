import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { bootstrapSession, stubAuthApi, stubContentApi } from './utils'

type ViewportSpec = { label: string; width: number; height: number }

const viewports: ViewportSpec[] = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1600x900', width: 1600, height: 900 },
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1366x768', width: 1366, height: 768 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '834x1112', width: 834, height: 1112 },
  { label: '375x667', width: 375, height: 667 },
  { label: '390x844', width: 390, height: 844 },
  { label: '412x915', width: 412, height: 915 },
  { label: '360x800', width: 360, height: 800 },
]

async function waitForNewsPage(page: Page) {
  const hero = page.locator('.ax-signal-hero')
  await hero.waitFor({ state: 'visible', timeout: 30_000 })
  return hero
}

async function assertNoHorizontalScroll(page: Page, label: string) {
  const ok = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth <= el.clientWidth + 1
  })
  if (!ok) {
    throw new Error(`Horizontal overflow detected at ${label}`)
  }
}

async function assertHeroLayout(page: Page) {
  const hero = page.locator('.ax-signal-hero')
  const side = page.locator('.ax-signal-hero__side')
  await expect(hero).toBeVisible()
  await expect(side).toBeVisible()
  const heroBox = await hero.boundingBox()
  const sideBox = await side.boundingBox()
  expect(heroBox).not.toBeNull()
  expect(sideBox).not.toBeNull()
  if (heroBox && sideBox) {
    expect(sideBox.x + sideBox.width).toBeLessThanOrEqual(heroBox.x + heroBox.width + 2)
    expect(sideBox.y + sideBox.height).toBeLessThanOrEqual(heroBox.y + heroBox.height + 2)
  }
}

async function assertFilterBar(page: Page) {
  const search = page.locator('#news-search')
  await expect(search).toBeVisible()
  await search.fill('axiom')
  const clearButton = page.locator('.ax-news-bar__clear')
  await expect(clearButton).toBeVisible()
  await clearButton.click()

  const pageChip = page.locator('.ax-news-bar__pill').filter({ hasText: 'PAGE' })
  await expect(pageChip).toBeVisible()

  const nextButton = page.locator('.ax-news-bar__btn').filter({ hasText: 'Next' })
  const prevButton = page.locator('.ax-news-bar__btn').filter({ hasText: 'Prev' })
  await expect(nextButton).toBeVisible()
  await expect(prevButton).toBeVisible()
  if (!(await nextButton.isDisabled())) {
    await nextButton.click({ trial: true })
  }
  if (!(await prevButton.isDisabled())) {
    await prevButton.click({ trial: true })
  }

  await expect(page.locator('#news-kind')).toBeVisible()
  await expect(page.locator('#news-sort')).toBeVisible()
  await expect(page.locator('#news-size')).toBeVisible()
}

async function assertCards(page: Page) {
  const cards = page.locator('.ax-news-card')
  await expect(cards.first()).toBeVisible()
  const summary = cards.first().locator('.ax-news-card__summary')
  if (await summary.count()) {
    await expect(summary.first()).toBeVisible()
  }
  const action = page.locator('.ax-news-card__action')
  if (await action.count()) {
    await expect(action.first()).toBeVisible()
  }
}

test.describe('News responsive matrix', () => {
  test('NEWS layout holds across viewports', async ({ page }) => {
    test.setTimeout(180_000)
    await stubAuthApi(page)
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await page.goto('/dashboard/news', { waitUntil: 'domcontentloaded' })
    await waitForNewsPage(page)

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(200)

      await assertNoHorizontalScroll(page, viewport.label)
      await assertHeroLayout(page)
      await assertFilterBar(page)
      await assertCards(page)
    }
  })
})
