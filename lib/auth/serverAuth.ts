import type { Session, User } from '@/lib/identity/types'
import { markAdminForceReauthRequired } from '@/lib/admin/reauth'

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
let refreshInFlight: Promise<Session> | null = null

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

async function fetchJson(path: string, options: RequestInit = {}) {
  const hasBody = options.body !== undefined && options.body !== null
  const res = await fetch(path, {
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
      if (refreshInFlight) return refreshInFlight
      refreshInFlight = (async () => {
        try {
          const data = await fetchJson('/api/auth/me', { method: 'GET' })
          const user = toUser(data.user as ApiUser)
          cachedSession = { isAuthenticated: true, isLoading: false, user }
        } catch {
          cachedSession = { isAuthenticated: false, isLoading: false, user: null }
        }
        notify(cachedSession)
        return cachedSession
      })()
      try {
        return await refreshInFlight
      } finally {
        refreshInFlight = null
      }
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
      refreshInFlight = null
      markAdminForceReauthRequired()
      try {
        await fetchJson('/api/auth/logout', { method: 'POST' })
      } catch {
        // ignore
      }
      try {
        await fetchJson('/api/admin-auth/logout', {
          method: 'POST',
          keepalive: true,
        })
      } catch {
        // ignore
      }
      cachedSession = { isAuthenticated: false, isLoading: false, user: null }
      notify(cachedSession)
      return cachedSession
    },
  }
}
