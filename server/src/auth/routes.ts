import type { FastifyInstance } from 'fastify'

import { config } from '../config'
import { hashPassword, verifyPassword } from './password'
import { createSession, getSession, isSessionValid, revokeSession } from './sessions'
import { buildAuditContext } from '../audit/context'
import { recordAuditEvent } from '../db/audit'
import {
  addUserRole,
  createUser,
  findUserByEmail,
  findUserById,
  getUserRoles,
} from '../db/users'

type AuthPayload = {
  email?: string
  password?: string
}

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 6
const rateMap = new Map<string, { count: number; resetAt: number }>()

function applyNoStore(reply: { header: (name: string, value: string) => unknown }) {
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  reply.header('Pragma', 'no-cache')
  reply.header('Expires', '0')
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || entry.resetAt <= now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_MAX) return false
  entry.count += 1
  return true
}

function toUserResponse(user: { id: string; email: string }, roles: string[]) {
  const displayName = user.email.split('@')[0] || user.email
  return {
    id: user.id,
    email: user.email,
    displayName: displayName.toUpperCase(),
    handle: `@${displayName.toLowerCase()}`,
    roles,
  }
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    applyNoStore(reply)
    const audit = buildAuditContext(request)
    if (!config.allowRegister) {
      recordAuditEvent({
        scope: 'site-auth',
        eventType: 'register.blocked',
        status: '403',
        message: 'registration_disabled',
        ...audit,
      })
      reply.code(403).send({ error: 'registration_disabled' })
      return
    }
    const body = request.body as AuthPayload
    const email = (body?.email || '').trim().toLowerCase()
    const password = body?.password || ''
    if (!email || !password) {
      recordAuditEvent({
        scope: 'site-auth',
        eventType: 'register.failed',
        status: '400',
        message: 'missing_credentials',
        ...audit,
        payload: email ? { email } : null,
      })
      reply.code(400).send({ error: 'missing_credentials' })
      return
    }
    if (findUserByEmail(email)) {
      recordAuditEvent({
        scope: 'site-auth',
        eventType: 'register.failed',
        status: '409',
        message: 'user_exists',
        ...audit,
        payload: { email },
      })
      reply.code(409).send({ error: 'user_exists' })
      return
    }
    const passwordHash = await hashPassword(password)
    const user = createUser(email, passwordHash)
    addUserRole(user.id, 'user')
    const roles = getUserRoles(user.id)
    const session = createSession(user.id, request.ip, request.headers['user-agent'])
    recordAuditEvent({
      scope: 'site-auth',
      eventType: 'register.success',
      status: '200',
      message: 'register_success',
      ...audit,
      actorUserId: user.id,
      subjectUserId: user.id,
      payload: { email, roles },
    })
    reply
      .setCookie(config.cookieName, session.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.cookieSecure,
        path: '/',
      })
      .send({ user: toUserResponse(user, roles) })
  })

  app.post('/login', async (request, reply) => {
    applyNoStore(reply)
    const audit = buildAuditContext(request)
    if (!checkRateLimit(request.ip)) {
      recordAuditEvent({
        scope: 'site-auth',
        eventType: 'login.blocked',
        status: '429',
        message: 'rate_limited',
        ...audit,
      })
      reply.code(429).send({ error: 'rate_limited' })
      return
    }
    const body = request.body as AuthPayload
    const email = (body?.email || '').trim().toLowerCase()
    const password = body?.password || ''
    if (!email || !password) {
      recordAuditEvent({
        scope: 'site-auth',
        eventType: 'login.failed',
        status: '400',
        message: 'missing_credentials',
        ...audit,
        payload: email ? { email } : null,
      })
      reply.code(400).send({ error: 'missing_credentials' })
      return
    }
    const user = findUserByEmail(email)
    if (!user) {
      recordAuditEvent({
        scope: 'site-auth',
        eventType: 'login.failed',
        status: '401',
        message: 'invalid_credentials',
        ...audit,
        payload: { email },
      })
      reply.code(401).send({ error: 'invalid_credentials' })
      return
    }
    const ok = await verifyPassword(user.password_hash, password)
    if (!ok) {
      recordAuditEvent({
        scope: 'site-auth',
        eventType: 'login.failed',
        status: '401',
        message: 'invalid_credentials',
        ...audit,
        subjectUserId: user.id,
        payload: { email },
      })
      reply.code(401).send({ error: 'invalid_credentials' })
      return
    }
    const roles = getUserRoles(user.id)
    const session = createSession(user.id, request.ip, request.headers['user-agent'])
    recordAuditEvent({
      scope: 'site-auth',
      eventType: 'login.success',
      status: '200',
      message: 'login_success',
      ...audit,
      actorUserId: user.id,
      subjectUserId: user.id,
      payload: { email, roles },
    })
    reply
      .setCookie(config.cookieName, session.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.cookieSecure,
        path: '/',
      })
      .send({ user: toUserResponse(user, roles) })
  })

  app.post('/logout', async (request, reply) => {
    applyNoStore(reply)
    const audit = buildAuditContext(request)
    const sessionId = request.cookies?.[config.cookieName]
    let actorUserId: string | null = null
    if (sessionId) {
      const session = getSession(sessionId)
      actorUserId = session?.user_id ?? null
      revokeSession(sessionId)
    }
    recordAuditEvent({
      scope: 'site-auth',
      eventType: 'logout',
      status: '200',
      message: 'logout',
      ...audit,
      actorUserId,
      subjectUserId: actorUserId,
    })
    reply
      .clearCookie(config.cookieName, {
        path: '/',
        sameSite: 'lax',
        secure: config.cookieSecure,
      })
      .send({ ok: true })
  })

  app.get('/me', async (request, reply) => {
    applyNoStore(reply)
    const sessionId = request.cookies?.[config.cookieName]
    if (!sessionId) {
      reply.code(401).send({ error: 'unauthorized' })
      return
    }
    const session = getSession(sessionId)
    if (!session || !isSessionValid(session)) {
      reply.code(401).send({ error: 'unauthorized' })
      return
    }
    const user = findUserById(session.user_id)
    if (!user) {
      reply.code(401).send({ error: 'unauthorized' })
      return
    }
    const roles = getUserRoles(user.id)
    reply.send({ user: toUserResponse(user, roles) })
  })
}
