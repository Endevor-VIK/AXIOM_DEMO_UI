import React from 'react'

import type { ContentRenderMode } from '@/lib/vfs'

import { classNames } from '../utils'

export const PREVIEW_ZOOM_LEVELS = [100, 125, 150] as const
export type PreviewZoom = (typeof PREVIEW_ZOOM_LEVELS)[number]

export interface PreviewBarProps {
  mode: ContentRenderMode
  allowedModes: ReadonlyArray<ContentRenderMode>
  onModeChange?: (mode: ContentRenderMode) => void
  zoom: PreviewZoom
  onZoomChange?: (zoom: PreviewZoom) => void
  zoomLevels?: ReadonlyArray<PreviewZoom>
  onReload?: () => void
  reloading?: boolean
  externalHref?: string | null
  onOpenExternal?: (href: string) => void
  disabled?: boolean
  leadingControls?: React.ReactNode
  trailingControls?: React.ReactNode
}

const MODE_LABEL: Record<ContentRenderMode, string> = {
  plain: 'Plain',
  hybrid: 'Hybrid',
  sandbox: 'Sandbox',
}

const BUTTON_BASE = 'ax-btn ax-btn--ghost ax-btn--dense'
const CHIP_BASE = 'ax-chip ax-chip--dense'

function isPreviewMode(value: unknown): value is ContentRenderMode {
  return value === 'plain' || value === 'hybrid' || value === 'sandbox'
}

function dedupeModes(source: ReadonlyArray<ContentRenderMode>): ContentRenderMode[] {
  const seen = new Set<ContentRenderMode>()
  for (const entry of source) {
    if (isPreviewMode(entry)) {
      seen.add(entry)
    }
  }
  return Array.from(seen)
}

export function isPreviewZoom(value: number): value is PreviewZoom {
  return PREVIEW_ZOOM_LEVELS.includes(value as PreviewZoom)
}

export function clampPreviewZoom(value: number): PreviewZoom {
  return isPreviewZoom(value) ? (value as PreviewZoom) : PREVIEW_ZOOM_LEVELS[0]
}

const PreviewBar: React.FC<PreviewBarProps> = ({
  mode,
  allowedModes,
  onModeChange,
  zoom,
  onZoomChange,
  zoomLevels = PREVIEW_ZOOM_LEVELS,
  onReload,
  reloading = false,
  externalHref,
  onOpenExternal,
  disabled = false,
  leadingControls,
  trailingControls,
}) => {
  const modes = React.useMemo(() => {
    const deduped = dedupeModes(allowedModes)
    if (!deduped.includes(mode) && isPreviewMode(mode)) {
      deduped.push(mode)
    }
    return deduped
  }, [allowedModes, mode])

  const normalizedZoomLevels = React.useMemo(() => {
    const values = zoomLevels.length ? zoomLevels : PREVIEW_ZOOM_LEVELS
    const deduped = Array.from(new Set(values))
      .map((value) => Math.round(value))
      .filter((value) => isPreviewZoom(value))
    return deduped.length ? (deduped as PreviewZoom[]) : [...PREVIEW_ZOOM_LEVELS]
  }, [zoomLevels])

  return (
    <div className='ax-preview__bar' role='toolbar' aria-label='Preview controls'>
      <div className='left'>
        {leadingControls}
        {modes.length > 1
          ? modes.map((entry) => {
              const active = entry === mode
              return (
                <button
                  key={entry}
                  type='button'
                  className={classNames(BUTTON_BASE, active && 'is-active')}
                  aria-pressed={active}
                  onClick={() => {
                    if (disabled || active) return
                    onModeChange?.(entry)
                  }}
                >
                  {MODE_LABEL[entry]}
                </button>
              )
            })
          : null}

        {normalizedZoomLevels.length > 1 ? (
          <div className='ax-preview__zoom'>
            {normalizedZoomLevels.map((level) => {
              const active = level === zoom
              return (
                <button
                  key={level}
                  type='button'
                  className={classNames(CHIP_BASE, active && 'is-active')}
                  aria-pressed={active}
                  onClick={() => {
                    if (disabled || active) return
                    onZoomChange?.(level)
                  }}
                >
                  {level}%
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className='right'>
        {trailingControls}

        {onReload ? (
          <button
            type='button'
            className={BUTTON_BASE}
            onClick={() => {
              if (disabled || reloading) return
              onReload()
            }}
            disabled={disabled || reloading}
          >
            {reloading ? 'Reloading...' : 'Reload'}
          </button>
        ) : null}

        {externalHref
          ? onOpenExternal
            ? (
                <button
                  type='button'
                  className='ax-btn ax-btn--primary ax-btn--dense'
                  onClick={() => {
                    if (!disabled && externalHref) {
                      onOpenExternal(externalHref)
                    }
                  }}
                  disabled={disabled}
                >
                  Open source
                </button>
              )
            : (
                <a
                  className='ax-btn ax-btn--primary ax-btn--dense'
                  href={externalHref}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Open source
                </a>
              )
          : null}
      </div>
    </div>
  )
}

export default PreviewBar
