import type { FastifyReply, FastifyRequest } from 'fastify'

import { config } from '../config'
import { getSession, isSessionValid } from './sessions'
import { findUserById, getUserRoles } from '../db/users'

export type AuthedUser = {
  id: string
  email: string
  roles: string[]
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
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
  ;(request as any).authUser = { id: user.id, email: user.email, roles }
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply)
    if (reply.sent) return
    const authUser = (request as any).authUser as AuthedUser | undefined
    if (!authUser || !authUser.roles.includes(role)) {
      reply.code(403).send({ error: 'forbidden' })
    }
  }
}
