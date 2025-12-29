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
  densityScale: 0.8,
  minViewportScale: 0.75,
  maxViewportScale: 1,
  layoutBreakpoints: {
    xl: 1600,
    lg: 1280,
    md: 1024,
  },
} satisfies Required<ScaleConfig>

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
  const baseWidth = config.baseWidth ?? DEFAULTS.baseWidth
  const baseHeight = config.baseHeight ?? DEFAULTS.baseHeight
  const densityScale = config.densityScale ?? DEFAULTS.densityScale
  const minViewportScale = config.minViewportScale ?? DEFAULTS.minViewportScale
  const maxViewportScale = config.maxViewportScale ?? DEFAULTS.maxViewportScale
  const layoutBreakpoints = config.layoutBreakpoints ?? DEFAULTS.layoutBreakpoints

  const update = () => {
    if (!root.dataset.scaleMode) root.dataset.scaleMode = 'managed'

    const width = window.innerWidth || baseWidth
    const height = window.innerHeight || baseHeight
    const viewportScale = clamp(
      minViewportScale,
      Math.min(width / baseWidth, height / baseHeight),
      maxViewportScale,
    )
    const virtualWidth = Math.round(width / viewportScale)
    const virtualHeight = Math.round(height / viewportScale)
    const composedScale = densityScale * viewportScale

    root.style.setProperty('--ax-density-scale', densityScale.toFixed(3))
    root.style.setProperty('--ax-viewport-scale', viewportScale.toFixed(4))
    root.style.setProperty('--ax-scale', densityScale.toFixed(4))
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
