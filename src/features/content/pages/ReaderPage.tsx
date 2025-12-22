import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import type { ContentPreviewData } from '../types'
import contentIndex from '../data/content-index.json'
import { withBasePath } from '../utils'
import { ReaderMenuLayer } from '../components/ReaderMenuLayer'

import '@/styles/content-hub-v2.css'

interface LoadState {
  html: string
  loading: boolean
  error: string | null
}

const entries = contentIndex as ContentPreviewData[]

function resolveEntry(rawId: string | undefined): ContentPreviewData | null {
  if (!rawId) return null
  const normalized = rawId.trim()
  if (!normalized) return null
  const lower = normalized.toLowerCase()

  // 1) exact id match (case-insensitive)
  const exact = entries.find((item) => item.id.toLowerCase() === lower)
  if (exact) return exact

  // 2) slug match
  const slugMatch = entries.find((item) => (item.slug ?? '').toLowerCase() === lower)
  if (slugMatch) return slugMatch

  // 3) Legacy character ids: CHR-VIKTOR-0301 -> 03.01_VIKTOR
  const legacy = normalized.match(/^chr[-_]?([a-z0-9-]+?)[-_](\d{3,4})$/i)
  if (legacy) {
    const [, rawName, digits] = legacy
    if (rawName && digits) {
      const name = rawName.replace(/-/g, '_').toUpperCase()
      const zone = digits.slice(0, 2)
      const idx = digits.slice(2)
      const candidateId = `${zone}.${idx}_${name}`
      const candidate = entries.find((item) => item.id.toLowerCase() === candidateId.toLowerCase())
      if (candidate) return candidate
    }
  }

  // 4) Match by numeric suffix (e.g., 0301 -> 03.01_VIKTOR)
  const suffix = normalized.match(/(\d{3,4})$/)?.[1]
  if (suffix) {
    const candidate = entries.find((item) =>
      item.id.replace(/[._-]/g, '').toLowerCase().endsWith(suffix.toLowerCase())
    )
    if (candidate) return candidate
  }

  return null
}

const ReaderPage: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const entry = useMemo(() => resolveEntry(rawId), [rawId])
  const activeId = entry?.id ?? null

  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [state, setState] = useState<LoadState>({ html: '', loading: true, error: null })
  const [fetchKey, setFetchKey] = useState(0)

  // Redirect to canonical id if resolved from legacy
  useEffect(() => {
    if (entry && rawId && entry.id !== rawId) {
      navigate(`/content/${encodeURIComponent(entry.id)}${location.search}`, { replace: true })
    }
  }, [entry, navigate, rawId, location.search])

  useEffect(() => {
    setMenuOpen(false)
  }, [rawId])

  useEffect(() => {
    setMenuOpen(false)
    if (!entry) return
    const controller = new AbortController()
    setState({ html: '', loading: true, error: null })

    const target = withBasePath(`/content-html/${encodeURIComponent(entry.id)}.html`)
    fetch(target, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((html) => {
        const trimmed = html.trim()
        if (!trimmed) {
          setState({ html: '', loading: false, error: 'Пустое тело файла: ' + target })
        } else {
          setState({ html: trimmed, loading: false, error: null })
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : String(err)
        setState({ html: '', loading: false, error: `${message} · ${target}` })
      })

    return () => controller.abort()
  }, [entry, fetchKey])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const handleSelect = (nextId: string) => {
    navigate(`/content/${encodeURIComponent(nextId)}`)
    setMenuOpen(false)
  }

  const handleBack = () => {
    navigate(`/dashboard/content?id=${encodeURIComponent(entry?.id ?? '')}`, { replace: true })
  }

  if (!entry) {
    return (
      <>
        <ReaderMenuLayer
          open={menuOpen}
          entries={entries}
          activeId={activeId}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
          onClose={() => setMenuOpen(false)}
        />
        <section className='ax-reader axr-empty'>
          <header className='axr-header'>
            <button className='axr-back' type='button' onClick={() => navigate('/dashboard/content')}>
              <span className='axr-icon'>←</span>
              <span className='axr-label'>Content</span>
            </button>
            <div className='axr-fileinfo'>
              <span className='axr-id'>NOT FOUND</span>
            </div>
          </header>
          <main className='axr-main'>
            <article className='axr-body axr-body--constrained axr-body--centered'>
              <div className='axr-state axr-state--error'>
                Файл не найден.<br />
                Запрошенный контент недоступен или был удалён. Вернитесь в CONTENT HUB, чтобы выбрать другой файл.
              </div>
              <div className='axr-state__actions'>
                <button
                  className='axcp-btn axcp-btn--primary'
                  type='button'
                  onClick={() => navigate('/dashboard/content')}
                >
                  Вернуться в CONTENT
                </button>
              </div>
            </article>
          </main>
        </section>
      </>
    )
  }

  return (
    <>
      <ReaderMenuLayer
        open={menuOpen}
        entries={entries}
        activeId={activeId}
        search={search}
        onSearchChange={setSearch}
        onSelect={handleSelect}
        onClose={() => setMenuOpen(false)}
      />

      <section className={`ax-reader${menuOpen ? ' is-menu-open' : ''}`} aria-label='AXIOM file reader'>
        <header className='axr-header'>
          <button className='axr-back' type='button' onClick={handleBack}>
            <span className='axr-icon'>←</span>
            <span className='axr-label'>Content</span>
          </button>

          <button
            className={`axr-menu-btn${menuOpen ? ' is-active' : ''}`}
            type='button'
            aria-label='Меню файлов'
            aria-expanded={menuOpen}
            aria-pressed={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className='axr-menu-btn__icon' aria-hidden='true'>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          <div className='axr-fileinfo'>
            <span className='axr-id'>[{entry.id}]</span>
            <span className='axr-dot'>•</span>
            <span className='axr-status'>
              {entry.version} · {entry.status.toUpperCase()} · {entry.lang.toUpperCase()}
            </span>
          </div>
        </header>

        <div className='axr-container'>
          <main className='axr-main'>
            <article className='axr-body axr-body--constrained' aria-live='polite'>
              {state.loading && <div className='axr-state'>LOADING …</div>}
              {!state.loading && state.error && (
                <div className='axr-state axr-state--error'>
                  Не удалось загрузить файл {entry.id}. Ошибка: {state.error}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      className='axcp-btn axcp-btn--primary'
                      type='button'
                      onClick={() => setFetchKey((x) => x + 1)}
                    >
                      Повторить загрузку
                    </button>
                  </div>
                </div>
              )}
              {!state.loading && !state.error && (
                <div dangerouslySetInnerHTML={{ __html: state.html }} />
              )}
            </article>
          </main>
        </div>
      </section>
    </>
  )
}

export default ReaderPage
