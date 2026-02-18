import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

function extractCookie(setCookieHeader: string | string[] | undefined, cookieName: string): string {
  const items = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : []
  const found = items.find((item) => item.startsWith(`${cookieName}=`))
  if (!found) return ''
  return found.split(';')[0] || ''
}

function restoreEnv(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) delete process.env[key]
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe('Admin live ops foundation', () => {
  const envSnapshot = { ...process.env }
  let app: FastifyInstance | null = null
  let tempDir = ''

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-admin-live-'))

    process.env.AX_DB_PATH = path.join(tempDir, 'auth.sqlite')
    process.env.AX_CREATOR_EMAIL = 'creator'
    process.env.AX_CREATOR_PASSWORD = 'axiom'
    process.env.AX_CREATOR_FORCE_RESET = '1'
    process.env.AX_ALLOW_REGISTER = '1'
    process.env.AX_DEPLOY_TARGET = 'local'

    vi.resetModules()
    const { buildApp } = await import('../server/src/app')
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
      app = null
    }
    restoreEnv(envSnapshot)
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('accepts telemetry and exposes live snapshot/timeline for admin', async () => {
    if (!app) throw new Error('app_not_initialized')

    const userLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'creator', password: 'axiom' },
    })
    expect(userLogin.statusCode).toBe(200)
    const userCookie = extractCookie(userLogin.headers['set-cookie'], 'ax_session')
    expect(userCookie).toBeTruthy()

    const userMe = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: userCookie },
    })
    expect(userMe.statusCode).toBe(200)
    const userPayload = userMe.json() as { user: { id: string } }
    const userId = userPayload.user.id
    expect(userId).toBeTruthy()

    const telemetry = await app.inject({
      method: 'POST',
      url: '/api/telemetry/events',
      headers: {
        cookie: userCookie,
        'content-type': 'application/json',
      },
      payload: {
        events: [
          {
            type: 'presence.heartbeat',
            ts_client: Date.now(),
            payload: {
              path: '/dashboard/content/read/liza',
              visible: true,
              idleMs: 1200,
            },
          },
          {
            type: 'nav.route_change',
            ts_client: Date.now(),
            payload: {
              from: '/dashboard',
              to: '/dashboard/content/read/liza',
            },
          },
        ],
      },
    })
    expect(telemetry.statusCode).toBe(200)

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/admin-auth/login',
      payload: { email: 'creator', password: 'axiom' },
    })
    expect(adminLogin.statusCode).toBe(200)
    const adminCookie = extractCookie(adminLogin.headers['set-cookie'], 'ax_admin_session')
    expect(adminCookie).toBeTruthy()

    const snapshot = await app.inject({
      method: 'GET',
      url: '/api/admin/snapshot',
      headers: { cookie: adminCookie },
    })
    expect(snapshot.statusCode).toBe(200)
    const snapshotPayload = snapshot.json() as {
      usersOnline: Array<{ userId: string; path: string; status: string }>
      counters: { online: number; idle: number; offline: number }
    }
    expect(snapshotPayload.usersOnline.some((entry) => entry.userId === userId)).toBe(true)
    expect(snapshotPayload.counters.online + snapshotPayload.counters.idle + snapshotPayload.counters.offline).toBeGreaterThan(0)

    const timeline = await app.inject({
      method: 'GET',
      url: `/api/admin/users/${encodeURIComponent(userId)}/timeline?limit=20`,
      headers: { cookie: adminCookie },
    })
    expect(timeline.statusCode).toBe(200)
    const timelinePayload = timeline.json() as {
      items: Array<{ type: string }>
    }
    expect(timelinePayload.items.some((entry) => entry.type === 'presence.heartbeat')).toBe(true)
    expect(timelinePayload.items.some((entry) => entry.type === 'nav.route_change')).toBe(true)
  })

  it('writes and reads axchat audit log per user', async () => {
    if (!app) throw new Error('app_not_initialized')

    const userLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'creator', password: 'axiom' },
    })
    expect(userLogin.statusCode).toBe(200)
    const userCookie = extractCookie(userLogin.headers['set-cookie'], 'ax_session')
    expect(userCookie).toBeTruthy()

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: userCookie },
    })
    expect(me.statusCode).toBe(200)
    const mePayload = me.json() as { user: { id: string } }
    const userId = mePayload.user.id

    const query = await app.inject({
      method: 'POST',
      url: '/api/axchat/query',
      headers: {
        cookie: userCookie,
        'content-type': 'application/json',
      },
      payload: {
        message: '/help',
        mode: 'qa',
        history: [],
        conversationId: 'test-conv-1',
        path: '/dashboard/axchat',
      },
    })
    expect(query.statusCode).toBe(200)

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/admin-auth/login',
      payload: { email: 'creator', password: 'axiom' },
    })
    expect(adminLogin.statusCode).toBe(200)
    const adminCookie = extractCookie(adminLogin.headers['set-cookie'], 'ax_admin_session')

    const logs = await app.inject({
      method: 'GET',
      url: `/api/admin/users/${encodeURIComponent(userId)}/axchat?limit=50`,
      headers: { cookie: adminCookie },
    })
    expect(logs.statusCode).toBe(200)
    const logsPayload = logs.json() as {
      items: Array<{ role: string; type: string; text: string }>
    }
    expect(logsPayload.items.some((entry) => entry.role === 'user')).toBe(true)
    expect(logsPayload.items.some((entry) => entry.role === 'ai' || entry.role === 'system')).toBe(true)

    const conversations = await app.inject({
      method: 'GET',
      url: `/api/admin/users/${encodeURIComponent(userId)}/axchat/conversations`,
      headers: { cookie: adminCookie },
    })
    expect(conversations.statusCode).toBe(200)

    const download = await app.inject({
      method: 'GET',
      url: `/api/admin/users/${encodeURIComponent(userId)}/axchat/download`,
      headers: { cookie: adminCookie },
    })
    expect(download.statusCode).toBe(200)
    expect(download.headers['content-type']).toContain('application/x-ndjson')
  })
})
