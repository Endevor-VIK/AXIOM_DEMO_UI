// AXIOM_DEMO_UI - WEB CORE
// Canvas: C16 - app/routes/dashboard/roadmap/page.tsx
// Purpose: Roadmap panel using shared PreviewPane with default index fallback selection.

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { PreviewPane } from '@/components/PreviewPane'
import { vfs } from '@/lib/vfs'

const REQUIRED_SOURCE = 'roadmap/index.html'
const FALLBACK_SOURCES = ['roadmap.html', 'roadmap/roadmap.html']

type SourceProbe = {
  path: string
  available: boolean
}

type AvailableSource = SourceProbe & { href: string }

function ensureSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

export default function RoadmapPage() {
  const dataBase = ensureSlash(((import.meta as any).env?.VITE_DATA_BASE as string) || 'data/')
  const candidates = useMemo<SourceProbe[]>(
    () => [REQUIRED_SOURCE, ...FALLBACK_SOURCES].map((path) => ({ path, available: false })),
    []
  )

  const [sources, setSources] = useState<SourceProbe[]>(candidates)
  const [selected, setSelected] = useState<string | null>(REQUIRED_SOURCE)
  const [message, setMessage] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const status: SourceProbe[] = []
      for (const entry of candidates) {
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
  }, [candidates])

  const available = useMemo<AvailableSource[]>(() => {
    return sources
      .filter((item) => item.available)
      .map((item) => ({ ...item, href: dataBase + item.path }))
  }, [sources, dataBase])

  const previewSrc = selected ? dataBase + selected : null

  const handleSource = useCallback((path: string) => {
    setSelected(path)
  }, [])

  const handleRefresh = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  const sourceControls = useMemo(() => {
    if (available.length <= 1) return null
    return (
      <div className='ax-preview__source'>
        <span className='ax-chip' data-variant='ghost'>SOURCE</span>
        <div className='ax-preview__source-options'>
          {available.map((item) => {
            const active = item.path === selected
            return (
              <button
                key={item.path}
                type='button'
                className='ax-chip'
                data-variant={active ? 'online' : 'ghost'}
                data-active={active ? 'true' : undefined}
                onClick={() => handleSource(item.path)}
              >
                {item.path.replace('roadmap/', '').toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>
    )
  }, [available, handleSource, selected])

  return (
    <section className='ax-container ax-section' aria-live='polite'>
      {message && (
        <div className='ax-dashboard__alert' role='status'>
          {message}
        </div>
      )}

      <PreviewPane
        src={previewSrc ?? null}
        title='AXIOM Roadmap'
        reloadToken={`${reloadKey}-${selected ?? 'none'}`}
        leadingControls={sourceControls}
        onReload={handleRefresh}
        reloadDisabled={!previewSrc}
        emptyMessage={<p className='ax-preview__placeholder'>Roadmap source is missing.</p>}
      />
    </section>
  )
}

