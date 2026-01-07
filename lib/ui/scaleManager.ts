type LayoutName = 'xl' | 'lg' | 'md' | 'sm'

type LayoutBreakpoints = {
  xl: number
  lg: number
  md: number
}

type ScaleConfig = {
  baseWidth?: number
  baseHeight?: number
  densityScale?: number
  minViewportScale?: number
  maxViewportScale?: number
  layoutBreakpoints?: LayoutBreakpoints
}

const DEFAULTS = {
  baseWidth: 1920,
  baseHeight: 1080,
  densityScale: 0.648,
  minViewportScale: 0.75,
  maxViewportScale: 1,
  layoutBreakpoints: {
    xl: 1600,
    lg: 1280,
    md: 1024,
  },
} satisfies Required<ScaleConfig>

const isValidMode = (value: string | null | undefined): value is 'managed' | 'legacy' =>
  value === 'managed' || value === 'legacy'

const resolveInitialMode = (): 'managed' | 'legacy' => {
  try {
    const params = new URLSearchParams(window.location.search)
    const paramMode = params.get('scale')
    if (isValidMode(paramMode)) {
      return paramMode
    }
  } catch {
    /* noop */
  }
  return 'managed'
}

const resolveDebugFlag = (): boolean => {
  try {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('debug')) return false
    const raw = (params.get('debug') || '').toLowerCase()
    return raw === '' || raw === '1' || raw === 'true' || raw === 'on'
  } catch {
    /* noop */
  }
  return false
}

const clamp = (min: number, value: number, max: number) => Math.min(Math.max(value, min), max)

const resolveLayout = (virtualWidth: number, breakpoints: LayoutBreakpoints): LayoutName => {
  if (virtualWidth >= breakpoints.xl) return 'xl'
  if (virtualWidth >= breakpoints.lg) return 'lg'
  if (virtualWidth >= breakpoints.md) return 'md'
  return 'sm'
}

export const initScaleManager = (config: ScaleConfig = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined
  }

  const root = document.documentElement
  const defaultMode = resolveInitialMode()
  root.dataset.scaleMode = defaultMode
  if (resolveDebugFlag()) {
    root.dataset.scaleDebug = '1'
  } else {
    delete root.dataset.scaleDebug
  }
  const baseWidth = config.baseWidth ?? DEFAULTS.baseWidth
  const baseHeight = config.baseHeight ?? DEFAULTS.baseHeight
  const densityScale = config.densityScale ?? DEFAULTS.densityScale
  const minViewportScale = config.minViewportScale ?? DEFAULTS.minViewportScale
  const maxViewportScale = config.maxViewportScale ?? DEFAULTS.maxViewportScale
  const layoutBreakpoints = config.layoutBreakpoints ?? DEFAULTS.layoutBreakpoints

  const update = () => {
    const mode = isValidMode(root.dataset.scaleMode)
      ? root.dataset.scaleMode
      : defaultMode
    if (!root.dataset.scaleMode) root.dataset.scaleMode = mode

    const width = window.innerWidth || baseWidth
    const height = window.innerHeight || baseHeight
    const cssScale = Math.min(width / baseWidth, height / baseHeight)
    const shrinkThresholdW = baseWidth * 0.7
    const shrinkThresholdH = baseHeight * 0.7
    const allowShrink = width < shrinkThresholdW || height < shrinkThresholdH
    const viewportScale = allowShrink
      ? clamp(minViewportScale, cssScale, maxViewportScale)
      : 1
    const virtualWidth = Math.round(width / viewportScale)
    const virtualHeight = Math.round(height / viewportScale)
    const composedScale = densityScale * viewportScale

    root.style.setProperty('--ax-density-scale', densityScale.toFixed(3))
    root.style.setProperty('--ax-viewport-scale', viewportScale.toFixed(4))
    if (mode === 'managed') {
      root.style.setProperty('--ax-scale', densityScale.toFixed(4))
    } else {
      root.style.removeProperty('--ax-scale')
    }
    root.style.setProperty('--ax-composed-scale', composedScale.toFixed(4))
    root.style.setProperty('--ax-virtual-w', `${virtualWidth}px`)
    root.style.setProperty('--ax-virtual-h', `${virtualHeight}px`)
    root.dataset.layout = resolveLayout(virtualWidth, layoutBreakpoints)
  }

  let frame = 0
  const schedule = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(update)
  }

  update()
  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)

  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('orientationchange', schedule)
  }
}
