// AXIOM_DEMO_UI — WEB CORE
// Canvas: C14 — components/AuthGate.tsx
// Purpose: Route guard. Blocks access to protected routes if not authenticated.

import React, { type PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useSession } from '@/lib/identity/useSession'

export default function AuthGate({ children }: PropsWithChildren) {
  const session = useSession()
  const loc = useLocation()

  if (session.isLoading) {
    return <div className='ax-page ax-loading'>AUTH CHECK…</div>
  }

  if (!session.isAuthenticated) {
    return <Navigate to='/login' replace state={{ from: loc.pathname }} />
  }

  return <>{children}</>
}
