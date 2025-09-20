// AXIOM_DEMO_UI — WEB CORE
// Canvas: C22 — components/Ticker.tsx
// Purpose: News marquee aligned with Red Protocol chips; thin scroll with fade edges.

import React, { useEffect, useMemo, useState } from 'react'
import { vfs, type NewsItem } from '@/lib/vfs'

export interface TickerProps {
  maxItems?: number
}

const KIND_VARIANT: Record<string, 'info' | 'good' | 'warn'> = {
  release: 'good',
  update: 'info',
  'heads-up': 'warn',
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function variantFor(item: NewsItem): 'info' | 'good' | 'warn' {
  const key = item.kind?.toLowerCase() ?? 'info'
  return KIND_VARIANT[key] || 'info'
}

export default function Ticker({ maxItems = 6 }: TickerProps) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await vfs.readNewsManifest()
        if (!alive) return
        setItems(list)
        setErr(null)
      } catch (e: any) {
        if (!alive) return
        setErr(e?.message || 'Ticker unavailable')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(REDUCED_QUERY)
    const update = () => setReducedMotion(media.matches)
    update()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  const visibleItems = useMemo(() => {
    if (!items.length) return []
    const limit = Math.max(1, maxItems)
    return items.slice(0, limit)
  }, [items, maxItems])

  const baseClass = reducedMotion ? 'ax-ticker-strip ax-ticker-strip--static' : 'ax-ticker-strip'

  if (err) {
    return (
      <div className={baseClass} role='status'>
        <div className='ax-ticker-track'>
          <span className='ax-chip ax-ticker__chip' data-variant='warn'>{err}</span>
        </div>
      </div>
    )
  }

  if (visibleItems.length === 0) {
    return (
      <div className={baseClass} role='status'>
        <div className='ax-ticker-track'>
          <span className='ax-chip ax-ticker__chip' data-variant='info'>NO NEWS YET</span>
        </div>
      </div>
    )
  }

  const loop = reducedMotion ? visibleItems : [...visibleItems, ...visibleItems]

  return (
    <div className={baseClass} role='status' aria-label='news ticker'>
      <div className='ax-ticker-track'>
        {loop.map((item, index) => (
          <span key={`${item.id}-${index}`} className='ax-chip ax-ticker__chip' data-variant={variantFor(item)}>
            <span className='ax-ticker__kind'>{(item.kind || 'news').toUpperCase()}</span>
            <span className='ax-ticker__divider' aria-hidden='true'>::</span>
            <span className='ax-ticker__title'>{item.title}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
