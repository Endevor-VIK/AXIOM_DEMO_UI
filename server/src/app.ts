import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import path from 'node:path'

import { buildAuditContext } from './audit/context'
import { recordAuditEvent } from './db/audit'
import { config } from './config'
import { registerAuthRoutes } from './auth/routes'
import { registerAdminAuthRoutes } from './admin/authRoutes'
import { registerAdminRoutes } from './admin/routes'
import { registerAdminLiveRoutes } from './admin/liveRoutes'
import { publishAdminStream } from './admin/streamHub'
import { registerAxchatRoutes } from './axchat/routes'
import { writeAdminAuditLog, writeApiLog } from './logging/jsonlStore'
import { registerTelemetryRoutes } from './telemetry/routes'
import { getDb } from './db/db'
import { seedUsers } from './db/seed'

function shouldCaptureApiRequest(url: string): boolean {
  if (!url.startsWith('/api/')) return false
  if (url.startsWith('/api/health')) return false
  if (url.startsWith('/api/admin/events')) return false
  if (/^\/api\/admin\/users\/[^/]+\/history/.test(url)) return false
  if (url.startsWith('/api/admin/stream')) return false
  if (url.startsWith('/api/admin/snapshot')) return false
  if (/^\/api\/admin\/users\/[^/]+\/timeline/.test(url)) return false
  if (/^\/api\/admin\/users\/[^/]+\/axchat/.test(url)) return false
  if (url.startsWith('/api/admin/logs/')) return false
  return true
}

function shouldCaptureAdminRequest(url: string): boolean {
  if (!url.startsWith('/api/admin')) return false
  if (url.startsWith('/api/admin/stream')) return false
  if (url.startsWith('/api/admin/snapshot')) return false
  if (url.startsWith('/api/admin/events')) return false
  return true
}

export async function buildApp() {
  const app = Fastify({ logger: { level: config.apiLogLevel } })
  app.register(cookie)

  app.get('/api/health', async () => ({ ok: true }))

  app.register(async (instance) => {
    await registerAuthRoutes(instance)
  }, { prefix: '/api/auth' })

  app.register(async (instance) => {
    await registerAdminAuthRoutes(instance)
  }, { prefix: '/api/admin-auth' })

  app.register(async (instance) => {
    await registerAdminRoutes(instance)
  }, { prefix: '/api/admin' })

  app.register(async (instance) => {
    await registerAdminLiveRoutes(instance)
  }, { prefix: '/api/admin' })

  app.register(async (instance) => {
    await registerTelemetryRoutes(instance)
  }, { prefix: '/api/telemetry' })

  app.register(async (instance) => {
    await registerAxchatRoutes(instance)
  }, { prefix: '/api/axchat' })

  app.addHook('onResponse', async (request, reply) => {
    const requestId = String(request.id || '')
    const correlationHeader = request.headers['x-correlation-id']
    const correlationId = typeof correlationHeader === 'string' && correlationHeader.trim()
      ? correlationHeader.trim()
      : requestId
    const auditContext = buildAuditContext(request)
    const authUser = (request as any).authUser as { id?: string; email?: string } | undefined
    const basePayload = {
      ts: Date.now(),
      requestId,
      correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      userId: authUser?.id || null,
      login: authUser?.email || null,
      ipMasked: auditContext.ip,
    }

    if (shouldCaptureApiRequest(request.url)) {
      writeApiLog(basePayload)
      publishAdminStream('api.log', {
        ...basePayload,
        status: String(reply.statusCode),
      })
      if (reply.statusCode >= 400) {
        publishAdminStream('error', {
          ...basePayload,
          source: 'api',
          level: 'error',
        })
      }
    }

    if (shouldCaptureAdminRequest(request.url)) {
      writeAdminAuditLog({
        ...basePayload,
        scope: 'admin.request',
      })
    }

    if (!shouldCaptureApiRequest(request.url)) return
    try {
      recordAuditEvent({
        scope: 'api-console',
        eventType: 'api.request',
        status: String(reply.statusCode),
        message: `${request.method} ${request.url}`,
        ...auditContext,
        actorUserId: authUser?.id ?? null,
        subjectUserId: authUser?.id ?? null,
        payload: {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          requestId,
          correlationId,
        },
      })
    } catch {
      // ignore audit hook failures to avoid affecting primary request flow
    }
  })

  if (process.env.AX_SERVE_STATIC === '1' || process.env.NODE_ENV === 'production') {
    const distRoot = path.resolve(process.cwd(), 'dist')
    app.register(fastifyStatic, {
      root: distRoot,
      prefix: '/',
    })
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'not_found' })
        return
      }
      reply.sendFile('index.html')
    })
  }

  getDb()
  await seedUsers()

  return app
}

export { config }
