// AXIOM_DEMO_UI — WEB CORE
// Canvas: C22 — components/Ticker.tsx
// Purpose: News marquee aligned with Red Protocol chips; thin scroll with fade edges.

import React, { useEffect, useState } from 'react'
import { vfs, type NewsItem } from '@/lib/vfs'

export interface TickerProps {
  maxItems?: number // default 3
}

const KIND_VARIANT: Record<string, 'info' | 'good' | 'warn'> = {
  release: 'good',
  update: 'info',
  'heads-up': 'warn',
}

function variantFor(item: NewsItem): 'info' | 'good' | 'warn' {
  const key = item.kind?.toLowerCase() ?? 'info'
  return KIND_VARIANT[key] || 'info'
}

export default function Ticker({ maxItems = 3 }: TickerProps) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await vfs.readNewsManifest()
        if (!alive) return
        setItems(list.slice(0, Math.max(1, maxItems)))
        setErr(null)
      } catch (e: any) {
        if (!alive) return
        setErr(e?.message || 'Ticker unavailable')
      }
    })()
    return () => {
      alive = false
    }
  }, [maxItems])

  if (err) {
    return (
      <div className='ax-marquee' role='status'>
        <span className='ax-chip' data-variant='warn'>{err}</span>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className='ax-marquee' role='status'>
        <span className='ax-chip' data-variant='info'>NO NEWS YET</span>
      </div>
    )
  }

  return (
    <div className='ax-marquee' aria-label='news-ticker'>
      {items.map((item) => (
        <span key={item.id} className='ax-chip' data-variant={variantFor(item)}>
          {item.kind?.toUpperCase() || 'NEWS'} :: {item.title}
        </span>
      ))}
    </div>
  )
}
