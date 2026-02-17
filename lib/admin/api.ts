export type AdminUserRecord = {
  id: string
  email: string
  roles: string[]
  createdAt: number
  updatedAt: number
}

type AdminUsersResponse = {
  users: AdminUserRecord[]
}

type AdminUserResponse = {
  user: {
    id: string
    email: string
    roles: string[]
  }
}

type HealthResponse = {
  ok: boolean
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

export async function deleteAdminUser(userId: string): Promise<void> {
  await fetchAdminJson<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}

export async function fetchAdminHealth(): Promise<HealthResponse> {
  return fetchAdminJson<HealthResponse>('/api/health', { method: 'GET' })
}
