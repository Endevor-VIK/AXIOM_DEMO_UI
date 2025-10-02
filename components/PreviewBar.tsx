import React, { type ReactNode } from 'react'

import type { ContentRenderMode } from '@/lib/vfs'

const MODE_LABELS: Record<ContentRenderMode, string> = {
  plain: 'Plain',
  hybrid: 'Hybrid',
  sandbox: 'Sandbox',
}

const MODE_DESCRIPTIONS: Record<ContentRenderMode, string> = {
  plain: 'Sanitized markdown or text rendering',
  hybrid: 'Scoped styles inside host document',
  sandbox: 'Isolated sandboxed iframe',
}

const DEFAULT_ZOOM_OPTIONS = [100, 125, 150] as const

function normalizeZoomOptions(values?: ReadonlyArray<number>): number[] {
  const source = values && values.length ? values : DEFAULT_ZOOM_OPTIONS
  const numeric = Array.from(new Set(source))
    .map((value) => Math.round(value))
    .filter((value) => Number.isFinite(value) && value > 0)
  numeric.sort((a, b) => a - b)
  return numeric
}

export interface PreviewBarProps {
  renderMode: ContentRenderMode
  modeOptions: ReadonlyArray<ContentRenderMode>
  onModeChange?: (mode: ContentRenderMode) => void
  zoom: number
  zoomOptions?: ReadonlyArray<number>
  onZoomChange?: (zoom: number) => void
  onReload?: () => void
  isReloading?: boolean
  externalHref?: string | null
  onOpenExternal?: (href: string) => void
  disabled?: boolean
  leadingControls?: ReactNode
  trailingControls?: ReactNode
}

export default function PreviewBar({
  renderMode,
  modeOptions,
  onModeChange,
  zoom,
  zoomOptions,
  onZoomChange,
  onReload,
  isReloading = false,
  externalHref,
  onOpenExternal,
  disabled = false,
  leadingControls,
  trailingControls,
}: PreviewBarProps) {
  const availableModes = Array.from(new Set(modeOptions))
  const zoomValues = normalizeZoomOptions(zoomOptions)

  const handleModeClick = (mode: ContentRenderMode) => {
    if (disabled || mode === renderMode) return
    onModeChange?.(mode)
  }

  const handleZoomClick = (value: number) => {
    if (disabled || value === zoom) return
    onZoomChange?.(value)
  }

  const handleReload = () => {
    if (disabled || !onReload) return
    onReload()
  }

  const renderOpenButton = () => {
    if (!externalHref) return null
    const label = 'Open source'
    if (onOpenExternal) {
      return (
        <button
          type='button'
          className='ax-btn primary'
          onClick={() => onOpenExternal(externalHref)}
          disabled={disabled}
        >
          {label}
        </button>
      )
    }
    return (
      <a className='ax-btn primary' href={externalHref} target='_blank' rel='noopener noreferrer'>
        {label}
      </a>
    )
  }

  return (
    <div className='ax-preview__controls' role='toolbar' aria-label='Preview controls'>
      <div className='ax-preview__leading'>
        {leadingControls}
        {availableModes.length ? (
          <div className='ax-preview__source' role='radiogroup' aria-label='Render mode'>
            {availableModes.map((mode) => (
              <button
                key={mode}
                type='button'
                className='ax-chip'
                role='radio'
                aria-checked={mode === renderMode}
                aria-label={MODE_DESCRIPTIONS[mode] ?? MODE_LABELS[mode] ?? mode}
                data-active={mode === renderMode}
                onClick={() => handleModeClick(mode)}
                disabled={disabled}
              >
                {MODE_LABELS[mode] ?? mode}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className='ax-preview__trail'>
        {zoomValues.length ? (
          <div className='ax-preview__zoom' role='radiogroup' aria-label='Zoom level'>
            {zoomValues.map((value) => (
              <button
                key={value}
                type='button'
                className='ax-chip'
                role='radio'
                aria-checked={value === zoom}
                data-active={value === zoom}
                onClick={() => handleZoomClick(value)}
                disabled={disabled || !onZoomChange}
              >
                {value}%
              </button>
            ))}
          </div>
        ) : null}

        {onReload ? (
          <button
            type='button'
            className='ax-btn ghost ax-preview__refresh'
            onClick={handleReload}
            disabled={disabled || isReloading}
            aria-live='polite'
          >
            {isReloading ? 'Reloading...' : 'Reload'}
          </button>
        ) : null}

        {renderOpenButton()}
        {trailingControls}
      </div>
    </div>
  )
}



