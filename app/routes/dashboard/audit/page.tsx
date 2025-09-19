// AXIOM_DEMO_UI - WEB CORE
// Canvas: C17 - app/routes/dashboard/audit/page.tsx
// Purpose: Audit module with Red Protocol list/preview layout and zoom controls.

import React, { useEffect, useMemo, useState } from 'react'
import { vfs, type ManifestItem } from '@/lib/vfs'

function ensureSlash(s: string) {
  return s.endsWith('/') ? s : s + '/'
}

function isHtml(file?: string) {
  return !!file && /(\.html?|\.xhtml)$/i.test(file)
}

function isText(file?: string) {
  return !!file && /(\.md|\.txt)$/i.test(file)
}

type AuditItem = ManifestItem & { _idx: number }

const ZOOM_LEVELS = [1, 1.25, 1.5]

export default function AuditPage() {
  const dataBase = ensureSlash(((import.meta as any).env?.VITE_DATA_BASE as string) || 'data/')

  const [items, setItems] = useState<AuditItem[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<AuditItem | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setBusy(true)
        const list = await vfs.readAuditsManifest()
        const withIdx = (Array.isArray(list) ? list : []).map((it, i) => ({ _idx: i, ...it }))
        withIdx.sort((a: any, b: any) => (a?.date < b?.date ? 1 : a?.date > b?.date ? -1 : 0))
        if (!alive) return
        setItems(withIdx)
        setSelected(withIdx[0] ?? null)
        setErr(null)
      } catch (error: any) {
        if (!alive) return
        setErr(error?.message || 'Unable to load audit manifest')
      } finally {
        if (alive) setBusy(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter((it) =>
      (it.title || '').toLowerCase().includes(term) || (it.date || '').toLowerCase().includes(term)
    )
  }, [q, items])

  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelected(filtered[0])
    }
  }, [filtered, selected])

  const previewSrc = useMemo(() => {
    if (!selected?.file) return null
    const rel = String(selected.file).replace(/^\/+/, '')
    return isHtml(rel) ? dataBase + rel : null
  }, [selected, dataBase])

  const downloadSrc = useMemo(() => {
    if (!selected?.file) return null
    return dataBase + String(selected.file)
  }, [selected, dataBase])

  const variantForItem = (item: AuditItem): 'online' | 'warn' | 'info' => {
    if (!item.file) return 'warn'
    if (isHtml(item.file)) return 'online'
    return 'info'
  }

  return (
    <div className='ax-module' aria-busy={busy}>
      <div className='ax-module__panel-head'>
        <h1 className='ax-blade-head'>AUDIT LOGS</h1>
        <div className='ax-dashboard__chips'>
          <span className='ax-chip' data-variant='info'>TOTAL :: {items.length}</span>
          <span className='ax-chip' data-variant='info'>VISIBLE :: {filtered.length}</span>
        </div>
      </div>

      {err && (
        <div className='ax-dashboard__alert' role='alert'>
          {err}
        </div>
      )}

      <div className='ax-module__grid'>
        <section className='ax-card ax-module__panel' data-noise='on' aria-label='Audit list'>
          <div className='ax-row' style={{ gap: '0.75rem' }}>
            <input
              className='ax-input'
              placeholder='Search by title or date'
              value={q}
              onChange={(event) => setQ(event.target.value)}
              aria-label='Search audits'
            />
          </div>
          <ul className='ax-module__list'>
            {filtered.map((item) => {
              const active = selected?._idx === item._idx
              return (
                <li key={item._idx}>
                  <button
                    type='button'
                    className={`ax-chip ax-module__source${active ? ' is-active' : ''}`}
                    data-variant={variantForItem(item)}
                    onClick={() => setSelected(item)}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span>{item.title || 'UNTITLED'}</span>
                    {item.date && <span className='ax-module__source-meta'>{item.date}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className='ax-card ax-module__panel' data-noise='on' aria-label='Audit preview'>
          <div className='ax-module__panel-head'>
            <h2 className='ax-blade-head'>PREVIEW</h2>
            <div className='ax-module__actions'>
              <div className='ax-module__zoom' role='group' aria-label='Zoom level'>
                {ZOOM_LEVELS.map((level) => (
                  <button
                    key={level}
                    type='button'
                    className={`ax-chip${zoom === level ? ' is-active' : ''}`}
                    data-variant={zoom === level ? 'online' : 'info'}
                    onClick={() => setZoom(level)}
                  >
                    {Math.round(level * 100)}%
                  </button>
                ))}
              </div>
              {downloadSrc && (
                <a className='ax-btn ghost' href={downloadSrc} target='_blank' rel='noopener noreferrer'>
                  DOWNLOAD
                </a>
              )}
            </div>
          </div>

          {selected ? (
            <div className='ax-module__preview'>
              <div className='ax-dashboard__chips'>
                <span className='ax-chip' data-variant={variantForItem(selected)}>
                  {selected.file ? selected.file.toUpperCase() : 'NO FILE'}
                </span>
                {selected.date && <span className='ax-chip' data-variant='info'>DATE :: {selected.date}</span>}
              </div>
              {previewSrc ? (
                <div
                  className='ax-scroll ax-module__iframe'
                  style={{ '--ax-preview-zoom': zoom } as React.CSSProperties}
                >
                  <iframe src={previewSrc} title={`AUDIT :: ${selected.title || selected.file}`} />
                </div>
              ) : isText(selected.file) ? (
                <p className='ax-module__note'>Text and Markdown previews coming soon. Use download to open the file.</p>
              ) : selected.file ? (
                <p className='ax-module__note'>Preview is not supported for this file type. Download to view.</p>
              ) : (
                <p className='ax-module__note'>This entry does not have an attached file.</p>
              )}
            </div>
          ) : (
            <p className='ax-module__note'>Select an audit on the left to inspect the report.</p>
          )}
        </section>
      </div>
    </div>
  )
}
