import React, { useEffect, useMemo, useRef } from 'react'
import '../../styles/ticker.css'

export type TickerItem = {
  level: 'priority' | 'advisory' | 'market' | 'restricted' | 'news'
  kind?: string
  title: string
}

type Props = {
  items?: TickerItem[]
  speed?: number      // px/s
  gap?: number        // px
  height?: number     // px
  className?: string
}

const FALLBACK: TickerItem[] = [
  { level: 'priority', title: 'Tower lockdown in ECHELON-Δ' },
  { level: 'advisory', title: 'Unscheduled key exchange intercepted' },
  { level: 'market', title: 'Σ-index +2.7% amid sector rally' },
  { level: 'restricted', title: 'OMEGA-0 anomaly ping reduced' },
  { level: 'advisory', title: 'Checksum drift in OMEGA-0 ledger — no loss' },
  { level: 'priority', title: 'AXIOM Echo — dormant node handshake prelude' },
  { level: 'market', title: 'Risk-on rotation: Gen-Cell equities lead' },
]

export function HeadlinesTicker({ items, speed, gap, height, className = '' }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const data = useMemo(() => (items?.length ? items : FALLBACK), [items])

  useEffect(() => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let frame = 0
    let attempts = 0
    const maxAttempts = 8

    const buildTrack = () => {
      track.style.removeProperty('animation')
      track.style.removeProperty('--ax-loop-to')
      track.innerHTML = ''

      const gapToken = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ax-gap')
      )
      const gapPx = gap ?? (isNaN(gapToken) ? 44 : gapToken)

      for (const it of data) {
        const span = document.createElement('span')
        span.className = 'ax-item'
        span.setAttribute('data-level', it.level)
        span.setAttribute('role', 'listitem')
        const chipLabel = (it.kind || it.level).toUpperCase()
        span.innerHTML =
          `<span class="ax-dot"></span><span class="ax-pill">${chipLabel}</span> <span class="ax-title">${it.title}</span>`
        track.appendChild(span)
      }

      if (prefersReduced) {
        viewport.style.overflow = 'auto'
        track.dataset.paused = 'true'
        return true
      }

      viewport.style.overflow = 'hidden'
      track.dataset.paused = 'false'

      const childWidths = Array.from(track.children).map(
        (el) => (el as HTMLElement).getBoundingClientRect().width
      )
      const baseWidth =
        childWidths.reduce((a, b) => a + b, 0) + (track.children.length - 1) * gapPx

      if (!baseWidth || !Number.isFinite(baseWidth)) {
        return false
      }

      const clones = Array.from(track.children).map((n) =>
        (n as HTMLElement).cloneNode(true) as HTMLElement
      )
      let w = baseWidth
      const min = viewport.getBoundingClientRect().width * 2 + 1
      if (!min || !Number.isFinite(min)) {
        return false
      }
      while (w < min) {
        clones.forEach((n) => track.appendChild(n.cloneNode(true)))
        w += baseWidth
      }

      const dist = w / 2
      if (!dist || !Number.isFinite(dist)) {
        return false
      }
      track.style.setProperty('--ax-loop-to', `${-dist}px`)
      const speedToken = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ax-speed')
      )
      const pxPerSec = speed ?? (isNaN(speedToken) ? 96 : speedToken)
      const duration = dist / pxPerSec
      track.style.animation = `ax-scroll ${duration}s linear infinite`
      return true
    }

    const attempt = () => {
      const ok = buildTrack()
      if (!ok && attempts < maxAttempts) {
        attempts += 1
        frame = requestAnimationFrame(attempt)
      }
    }

    const schedule = () => {
      attempts = 0
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(attempt)
    }

    schedule()

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === viewport) {
          schedule()
        }
      }
    })
    ro.observe(viewport)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [data, speed, gap])

  const style: React.CSSProperties = {}
  if (typeof height === 'number') (style as any)['--ax-height'] = `${height}px`
  if (typeof gap === 'number') (style as any)['--ax-gap'] = `${gap}px`
  if (typeof speed === 'number') (style as any)['--ax-speed'] = `${speed}`

  return (
    <div
      className={`ax-ticker ${className}`}
      role='region'
      aria-label='News wire — live headlines'
      style={style}
    >
      <span className='ax-crest'>NEWS WIRE</span>
      <div className='ax-ticker__viewport' ref={viewportRef}>
        <div className='ax-track' ref={trackRef} aria-live='polite' role='list' />
      </div>
    </div>
  )
}

export default HeadlinesTicker
