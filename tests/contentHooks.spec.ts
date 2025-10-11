import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { attachReveal } from '@/lib/content-hooks/reveal'
import { attachTilt } from '@/lib/content-hooks/tilt'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  public observe = vi.fn()
  public unobserve = vi.fn()
  public disconnect = vi.fn()
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  trigger(entry: Pick<IntersectionObserverEntry, 'target' | 'isIntersecting'>) {
    const entries = [
      {
        target: entry.target,
        isIntersecting: entry.isIntersecting,
      } as IntersectionObserverEntry,
    ]
    this.callback(entries, this as unknown as IntersectionObserver)
  }
}

let pointerFine = true
let reducedMotion = false

const originalMatchMedia = globalThis.matchMedia
const originalRAF = globalThis.requestAnimationFrame
const originalCAF = globalThis.cancelAnimationFrame


function createClassList() {
  const storage = new Set<string>()
  return {
    add: vi.fn((token: string) => {
      storage.add(token)
    }),
    remove: vi.fn((token: string) => {
      storage.delete(token)
    }),
    contains: (token: string) => storage.has(token),
  } as unknown as DOMTokenList
}

function createRevealElement({ classList }: { classList: DOMTokenList }): HTMLElement {
  return {
    dataset: {} as DOMStringMap,
    classList,
  } as unknown as HTMLElement
}

function createRevealRoot(elements: HTMLElement[]): ParentNode {
  return {
    querySelectorAll: vi.fn(() => elements),
  } as unknown as ParentNode
}

function createTiltElement(): HTMLElement & { __handlers: Record<string, EventListener[]> } {
  const handlers: Record<string, EventListener[]> = {}
  const style: Record<string, string> = {}
  const element = {
    dataset: { tilt: '' } as DOMStringMap,
    style,
    addEventListener: vi.fn((type: string, handler: EventListener) => {
      ;(handlers[type] ||= []).push(handler)
    }),
    removeEventListener: vi.fn((type: string, handler: EventListener) => {
      handlers[type] = (handlers[type] || []).filter((existing) => existing !== handler)
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect,
  } as unknown as HTMLElement & { __handlers: Record<string, EventListener[]> }
  element.__handlers = handlers
  return element
}

beforeEach(() => {
  pointerFine = true
  reducedMotion = false

  globalThis.matchMedia = vi.fn((query: string) => {
    const isPointerQuery = query.includes('pointer:fine')
    const isReducedQuery = query.includes('prefers-reduced-motion')
    return {
      matches: isPointerQuery ? pointerFine : isReducedQuery ? reducedMotion : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
    } as unknown as MediaQueryList
  })

  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(performance.now())
    return 1
  }
  globalThis.cancelAnimationFrame = vi.fn()
})

describe('attachReveal', () => {
  it('observes elements and adds class on intersection', () => {
    const classList = createClassList()
    const element = createRevealElement({ classList })
    const root = createRevealRoot([element])

    const cleanup = attachReveal(root, { observerFactory: MockIntersectionObserver as unknown as typeof IntersectionObserver })
    expect(MockIntersectionObserver.instances).toHaveLength(1)
    const instance = MockIntersectionObserver.instances[0]
    expect(instance).toBeDefined()
    expect(instance!.observe).toHaveBeenCalledWith(element)

    instance!.trigger({ target: element, isIntersecting: true })
    expect(element.classList.contains('is-in')).toBe(true)

    cleanup()
    expect(instance!.disconnect).toHaveBeenCalled()

    MockIntersectionObserver.instances = []
  })

  it('adds class immediately when reduced motion is preferred', () => {
    reducedMotion = true
    const classList = createClassList()
    const element = createRevealElement({ classList })
    const root = createRevealRoot([element])

    const cleanup = attachReveal(root, { observerFactory: MockIntersectionObserver as unknown as typeof IntersectionObserver })
    expect(element.classList.contains('is-in')).toBe(true)
    expect(MockIntersectionObserver.instances).toHaveLength(0)

    cleanup()
  })
})

describe('attachTilt', () => {
  it('applies tilt transform on pointer movement', () => {
    const element = createTiltElement()
    const root = createRevealRoot([element])

    const cleanup = attachTilt(root)
    const handlers = (element as any).__handlers
    const pointerMove = handlers.pointermove?.[0] as EventListener
    expect(pointerMove).toBeTypeOf('function')
    pointerMove?.({ clientX: 50, clientY: 50 } as PointerEvent)

    expect((element.style as any).transform).toContain('rotateX')
    expect((element.style as any).transform).toContain('rotateY')

    cleanup()
  })

  it('skips tilt when reduced motion is requested', () => {
    reducedMotion = true
    const element = createTiltElement()
    const root = createRevealRoot([element])

    const cleanup = attachTilt(root)

    expect(element.addEventListener).not.toHaveBeenCalledWith('pointermove', expect.any(Function), expect.anything())
    cleanup()
  })
})

afterEach(() => {
  if (originalMatchMedia) {
    globalThis.matchMedia = originalMatchMedia
  } else {
    delete (globalThis as Partial<typeof globalThis>).matchMedia
  }
  if (originalRAF) {
    globalThis.requestAnimationFrame = originalRAF
  }
  if (originalCAF) {
    globalThis.cancelAnimationFrame = originalCAF
  }
  MockIntersectionObserver.instances = []
})
