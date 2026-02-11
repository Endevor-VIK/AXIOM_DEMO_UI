import React from 'react'

import type { ContentPreviewData } from '../types'
import { withExportPath } from '../exportRoot'

export interface ContentPreviewProps {
  entry: ContentPreviewData | null
  onOpenSource?(id: string): void
  onViewMeta?(id: string): void
}

const ContentPreview: React.FC<ContentPreviewProps> = ({ entry, onOpenSource, onViewMeta }) => {
  const handleOpen = () => {
    if (entry) onOpenSource?.(entry.id)
  }

  const handleMeta = () => {
    if (entry) onViewMeta?.(entry.id)
  }

  if (!entry) {
    return (
      <div className='ax-content-preview axcp-empty' aria-live='polite'>
        Выберите файл слева, чтобы увидеть превью.
      </div>
    )
  }

  const { preview } = entry

  return (
    <section className='ax-content-preview' aria-label='Content preview'>
      <div className='axcp-wrap' data-axcp-split>
        <figure className='axcp-media' data-tilt>
          <img
            src={withExportPath(preview.image)}
            alt={entry.title}
            loading='lazy'
            className='axcp-img'
          />
          <div className='axcp-layer axcp-layer--shade' aria-hidden='true'></div>
          <div className='axcp-layer axcp-layer--scan' aria-hidden='true'></div>
          <figcaption className='axcp-cap'>
            <span className='axcp-name'>{entry.title}</span>
            <span className='axcp-tag'>{entry.category.toUpperCase()}</span>
          </figcaption>
        </figure>

        <aside className='axcp-copy' aria-describedby='axcp-core-preview'>
          <header className='axcp-head'>
            <div className='axcp-title-row'>
              <h2 id='axcp-core-preview' className='axcp-title'>
                {entry.title}
              </h2>
              <span className='axcp-overline'>— CORE PREVIEW</span>
            </div>
            <div className='axcp-kicker'>{preview.kicker}</div>
            <div className='axcp-meta'>
              ZONE: <b>{entry.zone}</b> · ID: <b>[{entry.id}]</b> · VERSION:{' '}
              <b>{entry.version}</b>
            </div>
          </header>

          <p className='axcp-lead'>{preview.logline}</p>

          <div className='axcp-grid'>
            <div className='axcp-block'>
              <h3>Ключевые маркеры</h3>
              <ul className='axcp-list'>
                {preview.markers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className='axcp-block'>
              <h3>Сигнатура</h3>
              <ul className='axcp-list'>
                {preview.signature.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <footer className='axcp-foot'>
            <div className='axcp-tags'>
              {entry.tags.map((tag) => (
                <span key={tag} className='axcp-chip'>
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
            <div className='axcp-actions'>
              {onViewMeta ? (
                <button className='axcp-btn axcp-btn--ghost' type='button' onClick={handleMeta}>
                  View meta
                </button>
              ) : null}
              <button className='axcp-btn axcp-btn--primary' type='button' onClick={handleOpen}>
                Open source
              </button>
            </div>
          </footer>
        </aside>
      </div>
    </section>
  )
}

export default ContentPreview
