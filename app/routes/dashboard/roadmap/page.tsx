// AXIOM_DEMO_UI - WEB CORE
// Canvas: C16 - app/routes/dashboard/roadmap/page.tsx
// Purpose: Roadmap panel with Red Protocol two-column layout and iframe preview.

import React, { useEffect, useMemo, useState } from 'react'
import { vfs } from '@/lib/vfs'

const REQUIRED_SOURCE = 'roadmap/index.html'
const FALLBACK_SOURCES = ['roadmap.html', 'roadmap/roadmap.html']

type SourceProbe = {
  path: string
  available: boolean
}

function ensureSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

export default function RoadmapPage() {
  const dataBase = ensureSlash(((import.meta as any).env?.VITE_DATA_BASE as string) || 'data/')
  const initialSources = useMemo<SourceProbe[]>(
    () => [REQUIRED_SOURCE, ...FALLBACK_SOURCES].map((path) => ({ path, available: false })),
    []
  )

  const [sources, setSources] = useState<SourceProbe[]>(initialSources)
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const status: SourceProbe[] = []
      for (const entry of initialSources) {
        let available = false
        try {
          const res = await vfs.fetchRaw(entry.path, { method: 'GET' })
          available = res.ok
        } catch {
          available = false
        }
        status.push({ path: entry.path, available })
      }

      if (!alive) return
      setSources(status)

      const primary = status.find((item) => item.path === REQUIRED_SOURCE && item.available)
      const fallback = status.find((item) => item.available)

      if (primary) {
        setSelected(REQUIRED_SOURCE)
        setMessage(null)
      } else if (fallback) {
        setSelected(fallback.path)
        setMessage('roadmap/index.html is missing. Showing fallback source.')
      } else {
        setSelected(null)
        setMessage('No roadmap sources were found in /data. Add data/roadmap/index.html to enable preview.')
      }
    })()
    return () => {
      alive = false
    }
  }, [initialSources])

  const previewSrc = selected ? dataBase + selected : null

  return (
    <section className='ax-container ax-section' aria-live='polite'>
      <div className='ax-two-col'>
        <aside className='ax-card low' role='navigation' aria-label='Roadmap sources'>
          <h1 className='ax-blade-head'>Roadmap Sources</h1>
          <p className='ax-module__note'>Primary preview uses data/roadmap/index.html when available.</p>
          <ul className='ax-module__list'>
            {sources.map((source) => {
              const active = source.available && source.path === selected
              return (
                <li key={source.path}>
                  <button
                    type='button'
                    className={`ax-chip ax-module__source${active ? ' is-active' : ''}`}
                    data-variant={source.available ? 'online' : 'warn'}
                    onClick={() => source.available && setSelected(source.path)}
                    aria-current={active ? 'true' : undefined}
                    disabled={!source.available}
                  >
                    <span>{source.path}</span>
                    <span className='ax-module__source-meta'>
                      {source.available ? 'AVAILABLE' : 'MISSING'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className='ax-card' role='region' aria-label='Roadmap preview'>
          <div className='ax-module__panel-head'>
            <h2 className='ax-blade-head'>Preview</h2>
            <div className='ax-module__actions'>
              <button
                type='button'
                className='ax-btn ghost'
                onClick={() => setRefreshKey((value) => value + 1)}
                disabled={!previewSrc}
              >
                Refresh
              </button>
              {previewSrc && (
                <a className='ax-btn primary' href={previewSrc} target='_blank' rel='noopener noreferrer'>
                  Open External
                </a>
              )}
            </div>
          </div>

          {message && (
            <div className='ax-dashboard__alert' role='status'>
              {message}
            </div>
          )}

          <div className='ax-scroll ax-viewport ax-scroll-thin ax-module__iframe'>
            {previewSrc ? (
              <iframe key={`${refreshKey}-${previewSrc}`} src={previewSrc} title='AXIOM Roadmap preview' />
            ) : (
              <p className='ax-module__note'>Add data/roadmap/index.html to enable inline preview.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
