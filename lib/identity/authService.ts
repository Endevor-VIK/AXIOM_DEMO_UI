import type { Session, User } from './types'

const SESSION_KEY = 'ax_session_v1'
const LEGACY_AUTH_KEY = 'axiom.auth'

const DEMO_USER: User = {
  id: 'demo-user',
  displayName: 'CREATOR',
  handle: '@endeavor_prime',
  role: 'user',
  lang: 'EN',
}

type SessionListener = (session: Session) => void

const listeners = new Set<SessionListener>()
let legacyMigrated = false

function normalizeHandle(candidate?: string): string {
  if (!candidate) return DEMO_USER.handle
  const trimmed = candidate.trim()
  if (!trimmed) return DEMO_USER.handle
  const prefixed = trimmed.startsWith('@') ? trimmed : `@${trimmed}`
  return prefixed.replace(/\s+/g, '_')
}

function parseUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null
  const payload = raw as Record<string, unknown>
  const id = typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : null
  const displayName =
    typeof payload.displayName === 'string' && payload.displayName.trim()
      ? payload.displayName.trim()
      : null
  const handle = typeof payload.handle === 'string' && payload.handle.trim() ? payload.handle : null
  const role = payload.role === 'admin' || payload.role === 'user' || payload.role === 'guest'
    ? payload.role
    : 'user'
  if (!id || !displayName) return null
  const normalized: User = {
    id,
    displayName,
    handle: normalizeHandle(handle ?? displayName),
    role,
  }
  const lang = payload.lang === 'RU' || payload.lang === 'EN' ? payload.lang : null
  const avatar = typeof payload.avatarUrl === 'string' && payload.avatarUrl.trim() ? payload.avatarUrl : null
  if (lang) normalized.lang = lang
  if (avatar) normalized.avatarUrl = avatar
  return normalized
}

function emptySession(): Session {
  return { isAuthenticated: false, user: null }
}

function notify(session?: Session): void {
  const payload = session ?? getSession()
  listeners.forEach((listener) => {
    try {
      listener(payload)
    } catch {
      // ignore listener errors
    }
  })
}

function readSessionFromStorage(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const user = parseUser((parsed as any).user)
    const isAuthenticated = Boolean((parsed as any).isAuthenticated)
    if (!isAuthenticated || !user) return null
    return { isAuthenticated: true, user }
  } catch {
    return null
  }
}

function migrateLegacy(): Session | null {
  if (legacyMigrated) return null
  legacyMigrated = true
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LEGACY_AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const login = typeof parsed?.login === 'string' ? parsed.login.trim() : ''
    if (!login) return null
    const user: User = {
      id: `user-${login.toLowerCase()}`,
      displayName: login.toUpperCase(),
      handle: normalizeHandle(login),
      role: 'user',
      lang: 'EN',
    }
    const session: Session = { isAuthenticated: true, user }
    setSession(session)
    return session
  } catch {
    return null
  }
}

function persistSession(session: Session): Session {
  if (typeof window === 'undefined') return session
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // ignore quota errors
  }
  notify(session)
  return session
}

export function getSession(): Session {
  return readSessionFromStorage() ?? migrateLegacy() ?? emptySession()
}

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function loginDemo(overrides?: Partial<User>): Session {
  const user: User = {
    id: overrides?.id?.trim() || DEMO_USER.id,
    displayName: overrides?.displayName?.trim() || DEMO_USER.displayName,
    handle: normalizeHandle(overrides?.handle || overrides?.displayName || DEMO_USER.handle),
    role: overrides?.role ?? DEMO_USER.role,
  }
  const lang = overrides?.lang ?? DEMO_USER.lang
  const avatar = overrides?.avatarUrl
  if (lang) user.lang = lang
  if (avatar) user.avatarUrl = avatar
  return persistSession({ isAuthenticated: true, user })
}

export function setSession(session: Session): Session {
  if (!session.user || !session.isAuthenticated) return logout()
  const user = parseUser(session.user) ?? DEMO_USER
  return persistSession({ isAuthenticated: true, user })
}

export function logout(): Session {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      // ignore
    }
  }
  const session = emptySession()
  notify(session)
  return session
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_KEY || event.key === LEGACY_AUTH_KEY) {
      notify()
    }
  })
}
