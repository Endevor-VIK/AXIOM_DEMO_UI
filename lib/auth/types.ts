import type { Session, User } from '@/lib/identity/types'

export type AuthCredentials = {
  email: string
  password: string
  displayName?: string
}

export type AuthProvider = {
  getSession: () => Session
  subscribeSession: (listener: (session: Session) => void) => () => void
  refreshSession: () => Promise<Session>
  login: (credentials: AuthCredentials) => Promise<Session>
  register: (credentials: AuthCredentials) => Promise<Session>
  logout: () => Promise<Session>
  loginDemo?: (overrides?: Partial<User>) => Session
  mode: 'local' | 'ghpages'
}
