import { setAnalyticsAdapter } from './analytics'

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, payload?: Record<string, unknown>) => void
    }
    gtag?: (...args: unknown[]) => void
  }
}

let initialized = false

export function initAnalyticsBridge(): void {
  if (initialized) return
  if (typeof window === 'undefined') return

  const posthog = window.posthog
  if (posthog && typeof posthog.capture === 'function') {
    setAnalyticsAdapter({
      track(event) {
        posthog.capture(event.name, event)
      },
    })
    initialized = true
    return
  }

  const gtag = window.gtag
  if (typeof gtag === 'function') {
    setAnalyticsAdapter({
      track(event) {
        gtag('event', event.name, event)
      },
    })
    initialized = true
  }
}
