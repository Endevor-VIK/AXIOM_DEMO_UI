import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

function extractCookie(
  setCookieHeader: string | string[] | undefined,
  cookieName: string,
): string {
  const items = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : []

  const match = items.find((item) => item.startsWith(`${cookieName}=`))
  if (!match) return ''
  return match.split(';')[0] || ''
}

function restoreEnv(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key]
    }
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

describe('Admin auth session isolation', () => {
  const envSnapshot = { ...process.env }
  let app: FastifyInstance | null = null
  let tempDir = ''

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-admin-auth-'))

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
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('does not allow admin login cookie to authorize main site routes', async () => {
    if (!app) throw new Error('app_not_initialized')

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/admin-auth/login',
      payload: { email: 'creator', password: 'axiom' },
    })
    expect(adminLogin.statusCode).toBe(200)

    const adminCookie = extractCookie(adminLogin.headers['set-cookie'], 'ax_admin_session')
    expect(adminCookie).toBeTruthy()

    const mainMeWithAdminCookie = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: adminCookie },
    })
    expect(mainMeWithAdminCookie.statusCode).toBe(401)

    const adminMeWithAdminCookie = await app.inject({
      method: 'GET',
      url: '/api/admin-auth/me',
      headers: { cookie: adminCookie },
    })
    expect(adminMeWithAdminCookie.statusCode).toBe(200)
  })

  it('keeps logout boundaries between main and admin sessions', async () => {
    if (!app) throw new Error('app_not_initialized')

    const mainLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'creator', password: 'axiom' },
    })
    expect(mainLogin.statusCode).toBe(200)
    const mainCookie = extractCookie(mainLogin.headers['set-cookie'], 'ax_session')
    expect(mainCookie).toBeTruthy()

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/admin-auth/login',
      payload: { email: 'creator', password: 'axiom' },
    })
    expect(adminLogin.statusCode).toBe(200)
    const adminCookie = extractCookie(adminLogin.headers['set-cookie'], 'ax_admin_session')
    expect(adminCookie).toBeTruthy()

    const adminWithMainCookie = await app.inject({
      method: 'GET',
      url: '/api/admin-auth/me',
      headers: { cookie: mainCookie },
    })
    expect(adminWithMainCookie.statusCode).toBe(401)

    const mainWithAdminCookie = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: adminCookie },
    })
    expect(mainWithAdminCookie.statusCode).toBe(401)

    const mainLogout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: mainCookie },
    })
    expect(mainLogout.statusCode).toBe(200)

    const adminStillAlive = await app.inject({
      method: 'GET',
      url: '/api/admin-auth/me',
      headers: { cookie: adminCookie },
    })
    expect(adminStillAlive.statusCode).toBe(200)

    const mainAfterMainLogout = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: mainCookie },
    })
    expect(mainAfterMainLogout.statusCode).toBe(401)

    const adminLogout = await app.inject({
      method: 'POST',
      url: '/api/admin-auth/logout',
      headers: { cookie: adminCookie },
    })
    expect(adminLogout.statusCode).toBe(200)

    const adminAfterAdminLogout = await app.inject({
      method: 'GET',
      url: '/api/admin-auth/me',
      headers: { cookie: adminCookie },
    })
    expect(adminAfterAdminLogout.statusCode).toBe(401)
  })

  it('supports credentials update and user history endpoints for admin panel', async () => {
    if (!app) throw new Error('app_not_initialized')

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/admin-auth/login',
      payload: { email: 'creator', password: 'axiom' },
    })
    expect(adminLogin.statusCode).toBe(200)
    const adminCookie = extractCookie(adminLogin.headers['set-cookie'], 'ax_admin_session')
    expect(adminCookie).toBeTruthy()

    const createUser = await app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: { cookie: adminCookie },
      payload: {
        email: 'ops_user',
        password: 'start123',
        roles: ['user'],
      },
    })
    expect(createUser.statusCode).toBe(200)
    const createdPayload = createUser.json() as { user: { id: string; email: string } }
    const targetUserId = createdPayload.user.id
    expect(targetUserId).toBeTruthy()

    const credentialsUpdate = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${targetUserId}/credentials`,
      headers: { cookie: adminCookie },
      payload: {
        email: 'ops_user_renamed',
        password: 'changed456',
      },
    })
    expect(credentialsUpdate.statusCode).toBe(200)
    const updatedPayload = credentialsUpdate.json() as {
      ok: boolean
      emailChanged: boolean
      passwordChanged: boolean
      user: { id: string; email: string }
    }
    expect(updatedPayload.ok).toBe(true)
    expect(updatedPayload.emailChanged).toBe(true)
    expect(updatedPayload.passwordChanged).toBe(true)
    expect(updatedPayload.user.email).toBe('ops_user_renamed')

    const oldLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ops_user', password: 'start123' },
    })
    expect(oldLogin.statusCode).toBe(401)

    const newLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ops_user_renamed', password: 'changed456' },
    })
    expect(newLogin.statusCode).toBe(200)

    const history = await app.inject({
      method: 'GET',
      url: `/api/admin/users/${targetUserId}/history?limit=120`,
      headers: { cookie: adminCookie },
    })
    expect(history.statusCode).toBe(200)
    const historyPayload = history.json() as {
      sessions: Array<{ id: string; device: string; network: string; region: string }>
      events: Array<{ eventType: string }>
    }
    expect(historyPayload.sessions.length).toBeGreaterThan(0)
    expect(historyPayload.sessions[0]?.device).toBeTruthy()
    expect(historyPayload.sessions[0]?.network).toBeTruthy()
    expect(historyPayload.sessions[0]?.region).toBeTruthy()
    expect(historyPayload.events.some((event) => event.eventType === 'user.credentials.update')).toBe(true)

    const events = await app.inject({
      method: 'GET',
      url: '/api/admin/events?limit=100',
      headers: { cookie: adminCookie },
    })
    expect(events.statusCode).toBe(200)
    const eventsPayload = events.json() as { events: Array<{ scope: string; eventType: string }> }
    expect(eventsPayload.events.some((event) => event.scope === 'api-console' && event.eventType === 'api.request')).toBe(true)
    expect(eventsPayload.events.some((event) => event.eventType === 'user.credentials.update')).toBe(true)
  })
})
