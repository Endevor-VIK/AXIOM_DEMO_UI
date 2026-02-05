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

type SessionPayload = { auth: string; pins: string }

export function buildSessionPayload(options?: { pins?: string[] }): SessionPayload {
  const favorites = (options?.pins ?? []).map((id) => ({
    key: `content:${id}`,
    id,
    type: 'content',
    title: id,
    route: `/dashboard/content/all?item=${id}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
  return {
    auth: JSON.stringify({
      isAuthenticated: true,
      user: {
        id: 'playwright',
        displayName: 'PLAYWRIGHT',
        handle: '@playwright',
        role: 'user',
        lang: 'EN',
      },
    }),
    pins: JSON.stringify(favorites),
  }
}

export async function bootstrapSession(page: Page, options?: { pins?: string[] }): Promise<void> {
  const payload = buildSessionPayload(options)
  await page.addInitScript(({ auth, pins }) => {
    if (!window.localStorage.getItem('ax_session_v1')) {
      window.localStorage.setItem('ax_session_v1', auth)
    }
    if (!window.localStorage.getItem('ax_favorites_v1')) {
      window.localStorage.setItem('ax_favorites_v1', pins)
    }
  }, payload)
}

export async function ensureSessionStorage(page: Page, options?: { pins?: string[] }): Promise<void> {
  const payload = buildSessionPayload(options)
  await page.evaluate(({ auth, pins }) => {
    window.localStorage.setItem('ax_session_v1', auth)
    window.localStorage.setItem('ax_favorites_v1', pins)
  }, payload)
}
