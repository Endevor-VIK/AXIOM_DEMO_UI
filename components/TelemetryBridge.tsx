import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { useSession } from '@/lib/identity/useSession'
import { flushTelemetryQueue, trackTelemetryEvent } from '@/lib/telemetry/client'

const HEARTBEAT_MS = 5_000

function resolvePath(pathname: string, search: string): string {
  const safePath = pathname || '/'
  const safeSearch = search || ''
  return `${safePath}${safeSearch}`
}

function extractContentId(path: string): string | null {
  const match = path.match(/\/dashboard\/content\/read\/([^/?#]+)/)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export default function TelemetryBridge() {
  const location = useLocation()
  const session = useSession()
  const lastPathRef = useRef<string>('')
  const lastActivityAtRef = useRef<number>(Date.now())

  const path = useMemo(() => resolvePath(location.pathname, location.search), [location.pathname, location.search])

  useEffect(() => {
    if (!session.isAuthenticated) return

    const markActivity = () => {
      lastActivityAtRef.current = Date.now()
    }

    window.addEventListener('pointerdown', markActivity, { passive: true })
    window.addEventListener('keydown', markActivity)
    window.addEventListener('scroll', markActivity, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', markActivity)
      window.removeEventListener('keydown', markActivity)
      window.removeEventListener('scroll', markActivity)
    }
  }, [session.isAuthenticated])

  useEffect(() => {
    if (!session.isAuthenticated) return

    const prevPath = lastPathRef.current
    if (prevPath && prevPath !== path) {
      trackTelemetryEvent({
        type: 'nav.route_change',
        payload: {
          from: prevPath,
          to: path,
        },
      })
    }

    const contentId = extractContentId(path)
    if (contentId) {
      trackTelemetryEvent({
        type: 'content.open',
        payload: {
          contentType: 'content',
          contentId,
        },
      })
    }

    lastPathRef.current = path
    void flushTelemetryQueue()
  }, [path, session.isAuthenticated])

  useEffect(() => {
    if (!session.isAuthenticated) return

    const emitHeartbeat = () => {
      const now = Date.now()
      trackTelemetryEvent({
        type: 'presence.heartbeat',
        payload: {
          path,
          visible: !document.hidden,
          idleMs: Math.max(0, now - lastActivityAtRef.current),
        },
      })
      void flushTelemetryQueue()
    }

    emitHeartbeat()

    const intervalId = window.setInterval(() => {
      emitHeartbeat()
    }, HEARTBEAT_MS)

    const onVisibility = () => {
      emitHeartbeat()
    }

    const onPageHide = () => {
      void flushTelemetryQueue()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [path, session.isAuthenticated])

  return null
}
