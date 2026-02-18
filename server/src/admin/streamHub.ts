import type { FastifyReply } from 'fastify'

export type AdminStreamEventType = 'presence.update' | 'telemetry' | 'api.log' | 'axchat.log' | 'error'

type StreamClient = {
  id: number
  userId: string | null
  types: Set<string> | null
  reply: FastifyReply
  heartbeatTimer: NodeJS.Timeout
}

const clients = new Map<number, StreamClient>()
let nextClientId = 1

function encodeSse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function closeClient(clientId: number) {
  const client = clients.get(clientId)
  if (!client) return
  clearInterval(client.heartbeatTimer)
  clients.delete(clientId)
}

export function getAdminStreamStats() {
  return {
    connectedCount: clients.size,
  }
}

export function publishAdminStream(event: AdminStreamEventType, payload: Record<string, unknown>) {
  for (const [clientId, client] of clients.entries()) {
    if (client.types && !client.types.has(event)) continue
    if (client.userId && payload.userId && payload.userId !== client.userId) continue

    try {
      client.reply.raw.write(encodeSse(event, payload))
    } catch {
      closeClient(clientId)
    }
  }
}

export function subscribeAdminStream(
  reply: FastifyReply,
  options: {
    userId?: string
    types?: string[]
  } = {},
) {
  const clientId = nextClientId++
  const types = options.types?.map((value) => value.trim()).filter(Boolean)
  const typeSet = types && types.length ? new Set(types) : null

  reply.hijack()
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  reply.raw.write(encodeSse('ready', { ok: true, ts: Date.now() }))

  const heartbeatTimer = setInterval(() => {
    try {
      reply.raw.write(`: keepalive ${Date.now()}\n\n`)
    } catch {
      closeClient(clientId)
    }
  }, 15_000)

  clients.set(clientId, {
    id: clientId,
    userId: options.userId || null,
    types: typeSet,
    reply,
    heartbeatTimer,
  })

  const cleanup = () => {
    closeClient(clientId)
  }
  reply.raw.on('close', cleanup)
  reply.raw.on('error', cleanup)
}
