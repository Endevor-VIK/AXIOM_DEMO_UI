import type { ContentCategory, ContentRenderMode } from './vfs'

declare global {
  interface Window {
    AX?: {
      analytics?: {
        track?: (event: AnalyticsEvent) => void
      }
    }
  }
}

export type AnalyticsEventName = 'content_view' | 'reader_open' | 'mode_switch'

export interface AnalyticsEventBase {
  name: AnalyticsEventName
  timestamp?: number
}

export interface ContentViewEvent extends AnalyticsEventBase {
  name: 'content_view'
  id: string
  category: ContentCategory | 'all'
  renderMode: ContentRenderMode
  lang?: string | null
  source?: 'list' | 'reader'
}

export interface ReaderOpenEvent extends AnalyticsEventBase {
  name: 'reader_open'
  id: string
  renderMode: ContentRenderMode
  from?: 'list' | 'direct'
}

export interface ModeSwitchEvent extends AnalyticsEventBase {
  name: 'mode_switch'
  id: string
  from: ContentRenderMode
  to: ContentRenderMode
}

export type AnalyticsEvent = ContentViewEvent | ReaderOpenEvent | ModeSwitchEvent

export interface AnalyticsAdapter {
  track(event: AnalyticsEvent): void
}

let adapter: AnalyticsAdapter | null = null

export function setAnalyticsAdapter(next: AnalyticsAdapter | null): void {
  adapter = next
}

function resolveWindowAdapter(): AnalyticsAdapter | null {
  if (typeof window === 'undefined') return null
  const bridge = window.AX?.analytics
  if (!bridge || typeof bridge.track !== 'function') return null
  return {
    track: (event) => {
      bridge.track?.(event)
    },
  }
}

function withTimestamp<T extends AnalyticsEvent>(event: T): T {
  if (event.timestamp) return event
  return { ...event, timestamp: Date.now() }
}

export function trackEvent(event: AnalyticsEvent): void {
  const prepared = withTimestamp(event)
  const target = adapter ?? resolveWindowAdapter()
  try {
    if (target) {
      target.track(prepared)
      return
    }
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.warn('[analytics] track failed', error)
    }
  }

  if (typeof console !== 'undefined') {
    console.debug('[analytics]', prepared)
  }
}

export function trackContentView(event: Omit<ContentViewEvent, 'name'>): void {
  trackEvent({ name: 'content_view', ...event })
}

export function trackReaderOpen(event: Omit<ReaderOpenEvent, 'name'>): void {
  trackEvent({ name: 'reader_open', ...event })
}

export function trackModeSwitch(event: Omit<ModeSwitchEvent, 'name'>): void {
  if (event.from === event.to) return
  trackEvent({ name: 'mode_switch', ...event })
}
