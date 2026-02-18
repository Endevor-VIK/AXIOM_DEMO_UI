export type TelemetryEventInput = {
  type: string
  payload?: Record<string, unknown>
  tsClient?: number
}

type PendingTelemetryEvent = {
  type: string
  ts_client: number
  payload: Record<string, unknown>
}

const MAX_QUEUE = 200
const MAX_BATCH = 40

let queue: PendingTelemetryEvent[] = []
let inFlight = false

function normalizePayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
  return payload
}

function enqueue(event: PendingTelemetryEvent) {
  queue.push(event)
  if (queue.length > MAX_QUEUE) {
    queue = queue.slice(queue.length - MAX_QUEUE)
  }
}

export function trackTelemetryEvent(input: TelemetryEventInput) {
  const type = (input.type || '').trim()
  if (!type) return
  enqueue({
    type,
    ts_client: Number.isFinite(input.tsClient) ? Number(input.tsClient) : Date.now(),
    payload: normalizePayload(input.payload),
  })
}

export async function flushTelemetryQueue() {
  if (inFlight) return
  if (!queue.length) return

  inFlight = true
  const batch = queue.slice(0, MAX_BATCH)

  try {
    const response = await fetch('/api/telemetry/events', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })

    if (!response.ok) {
      return
    }

    queue = queue.slice(batch.length)
  } catch {
    // keep queue for retry
  } finally {
    inFlight = false
  }
}

export function clearTelemetryQueue() {
  queue = []
}
