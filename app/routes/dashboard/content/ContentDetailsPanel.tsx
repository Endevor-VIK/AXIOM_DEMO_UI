import React, { useEffect, useMemo, useState } from 'react'

import type { ContentItem } from '@/lib/vfs'
import { safeText } from '@/components/utils'
import ContentPreview from '@/src/features/content/components/ContentPreview'
import type { ContentPreviewData } from '@/src/features/content/types'

type DetailsTabKey = 'summary' | 'meta' | 'source' | 'links'
export type ContentDetailsPanelVariant = 'inspect' | 'preview'

function ensureContentPath(file: string): string {
  const trimmed = file.replace(/^\/+/, '')
  return trimmed.startsWith('content/') ? trimmed : `content/${trimmed}`
}

export interface ContentDetailsPanelProps {
  item: ContentItem | null
  preview: ContentPreviewData | null
  dataBase: string
  onOpenSource?(id: string): void
  variant?: ContentDetailsPanelVariant
}

const ContentDetailsPanel: React.FC<ContentDetailsPanelProps> = ({
  item,
  preview,
  dataBase,
  onOpenSource,
  variant = 'inspect',
}) => {
  const isInspect = variant === 'inspect'
  const [tab, setTab] = useState<DetailsTabKey>('summary')

  useEffect(() => {
    // Keep UX predictable: when selection changes, return to Summary.
    setTab('summary')
  }, [item?.id])

  const externalHref = useMemo(() => {
    if (!item?.file) return null
    const base = dataBase.endsWith('/') ? dataBase : `${dataBase}/`
    return base + ensureContentPath(item.file)
  }, [dataBase, item?.file])

  const metaJson = useMemo(() => {
    if (!item) return ''
    try {
      return JSON.stringify(item.meta ?? {}, null, 2)
    } catch {
      return String(item.meta ?? '')
    }
  }, [item])

  return (
    <section className='ax-details-panel' aria-label='Details panel' data-variant={variant}>
      {isInspect ? (
        <header className='ax-details-head'>
          <div className='ax-details-tabs' role='tablist' aria-label='Details tabs'>
            <button
              type='button'
              role='tab'
              className='ax-details-tab'
              aria-selected={tab === 'summary'}
              data-active={tab === 'summary' ? 'true' : undefined}
              onClick={() => setTab('summary')}
            >
              Summary
            </button>
            <button
              type='button'
              role='tab'
              className='ax-details-tab'
              aria-selected={tab === 'meta'}
              data-active={tab === 'meta' ? 'true' : undefined}
              onClick={() => setTab('meta')}
              disabled={!item}
            >
              Meta
            </button>
            <button
              type='button'
              role='tab'
              className='ax-details-tab'
              aria-selected={tab === 'source'}
              data-active={tab === 'source' ? 'true' : undefined}
              onClick={() => setTab('source')}
              disabled={!item}
            >
              Source
            </button>
            <button
              type='button'
              role='tab'
              className='ax-details-tab'
              aria-selected={tab === 'links'}
              data-active={tab === 'links' ? 'true' : undefined}
              onClick={() => setTab('links')}
              disabled={!item}
            >
              Links
            </button>
          </div>
        </header>
      ) : null}

      <div className='ax-details-body'>
        {tab === 'summary' || !isInspect ? (
          <ContentPreview
            entry={preview}
            {...(onOpenSource ? { onOpenSource } : {})}
            {...(isInspect ? { onViewMeta: (_id: string) => setTab('meta') } : {})}
          />
        ) : null}

        {isInspect && tab === 'meta' ? (
          item ? (
            <div className='ax-details-pane' role='tabpanel' aria-label='Meta'>
              <div className='ax-details-kv'>
                <div>
                  <span className='ax-details-k'>ID</span>
                  <span className='ax-details-v' data-testid='content-details-id'>
                    {safeText(item.id)}
                  </span>
                </div>
                <div>
                  <span className='ax-details-k'>CATEGORY</span>
                  <span className='ax-details-v'>{safeText(item.category)}</span>
                </div>
                <div>
                  <span className='ax-details-k'>STATUS</span>
                  <span className='ax-details-v'>{safeText(item.status)}</span>
                </div>
                <div>
                  <span className='ax-details-k'>LANG</span>
                  <span className='ax-details-v'>{safeText(item.lang ?? '-')}</span>
                </div>
              </div>
              <pre className='ax-details-code' aria-label='Meta JSON'>
{metaJson}
              </pre>
            </div>
          ) : (
            <p className='ax-muted' role='tabpanel'>
              No item selected.
            </p>
          )
        ) : null}

        {isInspect && tab === 'source' ? (
          item ? (
            <div className='ax-details-pane' role='tabpanel' aria-label='Source'>
              <div className='ax-details-kv'>
                <div>
                  <span className='ax-details-k'>FILE</span>
                  <span className='ax-details-v'>{safeText(item.file)}</span>
                </div>
                <div>
                  <span className='ax-details-k'>FORMAT</span>
                  <span className='ax-details-v'>{safeText(item.format)}</span>
                </div>
                <div>
                  <span className='ax-details-k'>RENDER</span>
                  <span className='ax-details-v'>{safeText(item.renderMode ?? 'plain')}</span>
                </div>
              </div>

              <div className='ax-details-actions'>
                <button
                  type='button'
                  className='ax-btn ghost'
                  onClick={() => item && onOpenSource?.(item.id)}
                  disabled={!onOpenSource}
                >
                  Open reader
                </button>
                {externalHref ? (
                  <a
                    className='ax-btn ghost'
                    href={externalHref}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Open raw
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <p className='ax-muted' role='tabpanel'>
              No item selected.
            </p>
          )
        ) : null}

        {isInspect && tab === 'links' ? (
          item ? (
            <div className='ax-details-pane' role='tabpanel' aria-label='Links'>
              {item.links && item.links.length ? (
                <ul className='ax-details-links'>
                  {item.links.map((link, idx) => {
                    const key = `${link.type}:${link.ref}:${idx}`
                    const label = link.label || link.ref || link.type
                    const href = link.href
                    return (
                      <li key={key}>
                        {href ? (
                          <a href={href} target='_blank' rel='noopener noreferrer'>
                            {safeText(label)}
                          </a>
                        ) : (
                          <span>{safeText(label)}</span>
                        )}
                        <span className='ax-details-sub'>
                          {safeText(link.type)} · {safeText(link.ref)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className='ax-muted'>No links in this item.</p>
              )}
            </div>
          ) : (
            <p className='ax-muted' role='tabpanel'>
              No item selected.
            </p>
          )
        ) : null}
      </div>
    </section>
  )
}

export default ContentDetailsPanel
