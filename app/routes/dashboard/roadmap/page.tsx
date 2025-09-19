// AXIOM_DEMO_UI - WEB CORE
// Canvas: C16 - app/routes/dashboard/roadmap/page.tsx
// Purpose: Roadmap panel with Red Protocol list/preview pattern and iframe wrapper.

import React, { useEffect, useMemo, useState } from 'react'
import { vfs } from '@/lib/vfs'

function ensureSlash(s: string) {
  return s.endsWith('/') ? s : s + '/'
}

type SourceProbe = {
  path: string
  available: boolean
}

export default function RoadmapPage() {
  const dataBase = ensureSlash(((import.meta as any).env?.VITE_DATA_BASE as string) || 'data/')
  const candidates = useMemo(
    () => ['roadmap/index.html', 'roadmap.html', 'roadmap/roadmap.html'],
    []
  )

  const [sources, setSources] = useState<SourceProbe[]>(() => candidates.map((path) => ({ path, available: false })))
  const [selected, setSelected] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const status: SourceProbe[] = []
      let firstAvailable: string | null = null
      for (const rel of candidates) {
        let available = false
        try {
          const res = await vfs.fetchRaw(rel, { method: 'GET' })
          available = res.ok
        } catch {
          available = false
        }
        status.push({ path: rel, available })
        if (available && !firstAvailable) {
          firstAvailable = rel
        }
      }
      if (!alive) return
      setSources(status)
      if (firstAvailable) {
        setSelected((prev) => prev && status.some((s) => s.path === prev && s.available) ? prev : firstAvailable)
        setErr(null)
      } else {
        setSelected(null)
        setErr('No roadmap source detected in /data. Place roadmap/index.html or roadmap.html to enable preview.')
      }
    })()
    return () => {
      alive = false
    }
  }, [candidates])

  const selectedSrc = selected ? dataBase + selected : null

  return (
    <div className='ax-module'>
      {err && (
        <div className='ax-dashboard__alert' role='alert'>
          {err}
        </div>
      )}

      <div className='ax-module__grid'>
        <section className='ax-card ax-module__panel' data-noise='on' aria-label='Roadmap sources'>
          <h2 className='ax-blade-head'>ROADMAP SOURCES</h2>
          <p className='ax-module__note'>Select an available source to preview. Missing paths appear disabled.</p>
          <ul className='ax-module__list'>
            {sources.map((source) => {
              const active = selected === source.path && source.available
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
                    {source.available ? 'SOURCE :: ' : 'MISSING :: '}
                    {source.path}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className='ax-card ax-module__panel' data-noise='on' aria-label='Roadmap preview'>
          <div className='ax-module__panel-head'>
            <h2 className='ax-blade-head'>PREVIEW</h2>
            <div className='ax-module__actions'>
              <button
                type='button'
                className='ax-btn ghost'
                onClick={() => setRefresh((v) => v + 1)}
                disabled={!selectedSrc}
              >
                REFRESH
              </button>
              {selectedSrc && (
                <a className='ax-btn primary' href={selectedSrc} target='_blank' rel='noopener noreferrer'>
                  OPEN EXTERNAL
                </a>
              )}
            </div>
          </div>

          {selectedSrc ? (
            <>
              <p className='ax-module__meta'>SOURCE :: {selectedSrc.replace(location.origin, '')}</p>
              <div className='ax-scroll ax-module__iframe' style={{ '--ax-preview-zoom': 1 } as React.CSSProperties}>
                <iframe key={refresh + selectedSrc} src={selectedSrc} title='AXIOM Roadmap' />
              </div>
            </>
          ) : (
            !err && <p className='ax-module__note'>Select a source on the left to render the roadmap.</p>
          )}
        </section>
      </div>
    </div>
  )
}
