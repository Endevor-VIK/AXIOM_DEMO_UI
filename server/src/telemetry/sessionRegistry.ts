import { config } from '../config'
import { sanitizeLogPayload } from '../logging/sanitize'

export type PresenceStatus = 'ONLINE' | 'IDLE' | 'OFFLINE'

export type SessionRegistryRow = {
  sessionId: string
  userId: string
  login: string
  role: string
  lastSeen: number
  connectedAt: number
  path: string
  visible: boolean
  ipMasked: string | null
  ua: string | null
  idleMs: number
  currentContentId: string | null
  currentContentType: string | null
  readProgress: number | null
  dwellMs: number | null
  lastActivityType: string
}

export type UserLiveSnapshot = {
  userId: string
  login: string
  role: string
  status: PresenceStatus
  lastSeen: number
  path: string
  visible: boolean
  idleMs: number
  ipMasked: string | null
  ua: string | null
  sessions: number
  currentContentId: string | null
  currentContentType: string | null
  readProgress: number | null
  dwellMs: number | null
}

export type TimelineEvent = {
  id: string
  ts: number
  userId: string
  sessionId: string
  requestId: string
  correlationId: string
  type: string
  payload: Record<string, unknown>
}

type IngestPayload = {
  userId: string
  login: string
  role: string
  sessionId: string
  requestId: string
  correlationId: string
  type: string
  payload: Record<string, unknown>
  tsServer: number
  ipMasked: string | null
  ua: string | null
}

const sessions = new Map<string, SessionRegistryRow>()
const timelineByUser = new Map<string, TimelineEvent[]>()
const MAX_TIMELINE_EVENTS = 500

function clampNumber(input: unknown, fallback = 0): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function toBoolean(input: unknown, fallback = true): boolean {
  if (typeof input === 'boolean') return input
  if (typeof input === 'number') return input > 0
  if (typeof input === 'string') {
    const value = input.trim().toLowerCase()
    if (value === 'true' || value === '1' || value === 'on') return true
    if (value === 'false' || value === '0' || value === 'off') return false
  }
  return fallback
}

function toStringSafe(input: unknown, fallback = ''): string {
  if (typeof input !== 'string') return fallback
  const trimmed = input.trim()
  return trimmed || fallback
}

function resolveStatus(lastSeen: number, visible: boolean, now = Date.now()): PresenceStatus {
  const ageMs = Math.max(0, now - lastSeen)
  if (ageMs <= config.adminPresenceOnlineMs && visible) return 'ONLINE'
  if (ageMs <= config.adminPresenceIdleMs) return 'IDLE'
  if (ageMs > config.adminPresenceOfflineMs) return 'OFFLINE'
  return 'IDLE'
}

function pushTimeline(userId: string, event: TimelineEvent) {
  const next = timelineByUser.get(userId) || []
  next.unshift(event)
  if (next.length > MAX_TIMELINE_EVENTS) {
    next.length = MAX_TIMELINE_EVENTS
  }
  timelineByUser.set(userId, next)
}

function buildTimelineEvent(input: IngestPayload): TimelineEvent {
  return {
    id: `${input.tsServer}:${input.sessionId}:${Math.random().toString(36).slice(2, 8)}`,
    ts: input.tsServer,
    userId: input.userId,
    sessionId: input.sessionId,
    requestId: input.requestId,
    correlationId: input.correlationId,
    type: input.type,
    payload: sanitizeLogPayload(input.payload) as Record<string, unknown>,
  }
}

function ensureSession(input: IngestPayload): SessionRegistryRow {
  const existing = sessions.get(input.sessionId)
  if (existing) {
    existing.userId = input.userId
    existing.login = input.login
    existing.role = input.role
    existing.ipMasked = input.ipMasked
    existing.ua = input.ua
    return existing
  }

  const created: SessionRegistryRow = {
    sessionId: input.sessionId,
    userId: input.userId,
    login: input.login,
    role: input.role,
    lastSeen: input.tsServer,
    connectedAt: input.tsServer,
    path: '/',
    visible: true,
    ipMasked: input.ipMasked,
    ua: input.ua,
    idleMs: 0,
    currentContentId: null,
    currentContentType: null,
    readProgress: null,
    dwellMs: null,
    lastActivityType: 'session.connect',
  }
  sessions.set(input.sessionId, created)
  return created
}

function applyPresenceHeartbeat(session: SessionRegistryRow, payload: Record<string, unknown>, tsServer: number) {
  session.lastSeen = tsServer
  session.path = toStringSafe(payload.path, session.path || '/')
  session.visible = toBoolean(payload.visible, session.visible)
  session.idleMs = clampNumber(payload.idleMs, session.idleMs)
  session.lastActivityType = 'presence.heartbeat'
}

function applyRouteChange(session: SessionRegistryRow, payload: Record<string, unknown>, tsServer: number) {
  const to = toStringSafe(payload.to)
  if (to) session.path = to
  session.lastSeen = tsServer
  session.lastActivityType = 'nav.route_change'
}

function applyContentOpen(session: SessionRegistryRow, payload: Record<string, unknown>, tsServer: number) {
  const nextContentId = toStringSafe(payload.contentId, session.currentContentId || '')
  const nextContentType = toStringSafe(payload.contentType, session.currentContentType || '')
  if (nextContentId) session.currentContentId = nextContentId
  if (nextContentType) session.currentContentType = nextContentType
  session.lastSeen = tsServer
  session.lastActivityType = 'content.open'
}

function applyReadProgress(session: SessionRegistryRow, payload: Record<string, unknown>, tsServer: number) {
  const contentId = toStringSafe(payload.contentId)
  if (contentId) session.currentContentId = contentId

  const contentType = toStringSafe(payload.contentType)
  if (contentType) session.currentContentType = contentType

  const progress = clampNumber(payload.progress, Number.NaN)
  if (Number.isFinite(progress)) {
    session.readProgress = Math.max(0, Math.min(100, progress))
  }

  const dwellMs = clampNumber(payload.dwellMs, Number.NaN)
  if (Number.isFinite(dwellMs)) {
    session.dwellMs = Math.max(0, dwellMs)
  }

  session.lastSeen = tsServer
  session.lastActivityType = 'content.read_progress'
}

export function ingestTelemetryEvent(input: IngestPayload) {
  const session = ensureSession(input)

  if (input.type === 'presence.heartbeat') {
    applyPresenceHeartbeat(session, input.payload, input.tsServer)
  } else if (input.type === 'nav.route_change') {
    applyRouteChange(session, input.payload, input.tsServer)
  } else if (input.type === 'content.open') {
    applyContentOpen(session, input.payload, input.tsServer)
  } else if (input.type === 'content.read_progress') {
    applyReadProgress(session, input.payload, input.tsServer)
  } else {
    session.lastSeen = input.tsServer
    session.lastActivityType = input.type
  }

  pushTimeline(input.userId, buildTimelineEvent(input))
}

export function ingestAxchatActivity(input: {
  userId: string
  sessionId: string
  requestId: string
  conversationId: string
  role: 'user' | 'ai' | 'system'
  type: 'axchat.message' | 'axchat.error'
  text: string
  tsServer: number
}) {
  const event: TimelineEvent = {
    id: `${input.tsServer}:${input.sessionId}:axchat:${Math.random().toString(36).slice(2, 8)}`,
    ts: input.tsServer,
    userId: input.userId,
    sessionId: input.sessionId,
    requestId: input.requestId,
    correlationId: input.requestId,
    type: input.type,
    payload: {
      role: input.role,
      text: input.text,
      conversationId: input.conversationId,
    },
  }
  pushTimeline(input.userId, event)
}

export function getUserPresence(userId: string, now = Date.now()): UserLiveSnapshot | null {
  const rows = [...sessions.values()].filter((entry) => entry.userId === userId)
  if (!rows.length) return null

  rows.sort((a, b) => b.lastSeen - a.lastSeen)
  const head = rows[0]!

  return {
    userId: head.userId,
    login: head.login,
    role: head.role,
    status: resolveStatus(head.lastSeen, head.visible, now),
    lastSeen: head.lastSeen,
    path: head.path,
    visible: head.visible,
    idleMs: Math.max(0, now - head.lastSeen),
    ipMasked: head.ipMasked,
    ua: head.ua,
    sessions: rows.length,
    currentContentId: head.currentContentId,
    currentContentType: head.currentContentType,
    readProgress: head.readProgress,
    dwellMs: head.dwellMs,
  }
}

export function getLiveSnapshot(now = Date.now()) {
  const users = new Map<string, UserLiveSnapshot>()
  for (const session of sessions.values()) {
    const current = users.get(session.userId)
    if (!current || session.lastSeen > current.lastSeen) {
      users.set(session.userId, {
        userId: session.userId,
        login: session.login,
        role: session.role,
        status: resolveStatus(session.lastSeen, session.visible, now),
        lastSeen: session.lastSeen,
        path: session.path,
        visible: session.visible,
        idleMs: Math.max(0, now - session.lastSeen),
        ipMasked: session.ipMasked,
        ua: session.ua,
        sessions: 1,
        currentContentId: session.currentContentId,
        currentContentType: session.currentContentType,
        readProgress: session.readProgress,
        dwellMs: session.dwellMs,
      })
    } else {
      current.sessions += 1
      if (session.lastSeen > current.lastSeen) {
        current.lastSeen = session.lastSeen
        current.status = resolveStatus(session.lastSeen, session.visible, now)
        current.path = session.path
        current.visible = session.visible
        current.idleMs = Math.max(0, now - session.lastSeen)
      }
    }
  }

  const usersOnline = [...users.values()].sort((a, b) => {
    const order = (status: PresenceStatus) => (status === 'ONLINE' ? 0 : status === 'IDLE' ? 1 : 2)
    return order(a.status) - order(b.status) || b.lastSeen - a.lastSeen
  })

  let online = 0
  let idle = 0
  let offline = 0
  for (const user of usersOnline) {
    if (user.status === 'ONLINE') online += 1
    else if (user.status === 'IDLE') idle += 1
    else offline += 1
  }

  const fiveMin = now - 5 * 60 * 1000
  let errorsLast5m = 0
  let axchatLast5m = 0
  for (const timeline of timelineByUser.values()) {
    for (const event of timeline) {
      if (event.ts < fiveMin) break
      if (event.type.startsWith('error.')) errorsLast5m += 1
      if (event.type.startsWith('axchat.')) axchatLast5m += 1
    }
  }

  return {
    serverTime: now,
    usersOnline,
    counters: {
      online,
      idle,
      offline,
      errorsLast5m,
      axchatLast5m,
    },
  }
}

export function getUserTimeline(userId: string, options: {
  limit?: number
  types?: string[]
  cursor?: string
} = {}) {
  const limit = Math.min(Math.max(1, Math.floor(options.limit || 120)), 500)
  const types = (options.types || []).map((value) => value.trim()).filter(Boolean)
  const cursorTs = Number.isFinite(Number(options.cursor)) ? Number(options.cursor) : Number.MAX_SAFE_INTEGER

  const timeline = timelineByUser.get(userId) || []
  const filtered = timeline.filter((event) => {
    if (event.ts >= cursorTs) return false
    if (types.length && !types.includes(event.type)) return false
    return true
  })

  const items = filtered.slice(0, limit)
  const nextCursor = filtered.length > limit ? String(items[items.length - 1]?.ts || '') : null

  return {
    items,
    nextCursor,
  }
}
