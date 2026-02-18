export type AdminUserRecord = {
  id: string
  email: string
  roles: string[]
  createdAt: number
  updatedAt: number
}

export type AdminAuditEventRecord = {
  id: number
  createdAt: number
  actorUserId: string | null
  subjectUserId: string | null
  scope: string
  eventType: string
  status: string | null
  message: string | null
  ip: string | null
  ua: string | null
  device: string
  region: string
  network: string
  payload: Record<string, unknown> | null
}

export type AdminSessionSnapshot = {
  id: string
  createdAt: number
  expiresAt: number
  revokedAt: number | null
  ip: string | null
  ua: string | null
  device: string
  region: string
  network: string
}

export type AdminUserHistory = {
  sessions: AdminSessionSnapshot[]
  events: AdminAuditEventRecord[]
}

export type AdminPresenceStatus = 'ONLINE' | 'IDLE' | 'OFFLINE'

export type AdminLiveUser = {
  userId: string
  login: string
  role: string
  status: AdminPresenceStatus
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

export type AdminLiveSnapshot = {
  serverTime: number
  usersOnline: AdminLiveUser[]
  counters: {
    online: number
    idle: number
    offline: number
    errorsLast5m: number
    axchatLast5m: number
  }
  streamsMeta?: {
    sse?: {
      connectedCount?: number
    }
  }
}

export type AdminTimelineEvent = {
  id: string
  ts: number
  userId: string
  sessionId: string
  requestId: string
  correlationId: string
  type: string
  payload: Record<string, unknown>
}

export type AdminAxchatEntry = {
  ts: number
  userId: string
  login: string | null
  sessionId: string | null
  conversationId: string | null
  requestId: string | null
  type: 'axchat.message' | 'axchat.error'
  role: 'user' | 'ai' | 'system'
  text: string
  meta?: Record<string, unknown>
}

type AdminUsersResponse = {
  users: AdminUserRecord[]
}

type AdminUserResponse = {
  user: {
    id: string
    email: string
    roles: string[]
  } | null
  ok?: boolean
  emailChanged?: boolean
  passwordChanged?: boolean
}

type HealthResponse = {
  ok: boolean
}

type AdminEventsResponse = {
  events: AdminAuditEventRecord[]
}

type AdminHistoryResponse = {
  sessions: AdminSessionSnapshot[]
  events: AdminAuditEventRecord[]
}

type AdminLiveSnapshotResponse = AdminLiveSnapshot

type AdminTimelineResponse = {
  items: AdminTimelineEvent[]
  nextCursor: string | null
}

type AdminAxchatResponse = {
  items: AdminAxchatEntry[]
  nextCursor: string | null
}

async function fetchAdminJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hasBody = options.body !== undefined && options.body !== null
  const response = await fetch(path, {
    credentials: 'include',
    cache: 'no-store',
    headers: hasBody
      ? {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        }
      : {
          ...(options.headers || {}),
        },
    ...options,
  })

  if (!response.ok) {
    let message = 'request_failed'
    try {
      const payload = await response.json()
      if (typeof payload?.error === 'string') {
        message = payload.error
      }
    } catch {
      // ignore JSON parse failure
    }
    const error = new Error(message) as Error & { status?: number; code?: string }
    error.status = response.status
    error.code = message
    throw error
  }

  return response.json() as Promise<T>
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const payload = await fetchAdminJson<AdminUsersResponse>('/api/admin/users', { method: 'GET' })
  return payload.users
}

export async function createAdminUser(input: {
  email: string
  password: string
  roles: string[]
}): Promise<void> {
  await fetchAdminJson<AdminUserResponse>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateAdminUserRoles(userId: string, roles: string[]): Promise<void> {
  await fetchAdminJson<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
  })
}

export async function updateAdminUserCredentials(input: {
  userId: string
  email?: string
  password?: string
}): Promise<{
  user: { id: string; email: string; roles: string[] } | null
  emailChanged: boolean
  passwordChanged: boolean
}> {
  const payload = await fetchAdminJson<AdminUserResponse>(`/api/admin/users/${encodeURIComponent(input.userId)}/credentials`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.password !== undefined ? { password: input.password } : {}),
    }),
  })
  return {
    user: payload.user ?? null,
    emailChanged: Boolean(payload.emailChanged),
    passwordChanged: Boolean(payload.passwordChanged),
  }
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await fetchAdminJson<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}

export async function fetchAdminHealth(): Promise<HealthResponse> {
  return fetchAdminJson<HealthResponse>('/api/health', { method: 'GET' })
}

export async function listAdminEvents(limit = 80): Promise<AdminAuditEventRecord[]> {
  const payload = await fetchAdminJson<AdminEventsResponse>(`/api/admin/events?limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
  })
  return payload.events
}

export async function fetchAdminUserHistory(userId: string, limit = 120): Promise<AdminUserHistory> {
  const payload = await fetchAdminJson<AdminHistoryResponse>(
    `/api/admin/users/${encodeURIComponent(userId)}/history?limit=${encodeURIComponent(limit)}`,
    { method: 'GET' },
  )
  return {
    sessions: payload.sessions,
    events: payload.events,
  }
}

export async function fetchAdminSnapshot(): Promise<AdminLiveSnapshot> {
  return fetchAdminJson<AdminLiveSnapshotResponse>('/api/admin/snapshot', { method: 'GET' })
}

export async function fetchAdminUserTimeline(input: {
  userId: string
  limit?: number
  types?: string[]
  cursor?: string
}): Promise<AdminTimelineResponse> {
  const params = new URLSearchParams()
  if (input.limit) params.set('limit', String(input.limit))
  if (input.types?.length) params.set('types', input.types.join(','))
  if (input.cursor) params.set('cursor', input.cursor)

  const suffix = params.toString() ? `?${params.toString()}` : ''
  return fetchAdminJson<AdminTimelineResponse>(
    `/api/admin/users/${encodeURIComponent(input.userId)}/timeline${suffix}`,
    { method: 'GET' },
  )
}

export async function fetchAdminUserAxchat(input: {
  userId: string
  limit?: number
  from?: number
  to?: number
  q?: string
  cursor?: string
}): Promise<AdminAxchatResponse> {
  const params = new URLSearchParams()
  if (input.limit) params.set('limit', String(input.limit))
  if (input.from) params.set('from', String(input.from))
  if (input.to) params.set('to', String(input.to))
  if (input.q) params.set('q', input.q)
  if (input.cursor) params.set('cursor', input.cursor)
  const suffix = params.toString() ? `?${params.toString()}` : ''

  return fetchAdminJson<AdminAxchatResponse>(
    `/api/admin/users/${encodeURIComponent(input.userId)}/axchat${suffix}`,
    { method: 'GET' },
  )
}

export function createAdminStream(input: { userId?: string; types?: string[] } = {}) {
  const params = new URLSearchParams()
  if (input.userId) params.set('userId', input.userId)
  if (input.types?.length) params.set('types', input.types.join(','))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return new EventSource(`/api/admin/stream${suffix}`, { withCredentials: true })
}
