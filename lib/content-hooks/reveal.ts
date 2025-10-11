import type { CleanupFn } from './types'

const DEFAULT_SELECTOR = '[data-reveal],[data-axv-split]'
const DEFAULT_CLASS = 'is-in'
const DEFAULT_THRESHOLD = 0.25

type IntersectionObserverLike = typeof IntersectionObserver

function getMatchMedia(): ((query: string) => MediaQueryList) | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }
  return (query: string) => window.matchMedia(query)
}

function hasIntersectionObserver(): boolean {
  return typeof window !== 'undefined' && 'IntersectionObserver' in window
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const num = Number.parseFloat(value)
  return Number.isFinite(num) ? num : fallback
}

function shouldRespectReducedMotion(): boolean {
  const match = getMatchMedia()
  return Boolean(match?.('(prefers-reduced-motion: reduce)').matches)
}

export interface RevealOptions {
  selector?: string
  observerFactory?: IntersectionObserverLike
}

interface ElementConfig {
  className: string
  once: boolean
  threshold: number
  rootMargin?: string
}

function getElementConfig(element: HTMLElement): ElementConfig {
  const { dataset } = element
  const className = dataset.revealClass || DEFAULT_CLASS

  const onceAttr = dataset.revealOnce
  const once = onceAttr === 'false' ? false : true

  const threshold = parseNumber(dataset.revealThreshold, DEFAULT_THRESHOLD)
  const rootMargin = dataset.revealRootMargin

  return { className, once, threshold, rootMargin }
}

export function attachReveal(root: ParentNode, options: RevealOptions = {}): CleanupFn {
  if (!root) {
    return () => {}
  }

  const selector = options.selector ?? DEFAULT_SELECTOR
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector))
  if (!elements.length) {
    return () => {}
  }

  const reducedMotion = shouldRespectReducedMotion()

  if (reducedMotion || !hasIntersectionObserver()) {
    elements.forEach((element) => {
      const { className } = getElementConfig(element)
      element.classList.add(className)
    })
    return () => {}
  }

  const Observer: IntersectionObserverLike =
    options.observerFactory ?? window.IntersectionObserver

  const observers = new Map<HTMLElement, IntersectionObserver>()

  elements.forEach((element) => {
    const { className, once, threshold, rootMargin } = getElementConfig(element)

    const observer = new Observer(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement
          if (entry.isIntersecting) {
            target.classList.add(className)
            if (once) {
              const stored = observers.get(target)
              stored?.unobserve(target)
              observers.delete(target)
            }
          } else if (!once) {
            target.classList.remove(className)
          }
        })
      },
      {
        threshold,
        rootMargin,
      },
    )

    observer.observe(element)
    observers.set(element, observer)
  })

  return () => {
    observers.forEach((observer) => observer.disconnect())
    observers.clear()
  }
}
