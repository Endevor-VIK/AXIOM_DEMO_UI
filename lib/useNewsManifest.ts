import { useEffect, useState } from 'react'
import type { TickerItem } from '../components/news/HeadlinesTicker'

type ManifestItem = {
  title?: string
  kind?: string
  level?: string
}

function coerceLevel(raw?: string): TickerItem['level'] {
  const v = (raw || '').toLowerCase()
  switch (v) {
    case 'priority':
    case 'advisory':
    case 'market':
    case 'restricted':
    case 'news':
      return v
    default:
      return 'news'
  }
}

export function useNewsManifest(url = '/data/news/manifest.json') {
  const [items, setItems] = useState<TickerItem[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch(url)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: ManifestItem[]) => {
        if (!alive) return
        const mapped: TickerItem[] = (Array.isArray(data) ? data : [])
          .map(it => {
            const title = (it.title || '').trim()
            if (!title) return null
            const level = coerceLevel(it.level)
            const kindRaw = it.kind?.trim()
            const base: TickerItem = { title, level }
            if (kindRaw) base.kind = kindRaw
            return base
          })
          .filter((x): x is TickerItem => Boolean(x))
        setItems(mapped)
      })
      .catch(() => { if (alive) setItems(null) })
    return () => { alive = false }
  }, [url])

  return items
}
