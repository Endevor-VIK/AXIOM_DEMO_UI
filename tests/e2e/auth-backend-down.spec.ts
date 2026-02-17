import { expect, test } from '@playwright/test'

test.describe('Auth behavior when backend is unavailable', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
  })

  test('site login keeps page usable and shows network error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'commit' })

    const loginRoot = page.locator('section.ax-login:visible').first()
    await expect(loginRoot).toBeVisible({ timeout: 20_000 })
    await expect(loginRoot).toHaveAttribute('data-boot', 'ready', { timeout: 20_000 })

    const siteUser = page.getByPlaceholder('USER ID')
    const sitePass = page.getByPlaceholder('ACCESS KEY')
    await expect(siteUser).toHaveValue('')
    await expect(sitePass).toHaveValue('')

    await siteUser.fill('creator')
    await sitePass.fill('axiom')
    await page.getByRole('button', { name: 'ENTRANCE' }).click()

    const error = page.locator('.ax-login-error')
    await expect(error).toBeVisible({ timeout: 15_000 })
    await expect(error).toContainText(/request_failed|failed to fetch|network|unable/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin login keeps page usable and shows backend unavailable error', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Admin Sign In' })).toBeVisible()
    const adminUser = page.getByLabel('Username')
    const adminPass = page.getByLabel('Password')
    await expect(adminUser).toHaveValue('')
    await expect(adminPass).toHaveValue('')

    await adminUser.fill('creator')
    await adminPass.fill('axiom')
    await page.getByRole('button', { name: 'Sign In' }).click()

    const error = page.locator('.ax-admin-login__error')
    await expect(error).toBeVisible({ timeout: 10_000 })
    await expect(error).toContainText('Login failed. Please try again.')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
