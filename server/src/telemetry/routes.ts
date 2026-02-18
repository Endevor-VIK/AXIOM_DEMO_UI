import type { FastifyInstance } from 'fastify'

import { buildAuditContext } from '../audit/context'
import { config } from '../config'
import { requireAuth, type AuthedUser } from '../auth/guards'
import { writeTelemetryLog } from '../logging/jsonlStore'
import { publishAdminStream } from '../admin/streamHub'
import { getUserPresence, ingestTelemetryEvent } from './sessionRegistry'

type IncomingTelemetryEvent = {
  type?: unknown
  ts_client?: unknown
  payload?: unknown
}

type IncomingTelemetryBody = {
  events?: IncomingTelemetryEvent[]
}

const ALLOWED_TYPES = new Set([
  'presence.heartbeat',
  'nav.route_change',
  'content.open',
  'content.read_progress',
  'ui.action',
  'error.client',
  'axchat.typing',
])

function toStringSafe(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.trim()
}

function normalizeType(raw: unknown): string {
  const value = toStringSafe(raw)
  if (!value) return ''
  if (ALLOWED_TYPES.has(value)) return value
  if (value.startsWith('custom.')) return value.slice(0, 64)
  return ''
}

function normalizePayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as Record<string, unknown>
}

function normalizeTsClient(raw: unknown): number {
  const ts = Number(raw)
  if (!Number.isFinite(ts)) return Date.now()
  return ts
}

function resolveCorrelationId(requestId: string, raw: unknown): string {
  if (typeof raw !== 'string') return requestId
  const value = raw.trim()
  return value || requestId
}

export async function registerTelemetryRoutes(app: FastifyInstance) {
  app.post('/events', { preHandler: requireAuth }, async (request, reply) => {
    const body = (request.body || {}) as IncomingTelemetryBody
    const events = Array.isArray(body.events) ? body.events : []
    if (!events.length) {
      reply.code(400).send({ error: 'missing_events' })
      return
    }

    const authUser = (request as any).authUser as AuthedUser | undefined
    if (!authUser) {
      reply.code(401).send({ error: 'unauthorized' })
      return
    }

    const batch = events.slice(0, 80)
    const context = buildAuditContext(request)
    const sessionId = request.cookies?.[config.cookieName] || 'unknown'
    const requestId = String(request.id || '')
    const correlationId = resolveCorrelationId(requestId, request.headers['x-correlation-id'])

    let accepted = 0
    let publishPresence = false

    for (const row of batch) {
      const type = normalizeType(row?.type)
      if (!type) continue

      const tsServer = Date.now()
      const payload = normalizePayload(row?.payload)
      const tsClient = normalizeTsClient(row?.ts_client)

      const envelope = {
        ts_server: tsServer,
        ts_client: tsClient,
        requestId,
        correlationId,
        userId: authUser.id,
        login: authUser.email,
        role: authUser.roles[0] || 'user',
        sessionId,
        type,
        payload,
      }

      writeTelemetryLog(envelope, tsServer)

      ingestTelemetryEvent({
        userId: authUser.id,
        login: authUser.email,
        role: authUser.roles[0] || 'user',
        sessionId,
        requestId,
        correlationId,
        type,
        payload,
        tsServer,
        ipMasked: context.ip,
        ua: context.ua,
      })

      publishAdminStream('telemetry', {
        ts: tsServer,
        userId: authUser.id,
        sessionId,
        requestId,
        correlationId,
        type,
        payload,
      })

      if (type === 'presence.heartbeat' || type === 'nav.route_change' || type === 'content.open' || type === 'content.read_progress') {
        publishPresence = true
      }

      accepted += 1
    }

    if (publishPresence) {
      const presence = getUserPresence(authUser.id)
      if (presence) {
        publishAdminStream('presence.update', {
          ts: Date.now(),
          userId: authUser.id,
          sessionId,
          data: presence,
        })
      }
    }

    reply.send({
      ok: true,
      accepted,
    })
  })
}
