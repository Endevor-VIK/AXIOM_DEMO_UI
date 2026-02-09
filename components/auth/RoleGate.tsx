import React, { type PropsWithChildren } from 'react'

import { authMode } from '@/lib/identity/authService'
import { useSession } from '@/lib/identity/useSession'
import type { UserRole } from '@/lib/identity/types'

type RoleGateProps = PropsWithChildren<{
  roles: UserRole[]
  fallback?: React.ReactNode
}>

export default function RoleGate({ roles, fallback = null, children }: RoleGateProps) {
  const session = useSession()

  if (authMode === 'ghpages') return <>{fallback}</>
  if (session.isLoading) return <>{fallback}</>

  const userRoles = session.user?.roles ?? []
  const allowed = roles.some((role) => userRoles.includes(role))
  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
