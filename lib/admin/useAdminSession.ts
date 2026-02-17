import { useEffect, useState } from 'react'

import { getAdminSession, refreshAdminSession, subscribeAdminSession } from './authService'
import type { Session } from '@/lib/identity/types'

export function useAdminSession(): Session {
  const [session, setSession] = useState<Session>(() => getAdminSession())

  useEffect(() => {
    const unsubscribe = subscribeAdminSession((next) => setSession(next))
    refreshAdminSession().catch(() => undefined)
    return () => unsubscribe()
  }, [])

  return session
}

export default useAdminSession
