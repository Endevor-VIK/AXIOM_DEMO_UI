import type { Session, User } from '@/lib/identity/types'

type AdminCredentials = {
  email: string
  password: string
}

type ApiUser = {
  id: string
  email?: string
  displayName?: string
  handle?: string
  roles?: string[]
}

const listeners = new Set<(session: Session) => void>()
let cachedSession: Session = { isAuthenticated: false, isLoading: true, user: null }

function notify(session: Session) {
  listeners.forEach((listener) => {
    try {
      listener(session)
    } catch {
      // ignore listener errors
    }
  })
}

function toUser(payload: ApiUser): User {
  const email = payload.email
  const emailBase = email ? email.split('@')[0] : undefined
  const base = emailBase || payload.displayName || 'USER'
  return {
    id: payload.id,
    displayName: payload.displayName || base.toUpperCase(),
    handle: payload.handle || `@${base.toLowerCase()}`,
    roles: (payload.roles ?? ['user']) as User['roles'],
    lang: 'EN',
    ...(email !== undefined ? { email } : {}),
  }
}

async function fetchAdminAuthJson(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let error = 'request_failed'
    try {
      const payload = await response.json()
      error = payload?.error || error
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(error)
  }

  return response.json()
}

export function getAdminSession(): Session {
  return cachedSession
}

export function subscribeAdminSession(listener: (session: Session) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function refreshAdminSession(): Promise<Session> {
  try {
    const data = await fetchAdminAuthJson('/api/admin-auth/me', { method: 'GET' })
    const user = toUser(data.user as ApiUser)
    cachedSession = { isAuthenticated: true, isLoading: false, user }
  } catch {
    cachedSession = { isAuthenticated: false, isLoading: false, user: null }
  }
  notify(cachedSession)
  return cachedSession
}

export async function adminLogin(credentials: AdminCredentials): Promise<Session> {
  const data = await fetchAdminAuthJson('/api/admin-auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  const user = toUser(data.user as ApiUser)
  cachedSession = { isAuthenticated: true, isLoading: false, user }
  notify(cachedSession)
  return cachedSession
}

export async function adminLogout(): Promise<Session> {
  try {
    await fetchAdminAuthJson('/api/admin-auth/logout', { method: 'POST' })
  } catch {
    // ignore transport errors during logout
  }
  cachedSession = { isAuthenticated: false, isLoading: false, user: null }
  notify(cachedSession)
  return cachedSession
}
