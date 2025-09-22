import type { ReactNode } from 'react'

type Props = {
  src?: string | null
  title?: string
  onReload?: () => void
  reloadDisabled?: boolean
  children?: ReactNode
  externalHref?: string
  zoom?: 100 | 125 | 150
  leadingControls?: ReactNode
  reloadToken?: string | number
}

export default function PreviewPane({
  src,
  title = 'Preview',
  onReload,
  reloadDisabled,
  children,
  externalHref,
  zoom = 100,
  leadingControls,
  reloadToken,
}: Props) {
  const scale = Math.max(0.5, (zoom || 100) / 100)
  const openHref = externalHref || src || undefined

  return (
    <section className='ax-preview' aria-label={title}>
      <header className='ax-preview__bar'>
        <div className='left'>{leadingControls}</div>
        <div className='right'>
          {onReload && (
            <button
              type='button'
              className='ax-btn ghost'
              onClick={onReload}
              disabled={!!reloadDisabled}
              aria-label='Refresh preview'
              title='Refresh preview'
            >
              REFRESH
            </button>
          )}
          <span className='ax-chip'>ZOOM :: {zoom}%</span>
          {openHref && (
            <a className='ax-btn ghost' href={openHref} target='_blank' rel='noopener noreferrer'>
              OPEN SOURCE
            </a>
          )}
        </div>
      </header>

      <div
        className='ax-preview__frame'
        data-zoom={zoom}
        style={{ ['--ax-preview-zoom' as any]: String(scale) }}
      >
        {src ? (
          <iframe
            key={`${reloadToken ?? '0'}::${src}`}
            className='ax-preview__iframe'
            src={src}
            title={title}
          />
        ) : (
          children ?? <div className='ax-preview__placeholder'>No preview source.</div>
        )}
      </div>
    </section>
  )
}

// Именованный экспорт для совместимости со старыми импортами
export { PreviewPane }
export type PreviewPaneProps = Props
