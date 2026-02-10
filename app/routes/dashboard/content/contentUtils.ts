import type { ContentItem } from '@/lib/vfs'
import { pickContentImage } from '@/lib/content/pickContentImage'
import type { ContentPreviewData } from '@/src/features/content/types'

export function mapToPreview(entry: ContentItem | null): ContentPreviewData | null {
  if (!entry) return null
  const meta = (entry.meta as Record<string, unknown>) || {}
  const rawVersion = entry.version || (meta.fileVersion as string | undefined) || 'v1.0'
  const rawZone = (meta.zone as string | undefined) || entry.category
  const rawStatus = (meta.fileStatus as string | undefined) || entry.status
  const rawClass = entry.subCategory || entry.category
  const normalizeLabel = (value: string, fallback: string) => {
    const base = value?.trim?.() ? value : fallback
    return String(base).replace(/[_-]+/g, ' ').toUpperCase()
  }
  const version = rawVersion
  const zone = normalizeLabel(rawZone, entry.category.toUpperCase())
  const statusLabel = normalizeLabel(rawStatus, entry.status)
  const classLabel = normalizeLabel(rawClass, entry.category)
  const summary = entry.summary || ''
  const markers =
    (entry.tags && entry.tags.length
      ? entry.tags.slice(0, 3)
      : summary
          .split('.')
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 3)) || []

  return {
    id: entry.id,
    slug: (entry as any).slug || entry.id.toLowerCase(),
    title: entry.title,
    zone,
    category: entry.category,
    status: entry.status,
    lang: entry.lang || 'ru',
    version,
    tags: entry.tags || [],
    preview: {
      kicker: `STATUS: ${statusLabel} · CLASS: ${classLabel}`,
      logline: summary || entry.title,
      markers: markers.length ? markers : ['Content preview'],
      signature: [
        `Author: ${entry.author || 'AXIOM'}`,
        `Version: ${version}`,
        `Status: ${statusLabel}`,
      ],
      image: pickContentImage(entry),
    },
  }
}
