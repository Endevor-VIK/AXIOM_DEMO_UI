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
import { registerAxchatRoutes } from './axchat/routes'
import { getDb } from './db/db'
import { seedUsers } from './db/seed'

function shouldCaptureApiRequest(url: string): boolean {
  if (!url.startsWith('/api/')) return false
  if (url.startsWith('/api/health')) return false
  if (url.startsWith('/api/admin/events')) return false
  if (/^\/api\/admin\/users\/[^/]+\/history/.test(url)) return false
  return true
}

export async function buildApp() {
  const app = Fastify({ logger: true })
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
    await registerAxchatRoutes(instance)
  }, { prefix: '/api/axchat' })

  app.addHook('onResponse', async (request, reply) => {
    if (!shouldCaptureApiRequest(request.url)) return
    try {
      const authUser = (request as any).authUser as { id?: string } | undefined
      recordAuditEvent({
        scope: 'api-console',
        eventType: 'api.request',
        status: String(reply.statusCode),
        message: `${request.method} ${request.url}`,
        ...buildAuditContext(request),
        actorUserId: authUser?.id ?? null,
        subjectUserId: authUser?.id ?? null,
        payload: { method: request.method, url: request.url, statusCode: reply.statusCode },
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
