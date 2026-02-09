import { useEffect, useState } from 'react'

import { getSession, refreshSession, subscribeSession } from './authService'
import type { Session } from './types'

export function useSession(): Session {
  const [session, setSession] = useState<Session>(() => getSession())

  useEffect(() => {
    const unsub = subscribeSession((next) => setSession(next))
    refreshSession().catch(() => undefined)
    return () => unsub()
  }, [])

  return session
}

export default useSession
