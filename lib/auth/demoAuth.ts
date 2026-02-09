import type { Session, User } from '@/lib/identity/types'

import type { AuthCredentials, AuthProvider } from './types'

const USERS_KEY = 'ax_demo_users_v1'
const SESSION_KEY = 'ax_demo_session_v1'
const LEGACY_SESSION_KEY = 'ax_session_v1'

type DemoUser = {
  email: string
  passwordHash: string
  createdAt: number
}

const listeners = new Set<(session: Session) => void>()
let cachedSession: Session | null = null

function emptySession(): Session {
  return { isAuthenticated: false, isLoading: false, user: null }
}

function notify(session: Session) {
  listeners.forEach((listener) => {
    try {
      listener(session)
    } catch {
      // ignore
    }
  })
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function toUser(email: string): User {
  const base = email.split('@')[0] || email
  return {
    id: `demo-${base.toLowerCase()}`,
    email,
    displayName: base.toUpperCase(),
    handle: `@${base.toLowerCase()}`,
    roles: ['user'],
    lang: 'EN',
  }
}

async function hashPassword(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function readUsers(): DemoUser[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DemoUser[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: DemoUser[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readSession(): Session {
  if (cachedSession) return cachedSession
  if (typeof window === 'undefined') return emptySession()
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) {
      const legacy = readLegacySession()
      if (legacy) {
        cachedSession = legacy
        return legacy
      }
      return emptySession()
    }
    const parsed = JSON.parse(raw) as { email?: string }
    if (!parsed?.email) return emptySession()
    const session: Session = { isAuthenticated: true, isLoading: false, user: toUser(parsed.email) }
    cachedSession = session
    return session
  } catch {
    const legacy = readLegacySession()
    if (legacy) {
      cachedSession = legacy
      return legacy
    }
    return emptySession()
  }
}

function readLegacySession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LEGACY_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { isAuthenticated?: boolean; user?: Partial<User> }
    if (!parsed?.isAuthenticated || !parsed.user?.id) return null
    const email = parsed.user.email
    const lang = parsed.user.lang
    const avatarUrl = parsed.user.avatarUrl
    const legacyUser: User = {
      id: String(parsed.user.id),
      displayName: parsed.user.displayName || 'USER',
      handle: parsed.user.handle || '@user',
      roles: (parsed.user.roles as User['roles']) || ['user'],
      ...(email !== undefined ? { email } : {}),
      ...(lang !== undefined ? { lang } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    }
    return { isAuthenticated: true, isLoading: false, user: legacyUser }
  } catch {
    return null
  }
}

function persistSession(session: Session) {
  cachedSession = session
  if (typeof window !== 'undefined') {
    if (!session.isAuthenticated || !session.user) {
      window.localStorage.removeItem(SESSION_KEY)
      window.localStorage.removeItem(LEGACY_SESSION_KEY)
    } else {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify({ email: session.user.email || '' }))
      window.localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify(session))
    }
  }
  notify(session)
}

export function createDemoAuth(): AuthProvider {
  return {
    mode: 'ghpages',
    getSession() {
      return readSession()
    },
    subscribeSession(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async refreshSession() {
      const session = readSession()
      notify(session)
      return session
    },
    async register(credentials: AuthCredentials) {
      const email = normalizeEmail(credentials.email)
      if (!email || !credentials.password) {
        throw new Error('missing_credentials')
      }
      const users = readUsers()
      if (users.some((u) => u.email === email)) {
        throw new Error('user_exists')
      }
      const passwordHash = await hashPassword(credentials.password)
      users.push({ email, passwordHash, createdAt: Date.now() })
      writeUsers(users)
      const session: Session = { isAuthenticated: true, isLoading: false, user: toUser(email) }
      persistSession(session)
      return session
    },
    async login(credentials: AuthCredentials) {
      const email = normalizeEmail(credentials.email)
      if (!email || !credentials.password) {
        throw new Error('missing_credentials')
      }
      const users = readUsers()
      const user = users.find((u) => u.email === email)
      if (!user) throw new Error('invalid_credentials')
      const passwordHash = await hashPassword(credentials.password)
      if (passwordHash !== user.passwordHash) throw new Error('invalid_credentials')
      const session: Session = { isAuthenticated: true, isLoading: false, user: toUser(email) }
      persistSession(session)
      return session
    },
    async logout() {
      const session = emptySession()
      persistSession(session)
      return session
    },
    loginDemo(overrides?: Partial<User>) {
      const seed = overrides?.email || overrides?.handle?.replace('@', '') || overrides?.displayName || 'demo'
      const baseUser = toUser(seed.includes('@') ? seed : `${seed}@demo.local`)
      const user: User = {
        ...baseUser,
        ...overrides,
        roles: overrides?.roles ?? baseUser.roles,
      }
      const session: Session = { isAuthenticated: true, isLoading: false, user }
      persistSession(session)
      return session
    },
  }
}
