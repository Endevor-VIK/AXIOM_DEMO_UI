import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const HOST = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`
const USE_EXISTING_SERVER = process.env.PLAYWRIGHT_USE_EXISTING_SERVER === '1'
const WEB_SERVER = USE_EXISTING_SERVER
  ? undefined
  : {
      command: `npm run dev -- --host ${HOST} --port ${PORT}`,
      url: `${BASE_URL}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    }

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    storageState: 'tests/e2e/storageState.json',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1400, height: 900 },
  },
  webServer: WEB_SERVER,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
})
