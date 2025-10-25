// AXIOM_DEMO_UI — WEB CORE
// Canvas: C19 — app/routes/dashboard/news/page.tsx
// Purpose: News panel with Red Protocol filters, grid layout and pagination.

import React, { useEffect, useMemo, useState } from 'react'
import RouteWreath from '@/components/counters/RouteWreath'
import { vfs, type NewsItem, type NewsKind } from '@/lib/vfs'
import NewsCard from '@/components/NewsCard'

const KIND_FILTERS: ("" | NewsKind)[] = ['', 'update', 'release', 'heads-up', 'roadmap']
const PAGE_SIZES = [4, 8, 12]

function matchesQuery(item: NewsItem, term: string) {
  if (!term) return true
  const haystack = [item.title, item.summary, ...(item.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'' | NewsKind>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setBusy(true)
        const list = await vfs.readNewsManifest()
        if (!alive) return
        setItems(list)
        setErr(null)
      } catch (e: any) {
        if (!alive) return
        setErr(e?.message || 'Unable to load news manifest')
      } finally {
        if (alive) setBusy(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [q, kind, pageSize])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items.filter((item) => matchesQuery(item, term) && (!kind || item.kind === kind))
  }, [items, q, kind])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)
  const newsTotal = items.length
  const newsWreathDescription = busy
    ? 'Loading news manifest...'
    : newsTotal > 0
      ? `${newsTotal} briefings archived. Showing ${filtered.length}.`
      : 'No news briefings yet. Add items to populate the feed.'

  const handlePrev = () => setPage((prev) => Math.max(1, prev - 1))
  const handleNext = () => setPage((prev) => Math.min(totalPages, prev + 1))

  return (
    <>
      <section className='ax-container ax-section' aria-busy={busy}>
        <div className='ax-stack'>
          <RouteWreath
            label='NEWS'
            value={newsTotal}
            title='News Dispatch'
            description={newsWreathDescription}
            ariaLabel={`NEWS module total ${newsTotal}`}
          />
          <div className='ax-card ghost ax-news-controls'>
            <div className='ax-filter-row'>
              <label className='visually-hidden' htmlFor='news-search'>Search news</label>
              <input
                id='news-search'
                className='ax-input'
                type='search'
                placeholder='Search title, summary, tags'
                value={q}
                onChange={(event) => setQ(event.target.value)}
                disabled={busy}
              />

              <label className='visually-hidden' htmlFor='news-kind'>Filter by kind</label>
              <select
                id='news-kind'
                className='ax-input'
                value={kind}
                onChange={(event) => setKind(event.target.value as '' | NewsKind)}
                disabled={busy}
              >
                <option value=''>All kinds</option>
                {KIND_FILTERS.filter(Boolean).map((value) => (
                  <option key={value} value={value}>
                    {value?.toUpperCase()}
                  </option>
                ))}
              </select>

              <label className='visually-hidden' htmlFor='news-size'>Items per page</label>
              <select
                id='news-size'
                className='ax-input'
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                disabled={busy}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>

              <span className='ax-chip' data-variant='info'>TOTAL :: {items.length}</span>
              <span className='ax-chip' data-variant='info'>VISIBLE :: {filtered.length}</span>
            </div>

            <div className='ax-filter-row ax-news-pagination'>
              <button type='button' className='ax-btn ghost' onClick={handlePrev} disabled={page <= 1}>
                Prev
              </button>
              <span className='ax-chip' data-variant='level'>PAGE :: {page} / {totalPages}</span>
              <button type='button' className='ax-btn ghost' onClick={handleNext} disabled={page >= totalPages}>
                Next
              </button>
            </div>
          </div>

          {err && <div className='ax-dashboard__alert' role='alert'>{err}</div>}

          <div className='ax-news-grid'>
            {pageItems.length === 0 ? (
              <div className='ax-card ax-news-empty'>
                <h3 className='ax-blade-head'>No items found</h3>
                <p className='ax-news-card__summary'>Adjust filters or add new content in the NEWS module.</p>
              </div>
            ) : (
              pageItems.map((item) => <NewsCard key={item.id} item={item} />)
            )}
          </div>
        </div>
      </section>
    </>
  )
}
