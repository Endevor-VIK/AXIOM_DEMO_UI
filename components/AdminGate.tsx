import React, { type PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useSession } from '@/lib/identity/useSession'

export default function AdminGate({ children }: PropsWithChildren) {
  const session = useSession()
  const location = useLocation()

  if (session.isLoading) {
    return <div className='ax-page ax-loading'>ADMIN AUTH CHECK…</div>
  }

  if (!session.isAuthenticated) {
    return <Navigate to='/admin/login' replace state={{ from: location.pathname }} />
  }

  const roles = session.user?.roles ?? []
  if (!roles.includes('creator')) {
    return <Navigate to='/dashboard' replace />
  }

  return <>{children}</>
}
