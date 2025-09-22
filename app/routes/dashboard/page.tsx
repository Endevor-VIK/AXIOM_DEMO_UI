// AXIOM_DEMO_UI - WEB CORE
// Canvas: C15 - app/routes/dashboard/page.tsx
// Purpose: Dashboard home with status matrix and latest news summaries.

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { vfs, type NewsItem } from '@/lib/vfs'

interface Counts {
  audits: number
  content: number
  news: number
}

const NEWS_VARIANT_MAP: Record<string, 'info' | 'good' | 'warn'> = {
  release: 'good',
  update: 'info',
  'heads-up': 'warn',
}

function resolveKindVariant(kind?: string): 'info' | 'good' | 'warn' {
  if (!kind) return 'info'
  const key = kind.toLowerCase()
  return NEWS_VARIANT_MAP[key] || 'info'
}

function resolveCountVariant(count: number): 'online' | 'warn' {
  return count > 0 ? 'online' : 'warn'
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts>({ audits: 0, content: 0, news: 0 })
  const [latest, setLatest] = useState<NewsItem[]>([])
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setBusy(true)
        const [aud, cont, news] = await Promise.allSettled([
          vfs.readAuditsManifest(),
          vfs.readContentManifest(),
          vfs.readNewsManifest(),
        ])
        const audits = aud.status === 'fulfilled' && Array.isArray(aud.value) ? aud.value.length : 0
        const content = cont.status === 'fulfilled' && Array.isArray(cont.value) ? cont.value.length : 0
        const newsArr = news.status === 'fulfilled' && Array.isArray(news.value) ? (news.value as NewsItem[]) : []
        if (!alive) return
        setCounts({ audits, content, news: newsArr.length })
        setLatest(newsArr.slice(0, 2)) // было 3 → делаем компактнее
        setErr(null)
      } catch (error: any) {
        if (!alive) return
        setErr(error?.message || 'Unable to fetch dashboard data')
      } finally {
        if (alive) setBusy(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const statusChips = useMemo(() => {
    return [
      { label: 'AUDIT', value: counts.audits, to: '/dashboard/audit' },
      { label: 'CONTENT', value: counts.content, to: '/dashboard/content' },
      { label: 'NEWS', value: counts.news, to: '/dashboard/news' },
    ]
  }, [counts])

  return (
    <div className='ax-dashboard' aria-busy={busy} aria-live='polite'>
      {err && (
        <div className='ax-dashboard__alert' role='alert'>
          {err}
        </div>
      )}

      <div className='ax-dashboard__grid'>
        <section className='ax-card ax-dashboard__panel ax-dashboard__panel--status' data-noise='on' aria-label='Status overview'>
          <header className='ax-dashboard__panel-head'>
            <h2 className='ax-blade-head'>CONTROL STATUS</h2>
            <p className='ax-dashboard__panel-note'>Live counters from audit, content and news manifests.</p>
          </header>
          <div className='ax-dashboard__dials'>
            {statusChips.map((chip) => (
              <Link
                key={chip.label}
                to={chip.to}
                className='ax-dashboard__dial'
                data-variant={resolveCountVariant(chip.value)}
                aria-label={`${chip.label} total ${chip.value}`}
              >
                <span className='ax-dashboard__dial-value'>{chip.value}</span>
                <span className='ax-dashboard__dial-label'>{chip.label}</span>
              </Link>
            ))}
          </div>
          <div className='ax-hr-blade' aria-hidden='true' />
          <div className='ax-dashboard__actions'>
            <Link to='/dashboard/roadmap' className='ax-btn ghost ax-dashboard__action'>OPEN ROADMAP</Link>
            <Link to='/dashboard/audit' className='ax-btn ghost ax-dashboard__action'>OPEN AUDIT</Link>
            <Link to='/dashboard/content' className='ax-btn ghost ax-dashboard__action'>OPEN CONTENT</Link>
            <Link to='/dashboard/news' className='ax-btn ghost ax-dashboard__action' data-variant='accent'>VIEW NEWS</Link>
          </div>
        </section>

        <section className='ax-card ax-dashboard__panel ax-dashboard__panel--news' data-noise='on' aria-label='Latest news'>
          <header className='ax-dashboard__panel-head'>
            <h2 className='ax-blade-head'>LATEST BRIEFINGS</h2>
            <Link to='/dashboard/news' className='ax-btn ghost ax-dashboard__see-all'>SEE ALL</Link>
          </header>
          {latest.length === 0 ? (
            <p className='ax-dashboard__empty'>No news items yet. Head to NEWS to add the first briefing.</p>
          ) : (
            <ul className='ax-dashboard__news-list ax-dashboard__news-list--compact'>
              {latest.map((item) => (
                <li key={item.id} className='ax-dashboard__news'>
                  <div className='ax-dashboard__news-head'>
                    <div className='ax-dashboard__news-meta'>
                      <span className='ax-chip ax-dashboard__news-chip' data-variant={resolveKindVariant(item.kind)}>{(item.kind || 'news').toUpperCase()}</span>
                      <span className='ax-dashboard__news-date'>{item.date}</span>
                    </div>
                    <Link to={item.link || '/dashboard/news'} className='ax-btn ghost ax-dashboard__news-open'>
                      OPEN
                    </Link>
                  </div>
                  <h3 className='ax-dashboard__news-title'>{item.title}</h3>
                  {item.tags?.length ? (
                    <div className='ax-dashboard__news-tags'>
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className='ax-chip ax-dashboard__tag'>
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.summary && <p className='ax-dashboard__news-summary'>{item.summary}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
