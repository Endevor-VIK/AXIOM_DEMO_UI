import type { Session, User } from '@/lib/identity/types'

import type { AuthCredentials, AuthProvider } from './types'

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
      // ignore
    }
  })
}

function toUser(payload: ApiUser): User {
  const email = payload.email
  const base = email ? email.split('@')[0] : payload.displayName || 'USER'
  return {
    id: payload.id,
    email,
    displayName: payload.displayName || base.toUpperCase(),
    handle: payload.handle || `@${base.toLowerCase()}`,
    roles: (payload.roles ?? ['user']) as User['roles'],
    lang: 'EN',
  }
}

async function fetchJson(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  if (!res.ok) {
    let error = 'request_failed'
    try {
      const payload = await res.json()
      error = payload?.error || error
    } catch {
      // noop
    }
    throw new Error(error)
  }
  return res.json()
}

export function createServerAuth(): AuthProvider {
  return {
    mode: 'local',
    getSession() {
      return cachedSession
    },
    subscribeSession(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async refreshSession() {
      try {
        const data = await fetchJson('/api/auth/me', { method: 'GET' })
        const user = toUser(data.user as ApiUser)
        cachedSession = { isAuthenticated: true, isLoading: false, user }
      } catch {
        cachedSession = { isAuthenticated: false, isLoading: false, user: null }
      }
      notify(cachedSession)
      return cachedSession
    },
    async login(credentials: AuthCredentials) {
      const data = await fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
      const user = toUser(data.user as ApiUser)
      cachedSession = { isAuthenticated: true, isLoading: false, user }
      notify(cachedSession)
      return cachedSession
    },
    async register(credentials: AuthCredentials) {
      const data = await fetchJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
      const user = toUser(data.user as ApiUser)
      cachedSession = { isAuthenticated: true, isLoading: false, user }
      notify(cachedSession)
      return cachedSession
    },
    async logout() {
      try {
        await fetchJson('/api/auth/logout', { method: 'POST' })
      } catch {
        // ignore
      }
      cachedSession = { isAuthenticated: false, isLoading: false, user: null }
      notify(cachedSession)
      return cachedSession
    },
  }
}
