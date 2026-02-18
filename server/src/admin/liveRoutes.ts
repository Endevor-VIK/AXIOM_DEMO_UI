import type { FastifyInstance, FastifyRequest } from 'fastify'

import { buildAuditContext } from '../audit/context'
import { listAuditEvents, recordAuditEvent } from '../db/audit'
import { buildAxchatDownload, listAxchatConversations, readAxchatLogs } from '../logging/jsonlStore'
import { getAdminStreamStats, subscribeAdminStream } from './streamHub'
import { requireAdminRole } from './guards'
import { getLiveSnapshot, getUserTimeline } from '../telemetry/sessionRegistry'

type QueryCommon = {
  limit?: string | number
  from?: string | number
  to?: string | number
  q?: string
  cursor?: string
  types?: string
  userId?: string
  level?: string
  actor?: string
  action?: string
}

function toNumber(raw: unknown, fallback: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function toLimit(raw: unknown, fallback: number, max: number): number {
  const value = toNumber(raw, fallback)
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.min(Math.floor(value), max)
}

function toTs(raw: unknown, fallback: number): number {
  const value = toNumber(raw, fallback)
  if (!Number.isFinite(value)) return fallback
  return value
}

function toStringSafe(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

function parseTypes(raw: unknown): string[] {
  const value = toStringSafe(raw)
  if (!value) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function auditAdminRead(request: FastifyRequest, eventType: string, payload: Record<string, unknown> = {}) {
  const authUser = (request as any).authUser as { id?: string } | undefined
  recordAuditEvent({
    scope: 'admin-live',
    eventType,
    status: '200',
    message: `${request.method} ${request.url}`,
    ...buildAuditContext(request),
    actorUserId: authUser?.id ?? null,
    subjectUserId: payload.userId && typeof payload.userId === 'string' ? payload.userId : null,
    payload,
  })
}

export async function registerAdminLiveRoutes(app: FastifyInstance) {
  app.get('/snapshot', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const snapshot = getLiveSnapshot(Date.now())
    auditAdminRead(request, 'snapshot.read')
    reply.send({
      ...snapshot,
      streamsMeta: {
        sse: getAdminStreamStats(),
      },
    })
  })

  app.get('/stream', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const query = (request.query || {}) as QueryCommon
    const userId = toStringSafe(query.userId)
    const types = parseTypes(query.types)

    subscribeAdminStream(reply, {
      ...(userId ? { userId } : {}),
      ...(types.length ? { types } : {}),
    })
    return
  })

  app.get('/users/:id/timeline', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const userId = toStringSafe((request.params as any)?.id)
    if (!userId) {
      reply.code(400).send({ error: 'missing_user_id' })
      return
    }

    const query = (request.query || {}) as QueryCommon
    const limit = toLimit(query.limit, 120, 500)
    const types = parseTypes(query.types)
    const cursor = toStringSafe(query.cursor)

    const timeline = getUserTimeline(userId, {
      limit,
      types,
      ...(cursor ? { cursor } : {}),
    })

    auditAdminRead(request, 'timeline.read', { userId, limit, types })
    reply.send(timeline)
  })

  app.get('/logs/api', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const query = (request.query || {}) as QueryCommon
    const limit = toLimit(query.limit, 120, 400)
    const fromTs = toTs(query.from, 0)
    const toTsValue = toTs(query.to, Number.MAX_SAFE_INTEGER)
    const userId = toStringSafe(query.userId)
    const q = toStringSafe(query.q).toLowerCase()
    const level = toStringSafe(query.level)

    const rows = listAuditEvents(Math.min(limit * 3, 200))
      .filter((row) => row.eventType === 'api.request')
      .filter((row) => row.createdAt >= fromTs && row.createdAt <= toTsValue)
      .filter((row) => !userId || row.actorUserId === userId || row.subjectUserId === userId)
      .filter((row) => !level || row.status === level)
      .filter((row) => {
        if (!q) return true
        const haystack = `${row.message || ''}\n${JSON.stringify(row.payload || {})}`.toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, limit)

    auditAdminRead(request, 'api_logs.read', { limit, userId })
    reply.send({ items: rows })
  })

  app.get('/logs/audit', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const query = (request.query || {}) as QueryCommon
    const limit = toLimit(query.limit, 120, 400)
    const fromTs = toTs(query.from, 0)
    const toTsValue = toTs(query.to, Number.MAX_SAFE_INTEGER)
    const actor = toStringSafe(query.actor)
    const action = toStringSafe(query.action).toLowerCase()

    const rows = listAuditEvents(Math.min(limit * 3, 200))
      .filter((row) => row.createdAt >= fromTs && row.createdAt <= toTsValue)
      .filter((row) => !actor || row.actorUserId === actor)
      .filter((row) => {
        if (!action) return true
        return row.eventType.toLowerCase().includes(action) || (row.scope || '').toLowerCase().includes(action)
      })
      .slice(0, limit)

    auditAdminRead(request, 'audit_logs.read', { limit, actor, action })
    reply.send({ items: rows })
  })

  app.get('/users/:id/axchat', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const userId = toStringSafe((request.params as any)?.id)
    if (!userId) {
      reply.code(400).send({ error: 'missing_user_id' })
      return
    }

    const query = (request.query || {}) as QueryCommon
    const limit = toLimit(query.limit, 120, 400)
    const fromTs = toTs(query.from, 0)
    const toTsValue = toTs(query.to, Number.MAX_SAFE_INTEGER)
    const q = toStringSafe(query.q)
    const cursor = toStringSafe(query.cursor)

    const result = readAxchatLogs(userId, {
      from: fromTs,
      to: toTsValue,
      q,
      limit,
      ...(cursor ? { cursor } : {}),
    })

    auditAdminRead(request, 'axchat_logs.read', { userId, limit })
    reply.send(result)
  })

  app.get('/users/:id/axchat/conversations', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const userId = toStringSafe((request.params as any)?.id)
    if (!userId) {
      reply.code(400).send({ error: 'missing_user_id' })
      return
    }

    const query = (request.query || {}) as QueryCommon
    const fromTs = toTs(query.from, 0)
    const toTsValue = toTs(query.to, Number.MAX_SAFE_INTEGER)

    const conversations = listAxchatConversations(userId, {
      from: fromTs,
      to: toTsValue,
    })

    auditAdminRead(request, 'axchat_conversations.read', { userId })
    reply.send({ items: conversations })
  })

  app.get('/users/:id/axchat/download', { preHandler: requireAdminRole('creator') }, async (request, reply) => {
    const userId = toStringSafe((request.params as any)?.id)
    if (!userId) {
      reply.code(400).send({ error: 'missing_user_id' })
      return
    }

    const query = (request.query || {}) as QueryCommon
    const fromTs = toTs(query.from, 0)
    const toTsValue = toTs(query.to, Number.MAX_SAFE_INTEGER)

    const content = buildAxchatDownload(userId, {
      from: fromTs,
      to: toTsValue,
      limit: 5000,
    })

    auditAdminRead(request, 'axchat_download', { userId })

    reply
      .header('Content-Type', 'application/x-ndjson; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="axchat-${userId}.jsonl"`)
      .send(content)
  })
}
