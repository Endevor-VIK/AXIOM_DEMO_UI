import type { FastifyReply, FastifyRequest } from 'fastify'

import { config } from '../config'
import { getSession, isSessionValid } from '../auth/sessions'
import { findUserById, getUserRoles } from '../db/users'

export type AdminAuthedUser = {
  id: string
  email: string
  roles: string[]
}

export async function requireAdminAuth(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies?.[config.adminCookieName]
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
  const authUser: AdminAuthedUser = { id: user.id, email: user.email, roles }
  ;(request as any).authUser = authUser
}

export function requireAdminRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAdminAuth(request, reply)
    if (reply.sent) return
    const authUser = (request as any).authUser as AdminAuthedUser | undefined
    if (!authUser || !authUser.roles.includes(role)) {
      reply.code(403).send({ error: 'forbidden' })
    }
  }
}
