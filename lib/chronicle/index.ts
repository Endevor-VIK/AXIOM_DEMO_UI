import type { ContentItem, ContentStatus } from '@/lib/vfs'

export type ChronicleChapterStatus = 'draft' | 'in-progress' | 'published' | 'locked'

export interface ChronicleChapter {
  id: string
  slug: string
  chapterCode: string
  title: string
  status: ChronicleChapterStatus
  hook: string
  summary: string
  keyEvents: string[]
  mainCharacters: string[]
  locations: string[]
  tone: string
  styleProfile: string
  targetRoute: string
  cover?: string
  canonRefs: string[]
  siteLinks: string[]
}

export interface ChronicleManifest {
  meta: {
    version: number
    generatedAt?: string
    source?: string
  }
  chapters: ChronicleChapter[]
}

export class ChronicleError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    if (cause !== undefined) {
      ;(this as { cause?: unknown }).cause = cause
    }
  }
}

const cache = new Map<string, ChronicleManifest>()

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => asString(entry).trim()).filter(Boolean)
}

function normalizeStatus(value: unknown): ChronicleChapterStatus {
  const raw = asString(value).trim().toLowerCase()
  if (raw === 'in-progress') return 'in-progress'
  if (raw === 'published') return 'published'
  if (raw === 'locked') return 'locked'
  return 'draft'
}

function normalizeSlug(value: unknown, fallback: string): string {
  const candidate = asString(value).trim().toLowerCase()
  if (candidate) return candidate
  return fallback
}

function normalizeRoute(slug: string, value: unknown): string {
  const candidate = asString(value).trim()
  if (candidate.startsWith('/dashboard/chronicle/')) {
    return candidate
  }
  return `/dashboard/chronicle/${slug}`
}

function normalizeChapter(raw: unknown, index: number): ChronicleChapter {
  const source = asRecord(raw)
  if (!source) {
    throw new ChronicleError(`[chronicle] chapter #${index} has invalid shape`)
  }

  const fallbackSlug = `chapter-${String(index + 1).padStart(2, '0')}`
  const slug = normalizeSlug(source.slug, fallbackSlug)
  const chapter: ChronicleChapter = {
    id: asString(source.id, `CHRONICLE-${index + 1}`),
    slug,
    chapterCode: asString(source.chapterCode, `CHAPTER_${String(index + 1).padStart(2, '0')}`),
    title: asString(source.title, `Chapter ${index + 1}`),
    status: normalizeStatus(source.status),
    hook: asString(source.hook, 'Draft chapter hook is pending.'),
    summary: asString(source.summary, ''),
    keyEvents: asStringArray(source.keyEvents),
    mainCharacters: asStringArray(source.mainCharacters),
    locations: asStringArray(source.locations),
    tone: asString(source.tone, 'cold-tense'),
    styleProfile: asString(source.styleProfile, 'chronicle_default'),
    targetRoute: normalizeRoute(slug, source.targetRoute),
    canonRefs: asStringArray(source.canonRefs),
    siteLinks: asStringArray(source.siteLinks),
  }

  const cover = asString(source.cover).trim()
  if (cover) {
    chapter.cover = cover
  }

  return chapter
}

function mapStatusToContent(status: ChronicleChapterStatus): ContentStatus {
  if (status === 'published') return 'published'
  if (status === 'locked') return 'archived'
  return 'draft'
}

export function chapterToOrbitItem(chapter: ChronicleChapter): ContentItem {
  return {
    id: chapter.id,
    category: 'lore',
    title: chapter.title,
    summary: chapter.hook,
    date: '2026-02-19',
    file: chapter.canonRefs[0] ?? `chronicle/${chapter.slug}.md`,
    format: 'md',
    status: mapStatusToContent(chapter.status),
    author: 'AXIOM CHRONICLE',
    lang: 'ru',
    tags: [chapter.chapterCode, chapter.tone, ...chapter.mainCharacters.slice(0, 2)],
    cover: chapter.cover,
    meta: {
      v: 1,
      chapterCode: chapter.chapterCode,
      styleProfile: chapter.styleProfile,
    },
  }
}

export async function readChronicleManifest(options?: {
  base?: string
  force?: boolean
}): Promise<ChronicleManifest> {
  const base = ensureTrailingSlash(options?.base ?? ((import.meta as any)?.env?.VITE_DATA_BASE as string) ?? 'data/')
  const cacheKey = `${base}chronicle/manifest.json`

  if (!options?.force && cache.has(cacheKey)) {
    return cache.get(cacheKey) as ChronicleManifest
  }

  const url = `${base}chronicle/manifest.json`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new ChronicleError(`[chronicle] HTTP ${response.status} for ${url}`)
  }

  const payload = (await response.json()) as unknown
  const root = asRecord(payload)
  if (!root) {
    throw new ChronicleError('[chronicle] manifest root is not an object')
  }

  const metaSource = asRecord(root.meta)
  const meta: ChronicleManifest['meta'] = {
    version: typeof metaSource?.version === 'number' ? metaSource.version : 1,
  }
  const generatedAt = asString(metaSource?.generatedAt).trim()
  if (generatedAt) meta.generatedAt = generatedAt
  const source = asString(metaSource?.source).trim()
  if (source) meta.source = source

  const rawChapters = Array.isArray(root.chapters) ? root.chapters : []
  const chapters = rawChapters.map((entry, index) => normalizeChapter(entry, index))

  const manifest: ChronicleManifest = { meta, chapters }
  cache.set(cacheKey, manifest)
  return manifest
}

export function clearChronicleCache() {
  cache.clear()
}
