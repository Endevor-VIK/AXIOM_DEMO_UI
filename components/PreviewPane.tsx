import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import type { Config as DOMPurifyConfig } from 'dompurify'
import { marked } from 'marked'

import { vfs, type ContentItem, type ContentRenderMode } from '@/lib/vfs'
import { normalizeScopeId, prefixStyles } from '@/lib/hybrid/prefixStyles'
import { deriveAssetsBase, resolveAssets } from '@/lib/hybrid/resolveAssets'
import { attachReveal, attachTilt } from '@/lib/content-hooks'

import PreviewBar, { PREVIEW_ZOOM_LEVELS, type PreviewZoom } from './preview/PreviewBar'
import { classNames, formatDate, safeText } from './utils'

const MARKDOWN_SANITIZE_OPTIONS: DOMPurifyConfig = {
  ADD_TAGS: ['style', 'svg', 'path', 'defs', 'linearGradient', 'radialGradient'],
  ADD_ATTR: ['class', 'style', 'role', 'aria-label', 'id', 'fill', 'stroke', 'viewBox'],
  ALLOW_UNKNOWN_PROTOCOLS: true,
}

const SANDBOX_MESSAGE_NAMESPACE = 'axiom-preview:'

type PreviewPaneProps = {
  item: ContentItem | null
  dataBase: string
  allowedModes?: ReadonlyArray<ContentRenderMode>
  initialZoom?: number
  onOpenExternal?: (href: string) => void
}

type ExtractedStyles = {
  css: string
  markup: string
}

function ensureContentPath(file: string): string {
  const trimmed = file.replace(/^\/+/, '')
  return trimmed.startsWith('content/') ? trimmed : `content/${trimmed}`
}

function isHtml(format: string): boolean {
  return format === 'html'
}

function isMarkdown(format: string): boolean {
  return format === 'md' || format === 'markdown'
}

function isText(format: string): boolean {
  return format === 'txt'
}

function isPreviewMode(value: unknown): value is ContentRenderMode {
  return value === 'plain' || value === 'hybrid' || value === 'sandbox'
}

function dedupeModes(source: ReadonlyArray<ContentRenderMode>): ContentRenderMode[] {
  const uniq = new Set<ContentRenderMode>()
  source.forEach((mode) => {
    if (isPreviewMode(mode)) {
      uniq.add(mode)
    }
  })
  return Array.from(uniq)
}

function deriveFormatModes(format: string): ContentRenderMode[] {
  if (isMarkdown(format)) return ['plain', 'hybrid', 'sandbox'] as ContentRenderMode[]
  if (isText(format)) return ['plain'] as ContentRenderMode[]
  if (isHtml(format)) return ['plain', 'sandbox'] as ContentRenderMode[]
  return ['plain'] as ContentRenderMode[]
}

function selectInitialMode(
  allowed: ContentRenderMode[],
  preferred?: ContentRenderMode | null,
): ContentRenderMode {
  if (preferred && allowed.includes(preferred)) {
    return preferred
  }
  return allowed[0] ?? 'plain'
}

function normalizeZoom(value?: number): PreviewZoom {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const nearest = PREVIEW_ZOOM_LEVELS.reduce((best, candidate) =>
      Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
    )
    return nearest
  }
  return PREVIEW_ZOOM_LEVELS[0]
}

function extractStyleBlocks(html: string): ExtractedStyles {
  if (!html) return { css: '', markup: '' }
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const cssParts: string[] = []
    doc.querySelectorAll('style').forEach((node) => {
      if (node.textContent) cssParts.push(node.textContent)
      node.remove()
    })
    return { css: cssParts.join('\n'), markup: doc.body.innerHTML }
  }
  const cssParts: string[] = []
  const STYLE_BLOCK_PATTERN = /<style[^>]*>([\s\S]*?)<\/style>/gi
  const markup = html.replace(STYLE_BLOCK_PATTERN, (_, block: string) => {
    cssParts.push(block)
    return ''
  })
  return { css: cssParts.join('\n'), markup }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function buildSandboxDocument(content: string, baseHref: string): string {
  const escapedBase = escapeAttribute(baseHref)
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    `<base href="${escapedBase}" />`,
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<style>',
    '  :root { color-scheme: light dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
    '  body { margin: 0; padding: 16px; background: transparent; color: inherit; line-height: 1.6; }',
    '  img, video, iframe { max-width: 100%; height: auto; }',
    '</style>',
    '<script>',
    '(function(){',
    '  const NS = "' + SANDBOX_MESSAGE_NAMESPACE + '";',
    '  const SEND = () => {',
    '    try {',
    '      const doc = document;',
    '      const height = Math.max(',
    '        doc.body ? doc.body.scrollHeight : 0,',
    '        doc.documentElement ? doc.documentElement.scrollHeight : 0,',
    '        doc.body ? doc.body.offsetHeight : 0,',
    '        doc.documentElement ? doc.documentElement.offsetHeight : 0,',
    '        doc.body ? doc.body.clientHeight : 0,',
    '        doc.documentElement ? doc.documentElement.clientHeight : 0',
    '      );',
    '      parent.postMessage({ type: NS + "resize", height }, "*");',
    '    } catch (error) { /* noop */ }',
    '  };',
    '  window.addEventListener("load", SEND);',
    '  if (window.ResizeObserver) {',
    '    const observer = new ResizeObserver(() => requestAnimationFrame(SEND));',
    '    observer.observe(document.body);',
    '  } else {',
    '    let lastHeight = 0;',
    '    setInterval(() => {',
    '      const now = document.body ? document.body.scrollHeight : 0;',
    '      if (now !== lastHeight) { lastHeight = now; SEND(); }',
    '    }, 500);',
    '  }',
    '  window.addEventListener("message", function(event){',
    '    const data = event && event.data;',
    '    if (data && typeof data === "object" && data.type === NS + "ping") {',
    '      SEND();',
    '    }',
    '  });',
    '})();',
    '</script>',
    '</head>',
    `<body>${content}</body>`,
    '</html>',
  ].join('')
}

function computeSandboxBaseHref(dataBase: string, filePath?: string | null): string {
  const base = dataBase.endsWith('/') ? dataBase : `${dataBase}/`
  if (!filePath) return base
  const normalized = ensureContentPath(filePath)
  const directory = normalized.replace(/[^/]*$/, '')
  return `${base}${directory}`
}

export default function PreviewPane({
  item,
  dataBase,
  allowedModes: allowedModesProp,
  initialZoom,
  onOpenExternal,
}: PreviewPaneProps) {
  const [textContent, setTextContent] = useState('')
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [htmlLoading, setHtmlLoading] = useState(false)
  const [htmlError, setHtmlError] = useState<string | null>(null)

  const [renderedHtml, setRenderedHtml] = useState('')
  const [renderError, setRenderError] = useState<string | null>(null)

  const [sandboxDoc, setSandboxDoc] = useState<string | null>(null)
  const [sandboxHeight, setSandboxHeight] = useState<number | null>(null)
  const [sandboxKey, setSandboxKey] = useState(0)
  const [sandboxReloading, setSandboxReloading] = useState(false)

  const format = (item?.format ?? '').toLowerCase()
  const filePath = item ? ensureContentPath(item.file) : null
  const externalHref = item && filePath ? dataBase + filePath : null
  const assetsBase = item ? deriveAssetsBase(item) : undefined

  const allowedModes = useMemo<ContentRenderMode[]>(() => {
    const formatModes = dedupeModes(deriveFormatModes(format))
    const candidate = allowedModesProp ? dedupeModes(allowedModesProp) : formatModes
    const filtered = candidate.filter((mode) => formatModes.includes(mode))
    return filtered.length
      ? filtered
      : formatModes.length
        ? formatModes
        : (['plain'] as ContentRenderMode[])
  }, [allowedModesProp, format])

  const initialMode = useMemo(
    () => selectInitialMode(allowedModes, item?.renderMode ?? null),
    [allowedModes, item?.renderMode],
  )

  const [mode, setMode] = useState<ContentRenderMode>(initialMode)
  useEffect(() => {
    setMode(initialMode)
    setSandboxDoc(null)
    setSandboxHeight(null)
  }, [initialMode, item?.id])

  const [zoom, setZoom] = useState<PreviewZoom>(() => normalizeZoom(initialZoom))
  useEffect(() => {
    setZoom(normalizeZoom(initialZoom))
  }, [initialZoom, item?.id])

  const zoomStyle = useMemo(
    () => ({ '--ax-preview-zoom': zoom / 100 } as React.CSSProperties),
    [zoom],
  )

  const contentRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (!item || !filePath) {
      setTextContent('')
      setTextLoading(false)
      setTextError(null)
      return
    }

    const needsText =
      isMarkdown(format) || isText(format) || (mode === 'sandbox' && format !== 'html')

    if (!needsText) {
      setTextContent('')
      setTextLoading(false)
      setTextError(null)
      return
    }

    let cancelled = false
    setTextLoading(true)
    setTextError(null)

    vfs
      .text(filePath)
      .then((raw) => {
        if (cancelled) return
        setTextContent(raw)
      })
      .catch((err) => {
        if (cancelled) return
        const reason = err instanceof Error ? err.message : String(err)
        setTextError(reason)
        setTextContent('')
      })
      .finally(() => {
        if (!cancelled) setTextLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [item?.id, filePath, format, mode])

  useEffect(() => {
    if (!item || !filePath || format !== 'html' || mode !== 'sandbox') {
      setHtmlContent(null)
      setHtmlLoading(false)
      setHtmlError(null)
      return
    }

    let cancelled = false
    setHtmlLoading(true)
    setHtmlError(null)

    vfs
      .text(filePath)
      .then((raw) => {
        if (cancelled) return
        setHtmlContent(raw)
      })
      .catch((err) => {
        if (cancelled) return
        const reason = err instanceof Error ? err.message : String(err)
        setHtmlError(reason)
        setHtmlContent(null)
      })
      .finally(() => {
        if (!cancelled) setHtmlLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [item?.id, filePath, format, mode])

  useEffect(() => {
    setRenderError(null)
    setRenderedHtml('')

    if (!item) {
      setSandboxDoc(null)
      return
    }

    const scopeId = normalizeScopeId(item.id)
    const assets = assetsBase ?? undefined
    const baseHref = computeSandboxBaseHref(dataBase, item.file)

    const process = async () => {
      try {
        if (mode === 'sandbox') {
          let sandboxContent = ''

          if (format === 'html') {
            if (!htmlContent) {
              setSandboxDoc(null)
              return
            }
            sandboxContent = htmlContent
          } else if (isMarkdown(format)) {
            if (!textContent) {
              setSandboxDoc(null)
              return
            }
            const parsed = marked.parse(textContent)
            const html = typeof parsed === 'string' ? parsed : String(parsed)
            sandboxContent = html
          } else if (isText(format)) {
            sandboxContent = `<pre>${escapeHtml(textContent)}</pre>`
          } else {
            sandboxContent = `<pre>${escapeHtml(textContent)}</pre>`
          }

          const doc = buildSandboxDocument(sandboxContent, baseHref)
          setSandboxDoc(doc)
          setRenderedHtml('')
          return
        }

        if (isMarkdown(format)) {
          if (!textContent) {
            setRenderedHtml('')
            return
          }
          const parsed = marked.parse(textContent)
          const rawHtml = typeof parsed === 'string' ? parsed : String(parsed)
          const sanitized =
            typeof window === 'undefined'
              ? rawHtml
              : DOMPurify.sanitize(rawHtml, MARKDOWN_SANITIZE_OPTIONS)

          if (mode === 'hybrid') {
            const { css, markup } = extractStyleBlocks(sanitized)
            const prefixedCss = css ? await prefixStyles(css, scopeId) : ''
            const resolvedMarkup = resolveAssets(markup, assets, dataBase)
            const styleTag = prefixedCss
              ? `<style data-ax-scope="${scopeId}">${prefixedCss}</style>`
              : ''
            setRenderedHtml(styleTag + `<div data-ax-scope="${scopeId}">${resolvedMarkup}</div>`)
            return
          }

          const resolved = resolveAssets(sanitized, assets, dataBase)
          setRenderedHtml(resolved)
          return
        }

        setRenderedHtml('')
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        setRenderError(reason)
        setRenderedHtml('')
        setSandboxDoc(null)
      }
    }

    process()
  }, [
    assetsBase,
    dataBase,
    format,
    htmlContent,
    item,
    mode,
    textContent,
  ])

  useEffect(() => {
    if (mode !== 'sandbox') return

    const handler = (event: MessageEvent) => {
      const data = event?.data
      if (!data || typeof data !== 'object') return
      const type = (data as { type?: string }).type
      if (type === `${SANDBOX_MESSAGE_NAMESPACE}resize`) {
        const height = Number((data as { height?: unknown }).height)
        if (Number.isFinite(height)) {
          const clamped = Math.max(120, Math.min(height, 4000))
          setSandboxHeight(clamped)
        }
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [mode])

  useEffect(() => {
    if (mode !== 'sandbox') {
      setSandboxHeight(null)
      setSandboxReloading(false)
      return
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'sandbox') return
    const root = contentRef.current
    if (!root) return

    const cleanups = [attachReveal(root), attachTilt(root)]

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [mode, renderedHtml, textContent, item?.id])

  const handleModeChange = useCallback(
    (next: ContentRenderMode) => {
      if (next === mode) return
      setMode(next)
      setRenderError(null)
      if (next !== 'sandbox') {
        setSandboxDoc(null)
        setSandboxHeight(null)
      } else {
        setSandboxKey((key) => key + 1)
        setSandboxReloading(true)
      }
    },
    [mode],
  )

  const handleZoomChange = useCallback((value: PreviewZoom) => {
    setZoom(value)
  }, [])

  const handleReload = useCallback(() => {
    if (mode !== 'sandbox') return
    setSandboxReloading(true)
    setSandboxHeight(null)
    setSandboxKey((key) => key + 1)
  }, [mode])

  const handleIframeLoad = useCallback(() => {
    if (mode === 'sandbox') {
      setSandboxReloading(false)
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: `${SANDBOX_MESSAGE_NAMESPACE}ping` },
          '*',
        )
      } catch {
        /* ignore cross-origin access */
      }
    }
  }, [mode])

  const errorMessage = textError ?? htmlError
  const isLoading = textLoading || htmlLoading

  const allowedForBar: ReadonlyArray<ContentRenderMode> = allowedModes.length ? allowedModes : (['plain'] as ReadonlyArray<ContentRenderMode>)
  const leadingControls = item?.file ? (
    <span className='ax-chip'>{safeText(item.file)}</span>
  ) : null

  const shouldUseIframe = mode === 'sandbox' || isHtml(format)
  const showSandboxFrame = mode === 'sandbox' && sandboxDoc
  const showMarkdownHtml = !shouldUseIframe && renderedHtml
  const showText = !shouldUseIframe && isText(format) && textContent

  if (!item) {
    return (
      <article className={classNames('ax-preview', 'is-empty')} aria-live='polite'>
        <div className='ax-preview__placeholder'>
          <div className='ax-skeleton ax-skeleton--text' style={{ width: '70%', height: 22 }} />
          <div
            className='ax-skeleton ax-skeleton--text'
            style={{ width: '40%', height: 16, marginTop: 8 }}
          />
          <div className='ax-skeleton ax-skeleton--block' style={{ height: 120, marginTop: 20 }} />
        </div>
        <p className='ax-muted'>Select a content item to preview its details.</p>
      </article>
    )
  }

  return (
    <article className='ax-preview' aria-live='polite'>
      <header className='ax-preview__header'>
        <div className='ax-preview__heading'>
          <h3 className='ax-preview__title'>{safeText(item.title)}</h3>
          <span className='ax-preview__date'>{formatDate(item.date)}</span>
        </div>
        <div className='ax-preview__chips'>
          <span className='ax-chip'>{safeText(item.category)}</span>
          {item.lang ? <span className='ax-chip'>{safeText(item.lang.toUpperCase())}</span> : null}
          {item.status ? <span className='ax-chip'>{safeText(item.status)}</span> : null}
        </div>
      </header>

      {item.summary ? <p className='ax-preview__summary'>{safeText(item.summary)}</p> : null}

      {item.tags?.length ? (
        <div className='ax-preview__tags' aria-label='Tags'>
          {item.tags.map((tag) => (
            <span key={tag} className='ax-chip'>
              {safeText(tag)}
            </span>
          ))}
        </div>
      ) : null}

      <PreviewBar
        mode={mode}
        allowedModes={allowedForBar}
        onModeChange={handleModeChange}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        externalHref={externalHref}
        disabled={isLoading}
        leadingControls={leadingControls}
        {...(onOpenExternal ? { onOpenExternal } : {})}
        {...(mode === 'sandbox' ? { onReload: handleReload, reloading: sandboxReloading } : {})}
      />

      <section className='ax-preview__body'>
        {errorMessage ? (
          <div className='ax-preview__error'>Preview unavailable: {safeText(errorMessage, '-')}</div>
        ) : null}
        {renderError ? (
          <div className='ax-preview__error'>Render error: {safeText(renderError, '-')}</div>
        ) : null}

        {isLoading || (mode === 'sandbox' && !showSandboxFrame) ? (
          <div className='ax-skeleton ax-skeleton--block' style={{ height: 220 }} />
        ) : null}

        {!isLoading && !errorMessage && !renderError ? (
          <div className='ax-preview__frame' data-zoom={zoom} style={zoomStyle}>
            {shouldUseIframe ? (
              mode === 'sandbox' ? (
                showSandboxFrame ? (
                  <iframe
                    key={`sandbox-${item.id}-${sandboxKey}`}
                    ref={iframeRef}
                    className='ax-preview__iframe'
                    sandbox='allow-scripts allow-same-origin'
                    srcDoc={sandboxDoc ?? ''}
                    style={sandboxHeight ? { height: sandboxHeight } : undefined}
                    onLoad={handleIframeLoad}
                  />
                ) : null
              ) : (
                externalHref && (
                  <iframe
                    key={`external-${item.id}`}
                    ref={iframeRef}
                    className='ax-preview__iframe'
                    src={externalHref}
                    title={`content:${item.id}`}
                    loading='lazy'
                    onLoad={handleIframeLoad}
                  />
                )
              )
            ) : (
              <div ref={contentRef} className='ax-preview__content'>
                {showMarkdownHtml ? (
                  <div className='ax-preview__rich' dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                ) : showText ? (
                  <pre className='ax-preview__text'>{textContent}</pre>
                ) : (
                  <p className='ax-preview__notice'>Preview not available for this format.</p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </article>
  )
}
