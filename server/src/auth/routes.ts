import type { FastifyInstance } from 'fastify'

import { config } from '../config'
import { hashPassword, verifyPassword } from './password'
import { createSession, getSession, isSessionValid, revokeSession } from './sessions'
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
    if (!config.allowRegister) {
      reply.code(403).send({ error: 'registration_disabled' })
      return
    }
    const body = request.body as AuthPayload
    const email = (body?.email || '').trim().toLowerCase()
    const password = body?.password || ''
    if (!email || !password) {
      reply.code(400).send({ error: 'missing_credentials' })
      return
    }
    if (findUserByEmail(email)) {
      reply.code(409).send({ error: 'user_exists' })
      return
    }
    const passwordHash = await hashPassword(password)
    const user = createUser(email, passwordHash)
    addUserRole(user.id, 'user')
    const roles = getUserRoles(user.id)
    const session = createSession(user.id, request.ip, request.headers['user-agent'])
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
    if (!checkRateLimit(request.ip)) {
      reply.code(429).send({ error: 'rate_limited' })
      return
    }
    const body = request.body as AuthPayload
    const email = (body?.email || '').trim().toLowerCase()
    const password = body?.password || ''
    if (!email || !password) {
      reply.code(400).send({ error: 'missing_credentials' })
      return
    }
    const user = findUserByEmail(email)
    if (!user) {
      reply.code(401).send({ error: 'invalid_credentials' })
      return
    }
    const ok = await verifyPassword(user.password_hash, password)
    if (!ok) {
      reply.code(401).send({ error: 'invalid_credentials' })
      return
    }
    const roles = getUserRoles(user.id)
    const session = createSession(user.id, request.ip, request.headers['user-agent'])
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
    const sessionId = request.cookies?.[config.cookieName]
    if (sessionId) {
      revokeSession(sessionId)
    }
    reply
      .clearCookie(config.cookieName, { path: '/' })
      .send({ ok: true })
  })

  app.get('/me', async (request, reply) => {
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
