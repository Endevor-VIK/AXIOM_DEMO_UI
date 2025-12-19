import { useEffect, useState } from 'react'

import { getSession, subscribeSession } from './authService'
import type { Session } from './types'

export function useSession(): Session {
  const [session, setSession] = useState<Session>(() => getSession())

  useEffect(() => {
    return subscribeSession((next) => setSession(next))
  }, [])

  return session
}

export default useSession
