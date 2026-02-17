import type { FastifyInstance } from 'fastify'

import { buildAuditContext, resolveDevice, resolveNetwork } from '../audit/context'
import { hashPassword } from '../auth/password'
import { listSessionsByUserId, revokeSessionsByUserId } from '../auth/sessions'
import { listAuditEvents, listAuditEventsByUser, recordAuditEvent } from '../db/audit'
import {
  createUser,
  deleteUserById,
  findUserByEmail,
  findUserById,
  getUserRoles,
  listUsers,
  setUserRoles,
  updateUserEmail,
  updateUserPassword,
} from '../db/users'
import { requireAdminRole } from './guards'

type AdminUserPayload = {
  email?: string
  password?: string
  roles?: string[]
}

type QueryWithLimit = {
  limit?: string | number
}

type CredentialsPayload = {
  email?: string
  password?: string
}

function resolveLimit(raw: unknown, fallback: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: requireAdminRole('creator') }, async (_request, reply) => {
    reply.send({ users: listUsers() })
  })

  app.get('/events', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const limit = resolveLimit((request.query as QueryWithLimit | undefined)?.limit, 80, 200)
    reply.send({ events: listAuditEvents(limit) })
  })

  app.get('/users/:id/history', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const userId = ((request.params as any).id as string | undefined)?.trim()
    if (!userId) {
      reply.code(400).send({ error: 'missing_user_id' })
      return
    }

    const target = findUserById(userId)
    if (!target) {
      reply.code(404).send({ error: 'user_not_found' })
      return
    }

    const query = request.query as QueryWithLimit | undefined
    const limit = resolveLimit(query?.limit, 120, 400)

    const sessions = listSessionsByUserId(userId, Math.min(limit, 200)).map((session) => ({
      id: session.id,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      revokedAt: session.revoked_at,
      ip: session.ip,
      ua: session.ua,
      device: resolveDevice(session.ua),
      region: 'UNKNOWN',
      network: resolveNetwork(session.ip),
    }))
    const events = listAuditEventsByUser(userId, limit)

    reply.send({ sessions, events })
  })

  app.post('/users', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const body = request.body as AdminUserPayload
    const email = (body?.email || '').trim().toLowerCase()
    const password = body?.password || ''
    const roles = Array.isArray(body?.roles) ? body.roles : ['user']
    const authUser = (request as any).authUser as { id: string } | undefined
    const audit = buildAuditContext(request)

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
    setUserRoles(user.id, roles)

    recordAuditEvent({
      scope: 'admin-users',
      eventType: 'user.create',
      status: '200',
      message: `created ${email}`,
      ...audit,
      actorUserId: authUser?.id ?? null,
      subjectUserId: user.id,
      payload: { email, roles },
    })

    reply.send({ user: { id: user.id, email: user.email, roles: getUserRoles(user.id) } })
  })

  app.patch('/users/:id', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const body = request.body as AdminUserPayload
    const roles = Array.isArray(body?.roles) ? body.roles : null
    if (!roles) {
      reply.code(400).send({ error: 'missing_roles' })
      return
    }
    const userId = ((request.params as any).id as string | undefined)?.trim()
    if (!userId) {
      reply.code(400).send({ error: 'missing_user_id' })
      return
    }

    const target = findUserById(userId)
    if (!target) {
      reply.code(404).send({ error: 'user_not_found' })
      return
    }

    setUserRoles(userId, roles)

    const authUser = (request as any).authUser as { id: string } | undefined
    recordAuditEvent({
      scope: 'admin-users',
      eventType: 'user.roles.update',
      status: '200',
      message: `roles updated for ${target.email}`,
      ...buildAuditContext(request),
      actorUserId: authUser?.id ?? null,
      subjectUserId: userId,
      payload: { roles },
    })

    reply.send({ ok: true })
  })

  app.patch('/users/:id/credentials', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const userId = ((request.params as any).id as string | undefined)?.trim()
    if (!userId) {
      reply.code(400).send({ error: 'missing_user_id' })
      return
    }

    const body = request.body as CredentialsPayload
    const nextEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const nextPassword = typeof body?.password === 'string' ? body.password.trim() : ''
    if (!nextEmail && !nextPassword) {
      reply.code(400).send({ error: 'missing_update_fields' })
      return
    }

    const target = findUserById(userId)
    if (!target) {
      reply.code(404).send({ error: 'user_not_found' })
      return
    }

    let emailChanged = false
    let passwordChanged = false

    if (nextEmail && nextEmail !== target.email) {
      const existing = findUserByEmail(nextEmail)
      if (existing && existing.id !== userId) {
        reply.code(409).send({ error: 'email_in_use' })
        return
      }
      updateUserEmail(userId, nextEmail)
      emailChanged = true
    }

    if (nextPassword) {
      const nextHash = await hashPassword(nextPassword)
      updateUserPassword(userId, nextHash)
      passwordChanged = true
    }

    if (emailChanged || passwordChanged) {
      revokeSessionsByUserId(userId)
    }

    const updated = findUserById(userId)
    const authUser = (request as any).authUser as { id: string } | undefined
    recordAuditEvent({
      scope: 'admin-users',
      eventType: 'user.credentials.update',
      status: '200',
      message: `credentials updated for ${target.email}`,
      ...buildAuditContext(request),
      actorUserId: authUser?.id ?? null,
      subjectUserId: userId,
      payload: {
        emailChanged,
        passwordChanged,
        nextEmail: emailChanged ? updated?.email || nextEmail : undefined,
      },
    })

    reply.send({
      ok: true,
      user: updated ? { id: updated.id, email: updated.email, roles: getUserRoles(updated.id) } : null,
      emailChanged,
      passwordChanged,
    })
  })

  app.delete('/users/:id', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const userId = ((request.params as any).id as string | undefined)?.trim()
    if (!userId) {
      reply.code(400).send({ error: 'missing_user_id' })
      return
    }

    const authUser = (request as any).authUser as { id: string } | undefined
    if (authUser?.id === userId) {
      reply.code(400).send({ error: 'cannot_delete_self' })
      return
    }

    const target = findUserById(userId)
    if (!target) {
      reply.code(404).send({ error: 'user_not_found' })
      return
    }

    const targetRoles = getUserRoles(target.id)
    if (targetRoles.includes('creator')) {
      reply.code(403).send({ error: 'cannot_delete_creator' })
      return
    }

    const deleted = deleteUserById(target.id)
    if (!deleted) {
      reply.code(404).send({ error: 'user_not_found' })
      return
    }

    recordAuditEvent({
      scope: 'admin-users',
      eventType: 'user.delete',
      status: '200',
      message: `deleted ${target.email}`,
      ...buildAuditContext(request),
      actorUserId: authUser?.id ?? null,
      subjectUserId: target.id,
      payload: { email: target.email, roles: targetRoles },
    })

    reply.send({ ok: true })
  })
}
