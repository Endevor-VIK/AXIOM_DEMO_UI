export type FooterBarControllerOptions = {
  footerEl: HTMLElement | null
  hotzoneEl?: HTMLElement | null
  thresholdPx?: number
  hideDelayMs?: number
  showDelayMs?: number
  idleHideMs?: number
}

export function attachFooterBarController({
  footerEl,
  hotzoneEl,
  thresholdPx = 10,
  hideDelayMs = 180,
  showDelayMs = 0,
  idleHideMs = 9000,
}: FooterBarControllerOptions): () => void {
  if (!footerEl) return () => {}

  const scrollingEl = document.scrollingElement ?? document.documentElement

  let lastY = window.scrollY
  let ticking = false
  let hideTimer: number | null = null
  let showTimer: number | null = null
  let idleTimer: number | null = null
  let pinned = false

  const canScroll = () => scrollingEl.scrollHeight > window.innerHeight + 4

  const show = () => {
    if (pinned) return
    footerEl.classList.remove('is-hidden')
  }

  const hide = () => {
    if (pinned) return
    footerEl.classList.add('is-hidden')
  }

  const scheduleHide = (ms: number) => {
    if (hideTimer !== null) window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(hide, ms)
  }

  const scheduleShow = (ms: number) => {
    if (showTimer !== null) window.clearTimeout(showTimer)
    showTimer = window.setTimeout(show, ms)
  }

  const scheduleIdleHide = () => {
    if (idleTimer !== null) window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => {
      if (canScroll()) hide()
    }, idleHideMs)
  }

  const isAtBottom = () => {
    const y = window.scrollY + window.innerHeight
    return y >= scrollingEl.scrollHeight - 2
  }

  const onScroll = () => {
    if (!canScroll()) {
      footerEl.classList.remove('is-hidden')
      lastY = window.scrollY
      return
    }

    const y = window.scrollY
    const dy = y - lastY
    if (Math.abs(dy) < thresholdPx) return

    if (dy > 0 && y > 40) {
      scheduleHide(hideDelayMs)
    } else {
      scheduleShow(showDelayMs)
    }

    if (isAtBottom()) show()

    lastY = y
    scheduleIdleHide()
  }

  const onScrollRaf = () => {
    if (ticking) return
    ticking = true
    window.requestAnimationFrame(() => {
      onScroll()
      ticking = false
    })
  }

  const pin = () => {
    pinned = true
    footerEl.classList.add('is-pinned')
    footerEl.classList.remove('is-hidden')
  }

  const unpin = () => {
    pinned = false
    footerEl.classList.remove('is-pinned')
    if (canScroll()) scheduleIdleHide()
  }

  const onHotEnter = () => show()
  const onHotLeave = () => scheduleIdleHide()

  const onEnter = () => pin()
  const onLeave = () => unpin()

  const onFocusIn = () => pin()
  const onFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget
    if (next instanceof Node && footerEl.contains(next)) return
    unpin()
  }

  const onResize = () => {
    if (!canScroll()) {
      footerEl.classList.remove('is-hidden')
    } else {
      scheduleIdleHide()
    }
    lastY = window.scrollY
  }

  window.addEventListener('scroll', onScrollRaf, { passive: true })
  window.addEventListener('resize', onResize)

  footerEl.addEventListener('mouseenter', onEnter)
  footerEl.addEventListener('mouseleave', onLeave)
  footerEl.addEventListener('focusin', onFocusIn)
  footerEl.addEventListener('focusout', onFocusOut)

  if (hotzoneEl) {
    hotzoneEl.addEventListener('mouseenter', onHotEnter)
    hotzoneEl.addEventListener('mouseleave', onHotLeave)
  }

  if (!canScroll()) footerEl.classList.remove('is-hidden')
  else scheduleIdleHide()

  return () => {
    window.removeEventListener('scroll', onScrollRaf)
    window.removeEventListener('resize', onResize)

    footerEl.removeEventListener('mouseenter', onEnter)
    footerEl.removeEventListener('mouseleave', onLeave)
    footerEl.removeEventListener('focusin', onFocusIn)
    footerEl.removeEventListener('focusout', onFocusOut)

    if (hotzoneEl) {
      hotzoneEl.removeEventListener('mouseenter', onHotEnter)
      hotzoneEl.removeEventListener('mouseleave', onHotLeave)
    }

    if (hideTimer !== null) window.clearTimeout(hideTimer)
    if (showTimer !== null) window.clearTimeout(showTimer)
    if (idleTimer !== null) window.clearTimeout(idleTimer)
  }
}
