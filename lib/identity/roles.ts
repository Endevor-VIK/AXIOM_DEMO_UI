import type { UserRole } from './types'

export function resolvePrimaryRole(roles?: UserRole[] | null): UserRole {
  if (!roles || !roles.length) return 'user'
  if (roles.includes('creator')) return 'creator'
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('dev')) return 'dev'
  if (roles.includes('test')) return 'test'
  return 'user'
}
