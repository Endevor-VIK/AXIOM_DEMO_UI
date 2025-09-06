// AXIOM_DEMO_UI — WEB CORE
// Canvas: C24 — lib/news/index.ts
// Purpose: News data provider over VFS with helpers for filtering and sorting.

import { vfs, type NewsItem, type NewsKind } from '@/lib/vfs'
import { newsKinds, type NewsRecord, isNewsRecord } from '@/lib/news/schema'

export type { NewsKind, NewsItem, NewsRecord }

export interface NewsQuery {
  kind?: NewsKind | ''
  q?: string
  limit?: number
}

export interface NewsApi {
  all(): Promise<NewsItem[]>
  find(q: NewsQuery): Promise<NewsItem[]>
  byId(id: string): Promise<NewsItem | undefined>
}

export function createNewsApi(): NewsApi {
  async function all(): Promise<NewsItem[]> {
    const arr = await vfs.readNewsManifest()
    return arr
  }

  async function find(q: NewsQuery): Promise<NewsItem[]> {
    const arr = await all()
    let out = arr
    if (q.kind) out = out.filter((x) => x.kind === q.kind)
    if (q.q && q.q.trim()) {
      const term = q.q.trim().toLowerCase()
      out = out.filter(
        (x) =>
          x.title.toLowerCase().includes(term) ||
          (x.summary || '').toLowerCase().includes(term) ||
          x.tags?.some((t) => t.toLowerCase().includes(term))
      )
    }
    if (q.limit && q.limit > 0) out = out.slice(0, q.limit)
    return out
  }

  async function byId(id: string): Promise<NewsItem | undefined> {
    const arr = await all()
    return arr.find((x) => x.id === id)
  }

  return { all, find, byId }
}

export const news = createNewsApi()

