import { resolveDeployTarget } from './deploy'
import { createDemoAuth } from './demoAuth'
import { createServerAuth } from './serverAuth'
import type { AuthProvider } from './types'

const target = resolveDeployTarget()
const provider: AuthProvider = target === 'ghpages' ? createDemoAuth() : createServerAuth()

export const auth = provider

export const getSession = provider.getSession
export const subscribeSession = provider.subscribeSession
export const refreshSession = provider.refreshSession
export const login = provider.login
export const register = provider.register
export const logout = provider.logout
export const loginDemo =
  provider.loginDemo ||
  (() => {
    throw new Error('demo_only')
  })
export const authMode = provider.mode
