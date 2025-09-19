// AXIOM_DEMO_UI - WEB CORE
// Canvas: C30 - components/PreviewPane.tsx
// Purpose: Shared iframe preview pane with zoom controls for Roadmap/Audit/Content modules.

import React, { useCallback, useEffect, useMemo, useState } from 'react'

const ZOOM_LEVELS = [1, 1.25, 1.5] as const

type ZoomValue = (typeof ZOOM_LEVELS)[number]

export interface PreviewPaneProps {
  src?: string | null
  title: string
  controls?: boolean
  externalLabel?: string
  emptyMessage?: React.ReactNode
  leadingControls?: React.ReactNode
  reloadToken?: string | number
  onReload?: () => void
  reloadDisabled?: boolean
}

export function PreviewPane({
  src,
  title,
  controls = true,
  externalLabel = 'Open External',
  emptyMessage = <p className='ax-preview__placeholder'>Select an item to preview.</p>,
  leadingControls,
  reloadToken,
  onReload,
  reloadDisabled,
}: PreviewPaneProps) {
  const safeSrc = useMemo(() => (src && src.trim() ? src.trim() : null), [src])
  const [zoom, setZoom] = useState<ZoomValue>(1)

  useEffect(() => {
    setZoom(1)
  }, [safeSrc])

  const handleZoom = useCallback((value: ZoomValue) => {
    setZoom(value)
  }, [])

  const showControls = Boolean(safeSrc && (leadingControls || controls || onReload))

  return (
    <section className='ax-card ax-preview' aria-label={title} data-has-src={Boolean(safeSrc)}>
      {showControls && (
        <div className='ax-preview__controls'>
          {leadingControls && <div className='ax-preview__leading'>{leadingControls}</div>}
          {onReload && (
            <button
              type='button'
              className='ax-btn ghost ax-preview__refresh'
              onClick={onReload}
              disabled={Boolean(reloadDisabled) || !safeSrc}
            >
              Refresh
            </button>
          )}
          {controls && safeSrc && (
            <>
              <div role='group' aria-label='Preview zoom' className='ax-preview__zoom'>
                {ZOOM_LEVELS.map((value) => (
                  <button
                    key={value}
                    type='button'
                    className='ax-chip'
                    data-variant='ghost'
                    data-zoom={Math.round(value * 100)}
                    data-active={zoom === value ? 'true' : undefined}
                    onClick={() => handleZoom(value)}
                  >
                    {Math.round(value * 100)}%
                  </button>
                ))}
              </div>
              <a className='ax-btn ghost' href={safeSrc} target='_blank' rel='noreferrer'>
                {externalLabel}
              </a>
            </>
          )}
        </div>
      )}

      <div
        className='ax-viewport ax-scroll ax-scroll-thin'
        data-zoom={zoom}
        style={{ '--ax-preview-zoom': String(zoom) } as React.CSSProperties}
      >
        {safeSrc ? (
          <iframe key={reloadToken ?? safeSrc} className='ax-embed' src={safeSrc} title={title} loading='lazy' />
        ) : (
          <div className='ax-preview__empty' role='presentation'>
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  )
}
