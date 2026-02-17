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

async function fetchAdminJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
    throw new Error(message)
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
