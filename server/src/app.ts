import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import path from 'node:path'

import { config } from './config'
import { registerAuthRoutes } from './auth/routes'
import { registerAdminRoutes } from './admin/routes'
import { getDb } from './db/db'
import { seedUsers } from './db/seed'

export async function buildApp() {
  const app = Fastify({ logger: true })
  app.register(cookie)

  app.get('/api/health', async () => ({ ok: true }))

  app.register(async (instance) => {
    await registerAuthRoutes(instance)
  }, { prefix: '/api/auth' })

  app.register(async (instance) => {
    await registerAdminRoutes(instance)
  }, { prefix: '/api/admin' })

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
