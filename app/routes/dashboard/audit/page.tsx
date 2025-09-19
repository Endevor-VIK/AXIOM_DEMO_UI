// AXIOM_DEMO_UI - WEB CORE
// Canvas: C17 - app/routes/dashboard/audit/page.tsx
// Purpose: Audit module with compact list and shared PreviewPane for reports.

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { PreviewPane } from '@/components/PreviewPane'
import { vfs, type ManifestItem } from '@/lib/vfs'

function ensureSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

function isHtml(file?: string) {
  return !!file && /(\.html?|\.xhtml)$/i.test(file)
}

function isText(file?: string) {
  return !!file && /(\.md|\.txt)$/i.test(file)
}

type AuditItem = ManifestItem & { _idx: number }

export default function AuditPage() {
  const dataBase = ensureSlash(((import.meta as any).env?.VITE_DATA_BASE as string) || 'data/')

  const [items, setItems] = useState<AuditItem[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<AuditItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setBusy(true)
        const list = await vfs.readAuditsManifest()
        const prepared = (Array.isArray(list) ? list : []).map((item, index) => ({ _idx: index, ...item }))
        prepared.sort((a: any, b: any) => (a?.date < b?.date ? 1 : a?.date > b?.date ? -1 : 0))
        if (!alive) return
        setItems(prepared)
        setSelected(prepared[0] ?? null)
        setError(null)
      } catch (e: any) {
        if (!alive) return
        setError(e?.message || 'Unable to load audit manifest')
      } finally {
        if (alive) setBusy(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) =>
      (item.title || '').toLowerCase().includes(term) || (item.date || '').toLowerCase().includes(term)
    )
  }, [items, query])

  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelected(filtered[0])
    }
  }, [filtered, selected])

  const previewInfo = useMemo(() => {
    if (!selected?.file) {
      return { src: undefined, note: 'This entry does not include a file.' }
    }
    const rel = String(selected.file).replace(/^\\/+/, '')
    if (isHtml(rel)) {
      return { src: dataBase + rel, note: undefined }
    }
    if (isText(rel)) {
      return {
        src: undefined,
        note: 'Text and Markdown previews are not yet supported. Use Open External to view the file.'
      }
    }
    return { src: undefined, note: 'Preview is not available for this file type.' }
  }, [selected, dataBase])

  const metaChips = useMemo(() => {
    if (!selected) return null
    const variant = selected.file ? (previewInfo.src ? 'online' : 'info') : 'warn'
    return (
      <>
        <span className='ax-chip' data-variant={variant}>
          {selected.file ? selected.file.toUpperCase() : 'NO FILE'}
        </span>
        {selected.date && <span className='ax-chip' data-variant='info'>DATE :: {selected.date}</span>}
      </>
    )
  }, [previewInfo.src, selected])

  const [reloadKey, setReloadKey] = useState(0)

  const handleReload = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  return (
    <section className='ax-container ax-section' aria-busy={busy}>
      <div className='ax-two-col'>
        <aside className='ax-card low' role='navigation' aria-label='Audit list'>
          <h1 className='ax-blade-head'>Audit Logs</h1>
          <div className='ax-filter-row'>
            <input
              className='ax-input'
              placeholder='Search by title or date'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label='Search audits'
            />
          </div>
          <div className='ax-dashboard__chips'>
            <span className='ax-chip' data-variant='info'>TOTAL :: {items.length}</span>
            <span className='ax-chip' data-variant='info'>VISIBLE :: {filtered.length}</span>
          </div>
          <ul className='ax-module__list'>
            {filtered.map((item) => {
              const active = selected?._idx === item._idx
              const variant = !item.file ? 'warn' : isHtml(item.file) ? 'online' : 'info'
              return (
                <li key={item._idx}>
                  <button
                    type='button'
                    className={`ax-chip ax-module__source${active ? ' is-active' : ''}`}
                    data-variant={variant}
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
        </aside>

        <div className='ax-preview-panel'>
          {error && (
            <div className='ax-dashboard__alert' role='alert'>
              {error}
            </div>
          )}

          <PreviewPane
            src={previewInfo.src}
            title={`AUDIT :: ${selected?.title || selected?.file || 'Preview'}`}
            controls={Boolean(previewInfo.src)}
            leadingControls={metaChips}
            emptyMessage={
              <p className='ax-preview__placeholder'>
                {previewInfo.note || 'Select an audit entry to view details.'}
              </p>
            }
          />

          {!previewInfo.src && previewInfo.note && selected?.file && (
            <div className='ax-preview__note'>
              <p>{previewInfo.note}</p>
              <a className='ax-btn ghost' href={dataBase + String(selected.file)} target='_blank' rel='noreferrer'>
                Open External
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


