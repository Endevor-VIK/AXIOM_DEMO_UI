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
  const signal = page.getByTestId('signal-center')
  await signal.waitFor({ state: 'visible', timeout: 30_000 })
  return signal
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

async function assertHeaderBlocks(page: Page) {
  await expect(page.locator('.ax-news-pillar')).toBeVisible()
  await expect(page.getByTestId('signal-center')).toBeVisible()
  await expect(page.locator('.ax-signal-center__tabs')).toBeVisible()
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

  const drawerToggle = page.locator('.ax-news-bar__btn').filter({ hasText: 'Filters' })
  await expect(drawerToggle).toBeVisible()
  await drawerToggle.click({ force: true })
  await page.waitForTimeout(120)
  const drawerVisible = await page
    .locator('.ax-news-drawer')
    .first()
    .isVisible()
    .catch(() => false)
  if (drawerVisible) {
    await drawerToggle.click({ force: true })
  }

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

async function assertFeed(page: Page) {
  const feed = page.locator('.ax-news-feed')
  await expect(feed).toBeVisible()

  const anyRow = feed.locator('.ax-news-row').first().or(page.locator('.ax-news-empty'))
  await expect(anyRow).toBeVisible()
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
      await assertHeaderBlocks(page)
      await assertFilterBar(page)
      await assertFeed(page)
    }
  })
})

test.describe('News master-detail flow', () => {
  test('Selection + autoplay + pinning stay in sync', async ({ page }) => {
    test.setTimeout(120_000)
    await stubAuthApi(page)
    await stubContentApi(page)
    await bootstrapSession(page, { pins: [] })

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard/news?autoplay=2', { waitUntil: 'domcontentloaded' })
    await waitForNewsPage(page)

    const feed = page.getByRole('listbox', { name: 'News feed' })
    const rows = feed.getByRole('option')
    await expect(rows.first()).toBeVisible()

    const pickedTitleRaw = await rows.first().locator('.ax-news-row__title').textContent()
    const pickedTitle = (pickedTitleRaw ?? '').trim()
    await rows.first().click()

    if (pickedTitle) {
      await expect(page.getByTestId('signal-center').locator('.ax-signal-hero__headline')).toContainText(pickedTitle)
    }

    const signalCenter = page.getByTestId('signal-center')
    const autoButton = signalCenter.getByRole('button', { name: 'AUTO' })
    await expect(autoButton).toHaveAttribute('data-active', 'true')

    const beforeAutoTitle = ((await signalCenter.locator('.ax-signal-hero__headline').textContent()) ?? '').trim()
    await page.waitForTimeout(4600)
    const afterAutoTitle = ((await signalCenter.locator('.ax-signal-hero__headline').textContent()) ?? '').trim()
    expect(afterAutoTitle).not.toBe(beforeAutoTitle)

    await signalCenter.getByRole('tab', { name: 'LINKS' }).click()
    const pinButton = signalCenter.getByRole('button', { name: 'PIN' })
    await pinButton.click()
    await expect(signalCenter.getByRole('button', { name: 'UNPIN' })).toBeVisible()

    await page.getByRole('button', { name: 'PINNED ONLY' }).click()
    await expect(page.getByRole('button', { name: 'PINNED ONLY' })).toHaveAttribute('data-active', 'true')

    const pinnedRows = feed.getByRole('option')
    await expect(pinnedRows.first()).toBeVisible()
    const allPinned = await pinnedRows.evaluateAll((nodes) =>
      nodes.every((node) => node.getAttribute('data-pinned') === 'true')
    )
    expect(allPinned).toBe(true)
  })
})
