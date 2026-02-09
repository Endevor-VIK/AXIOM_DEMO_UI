import { defineConfig, devices } from '@playwright/test'
import { spawnSync } from 'node:child_process'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const HOST = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`
const USE_EXISTING_SERVER_RAW = process.env.PLAYWRIGHT_USE_EXISTING_SERVER

function isServerReachable(url: string): boolean {
  try {
    const probe = `
      const http = require('http')
      const https = require('https')
      const { URL } = require('url')
      const target = new URL(${JSON.stringify(url)})
      const lib = target.protocol === 'https:' ? https : http
      const req = lib.request(
        {
          method: 'HEAD',
          hostname: target.hostname,
          port: target.port || (target.protocol === 'https:' ? 443 : 80),
          path: target.pathname || '/',
        },
        (res) => {
          process.exit(res.statusCode && res.statusCode < 500 ? 0 : 1)
        },
      )
      req.setTimeout(800, () => {
        req.destroy()
        process.exit(1)
      })
      req.on('error', () => process.exit(1))
      req.end()
    `
    const res = spawnSync(process.execPath, ['-e', probe], { stdio: 'ignore' })
    return res.status === 0
  } catch {
    return false
  }
}

const USE_EXISTING_SERVER =
  USE_EXISTING_SERVER_RAW === '1' ||
  USE_EXISTING_SERVER_RAW === 'true' ||
  (USE_EXISTING_SERVER_RAW === 'auto' && isServerReachable(BASE_URL))

const WEB_SERVER = {
  command: `VITE_AX_DEPLOY_TARGET=ghpages npm run dev -- --host ${HOST} --port ${PORT}`,
  url: BASE_URL,
  timeout: 120_000,
  reuseExistingServer: !process.env.CI,
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
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
  ...(USE_EXISTING_SERVER ? {} : { webServer: WEB_SERVER }),
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
