import React, { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import PreviewPane from '@/components/PreviewPane'
import { safeText } from '@/components/utils'
import type { ContentRenderMode } from '@/lib/vfs'

import { useContentHub } from './context'

const FULL_ALLOWED_MODES: ReadonlyArray<ContentRenderMode> = ['plain', 'hybrid', 'sandbox']

const ReadRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { aggregate, loading, error, dataBase } = useContentHub()

  const item = useMemo(() => {
    if (!aggregate || !id) return null
    return aggregate.items.find((entry) => entry.id === id) ?? null
  }, [aggregate, id])

  const fromState = (location.state as { from?: string } | null)?.from
  const search = location.search

  const handleBack = () => {
    if (fromState) {
      navigate(fromState, { replace: true })
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(`/dashboard/content/all${search}`, { replace: true })
    }
  }

  if (loading) {
    return (
      <section className='ax-reader'>
        <div className='ax-reader__toolbar'>
          <button type='button' className='ax-btn ax-btn--ghost' onClick={handleBack}>
            ← Back
          </button>
          <span className='ax-reader__title'>Loading…</span>
        </div>
        <div className='ax-skeleton ax-skeleton--block' style={{ height: '60vh' }} />
      </section>
    )
  }

  if (error) {
    return (
      <section className='ax-reader'>
        <div className='ax-reader__toolbar'>
          <button type='button' className='ax-btn ax-btn--ghost' onClick={handleBack}>
            ← Back
          </button>
        </div>
        <p className='ax-muted'>Unable to load reader: {safeText(error, '-')}</p>
      </section>
    )
  }

  if (!item) {
    return (
      <section className='ax-reader'>
        <div className='ax-reader__toolbar'>
          <button type='button' className='ax-btn ax-btn--ghost' onClick={handleBack}>
            ← Back
          </button>
        </div>
        <p className='ax-muted'>Content item not found.</p>
      </section>
    )
  }

  return (
    <section className='ax-reader'>
      <div className='ax-reader__toolbar'>
        <button type='button' className='ax-btn ax-btn--ghost' onClick={handleBack}>
          ← Back
        </button>
        <div className='ax-reader__meta'>
          <h2 className='ax-reader__title'>{safeText(item.title)}</h2>
          <span className='ax-reader__subtitle'>{safeText(item.id)}</span>
        </div>
      </div>
      <div className='ax-reader__preview'>
        <PreviewPane
          item={item}
          dataBase={dataBase}
          initialZoom={125}
          allowedModes={FULL_ALLOWED_MODES}
        />
      </div>
    </section>
  )
}

export default ReadRoute
