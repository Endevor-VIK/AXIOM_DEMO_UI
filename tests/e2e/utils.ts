import type { Page } from '@playwright/test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function stubContentApi(page: Page): Promise<void> {
  await page.route('**/data/**', async (route) => {
    const request = route.request()
    if (request.method() !== 'GET') {
      await route.continue()
      return
    }

    try {
      const url = new URL(request.url())
      const pathname = url.pathname.replace(/^\/+/, '')
      const dataIndex = pathname.indexOf('data/')
      const relative = dataIndex >= 0 ? pathname.slice(dataIndex) : pathname
      const filePath = path.resolve(process.cwd(), 'public', relative)
      const body = await fs.readFile(filePath)
      console.log('[stubContentApi] fulfilled', relative)
      const headers: Record<string, string> = {}
      if (relative.endsWith('.json')) headers['content-type'] = 'application/json'
      else if (relative.endsWith('.html')) headers['content-type'] = 'text/html'
      else if (relative.endsWith('.md')) headers['content-type'] = 'text/markdown'
      await route.fulfill({ status: 200, body, headers })
    } catch {
      await route.continue()
    }
  })
}

export async function bootstrapSession(page: Page, options?: { pins?: string[] }): Promise<void> {
  await page.addInitScript(({ auth, pins }) => {
    window.localStorage.setItem('axiom.auth', auth)
    window.localStorage.setItem('axiom.content.pins', pins)
  }, {
    auth: JSON.stringify({ login: 'playwright', ts: Date.now() }),
    pins: JSON.stringify(options?.pins ?? []),
  })
}
