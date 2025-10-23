import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  setAnalyticsAdapter,
  trackContentView,
  trackModeSwitch,
  type AnalyticsEvent,
} from '../lib/analytics'

describe('analytics', () => {
  afterEach(() => {
    setAnalyticsAdapter(null)
  })

  it('delegates events to the configured adapter with timestamp', () => {
    const handler = vi.fn()
    setAnalyticsAdapter({
      track: handler,
    })

    trackContentView({
      id: 'LOC-0001',
      category: 'locations',
      renderMode: 'plain',
      lang: 'en',
      source: 'list',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0]![0] as AnalyticsEvent
    expect(event.name).toBe('content_view')
    expect(typeof event.timestamp).toBe('number')
  })

  it('skips mode switch when mode is unchanged', () => {
    const handler = vi.fn()
    setAnalyticsAdapter({
      track: handler,
    })

    trackModeSwitch({
      id: 'LOC-0001',
      from: 'plain',
      to: 'plain',
    })

    expect(handler).not.toHaveBeenCalled()
  })
})
