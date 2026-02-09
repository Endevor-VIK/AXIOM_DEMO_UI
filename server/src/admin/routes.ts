import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/guards'
import { createUser, findUserByEmail, getUserRoles, listUsers, setUserRoles } from '../db/users'
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
}
