import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/guards'
import {
  createUser,
  deleteUserById,
  findUserByEmail,
  findUserById,
  getUserRoles,
  listUsers,
  setUserRoles,
} from '../db/users'
import { hashPassword } from '../auth/password'

type AdminUserPayload = {
  email?: string
  password?: string
  roles?: string[]
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: requireRole('creator') }, async (_request, reply) => {
    reply.send({ users: listUsers() })
  })

  app.post('/users', { preHandler: requireRole('creator') }, async (request, reply) => {
    const body = request.body as AdminUserPayload
    const email = (body?.email || '').trim().toLowerCase()
    const password = body?.password || ''
    const roles = Array.isArray(body?.roles) ? body.roles : ['user']
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
    reply.send({ user: { id: user.id, email: user.email, roles: getUserRoles(user.id) } })
  })

  app.patch('/users/:id', { preHandler: requireRole('creator') }, async (request, reply) => {
    const body = request.body as AdminUserPayload
    const roles = Array.isArray(body?.roles) ? body.roles : null
    if (!roles) {
      reply.code(400).send({ error: 'missing_roles' })
      return
    }
    const userId = (request.params as any).id as string
    setUserRoles(userId, roles)
    reply.send({ ok: true })
  })

  app.delete('/users/:id', { preHandler: requireRole('creator') }, async (request, reply) => {
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

    reply.send({ ok: true })
  })
}
