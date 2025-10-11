import type { CleanupFn } from './types'

const DEFAULT_SELECTOR = '[data-tilt]'
const DEFAULT_MAX = 4
const DEFAULT_PERSPECTIVE = 900

interface TiltOptions {
  selector?: string
  pointerFine?: boolean
  reducedMotion?: boolean
  requestFrame?: (cb: FrameRequestCallback) => number
  cancelFrame?: (handle: number) => void
}

interface TiltConfig {
  max: number
  perspective: number
}

function getGlobalScope(): typeof globalThis | undefined {
  if (typeof window !== 'undefined') return window
  if (typeof globalThis !== 'undefined') return globalThis
  return undefined
}

function getMatchMedia(): ((query: string) => MediaQueryList) | null {
  const scope = getGlobalScope()
  if (!scope || typeof scope.matchMedia !== 'function') {
    return null
  }
  return (query: string) => scope.matchMedia(query)
}

function shouldSkipViaMedia(options: TiltOptions): boolean {
  if (options.reducedMotion !== undefined) {
    if (options.reducedMotion) return true
  } else {
    const match = getMatchMedia()
    if (match?.('(prefers-reduced-motion: reduce)').matches) {
      return true
    }
  }

  if (options.pointerFine !== undefined) {
    return !options.pointerFine
  }

  const match = getMatchMedia()
  if (!match) return false
  const pointerFine = match('(pointer:fine)').matches
  return !pointerFine
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getConfig(element: HTMLElement): TiltConfig {
  const { dataset } = element
  const max = parseNumber(dataset.tiltMax, DEFAULT_MAX)
  const perspective = parseNumber(dataset.tiltPerspective, DEFAULT_PERSPECTIVE)
  return { max, perspective }
}

export function attachTilt(root: ParentNode, options: TiltOptions = {}): CleanupFn {
  if (!root) {
    return () => {}
  }

  const selector = options.selector ?? DEFAULT_SELECTOR
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector))
  if (!elements.length) {
    return () => {}
  }

  if (shouldSkipViaMedia(options)) {
    return () => {}
  }

  const scope = getGlobalScope()
  const request =
    options.requestFrame ??
    (scope && typeof scope.requestAnimationFrame === 'function'
      ? scope.requestAnimationFrame.bind(scope)
      : (cb: FrameRequestCallback) => {
          const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now()
          cb(now)
          return 0
        })

  const cancel =
    options.cancelFrame ??
    (scope && typeof scope.cancelAnimationFrame === 'function'
      ? scope.cancelAnimationFrame.bind(scope)
      : () => {})

  const cleanups: CleanupFn[] = []

  elements.forEach((element) => {
    const { max, perspective } = getConfig(element)
    let frame: number | null = null

    const clamp = (value: number) => Math.max(0, Math.min(1, value))

    const reset = () => {
      if (frame !== null) {
        cancel(frame)
        frame = null
      }
      element.style.transform = ''
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const x = clamp((event.clientX - rect.left) / rect.width)
      const y = clamp((event.clientY - rect.top) / rect.height)

      if (frame !== null) {
        cancel(frame)
      }

      frame = request(() => {
        const rotateX = ((0.5 - y) * max * 2).toFixed(2)
        const rotateY = ((x - 0.5) * max * 2).toFixed(2)
        element.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
        frame = null
      })
    }

    const handlePointerLeave = () => {
      reset()
    }

    element.addEventListener('pointermove', handlePointerMove, { passive: true })
    element.addEventListener('pointerleave', handlePointerLeave)
    element.addEventListener('pointercancel', handlePointerLeave)

    cleanups.push(() => {
      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerleave', handlePointerLeave)
      element.removeEventListener('pointercancel', handlePointerLeave)
      reset()
    })
  })

  return () => {
    cleanups.forEach((cleanup) => cleanup())
  }
}
