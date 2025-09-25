// AXIOM_DEMO_UI :: WEB CORE
// Canvas: C09 :: lib/vfs/index.ts
// Purpose: Read-only VFS layer for static data snapshots under /data.

import Ajv from 'ajv'
import type { ValidateFunction } from 'ajv'

export type Json = unknown

export type FetchOptions = {
  /** bypass cache if true */ force?: boolean
  /** expected content-type startsWith check */ expect?: 'json' | 'text' | 'html'
}

export interface VfsConfig {
  /** base URL relative to app root, defaults to 'data/' */ base?: string
}

export interface ManifestItem {
  title?: string
  date?: string // ISO-like
  file?: string // relative path under data/
  tags?: string[]
  [k: string]: unknown
}

export const contentCategories = [
  'locations',
  'characters',
  'technologies',
  'factions',
  'events',
  'lore',
] as const

export type ContentCategory = (typeof contentCategories)[number]
export type ContentStatus = 'draft' | 'published' | 'archived'
export type ContentVisibility = 'public' | 'internal'
export type ContentFormat = 'html' | 'md' | 'markdown' | 'txt'

export interface ContentLink {
  type: string
  ref: string
  label?: string
  href?: string
}

export interface ContentMeta {
  v: number
  [key: string]: unknown
}

export interface ContentItem extends ManifestItem {
  id: string
  category: ContentCategory | 'all'
  subCategory?: string
  title: string
  summary?: string
  date: string
  file: string
  format: ContentFormat
  author?: string
  status: ContentStatus
  visibility?: ContentVisibility
  weight?: number
  lang?: string
  links?: ContentLink[]
  meta: ContentMeta
}

export interface ContentCategorySummary {
  count: number
  manifest: string
}

export interface LoreIndexNode {
  id: string
  title: string
  order?: number
  summary?: string
  path?: string
  file?: string
  children?: LoreIndexNode[]
}

export interface ContentLoreSummary {
  index: string
  roots: LoreIndexNode[]
}

export interface ContentAggregate {
  meta: {
    version: number
    generatedAt?: string
    source?: string
  }
  items: ContentItem[]
  categories: Record<'all' | ContentCategory, ContentCategorySummary>
  lore: ContentLoreSummary
}

export type NewsKind = 'update' | 'release' | 'roadmap' | 'heads-up'

export interface NewsItem {
  id: string
  date: string // YYYY-MM-DD
  title: string
  kind: NewsKind
  tags?: string[]
  summary?: string
  link?: string
  file?: string
}

export interface VfsApi {
  json<T = Json>(relPath: string, opts?: FetchOptions): Promise<T>
  text(relPath: string, opts?: FetchOptions): Promise<string>
  readIndex(opts?: FetchOptions): Promise<Record<string, unknown>>
  readObjects(opts?: FetchOptions): Promise<Record<string, unknown>>
  readLogs(opts?: FetchOptions): Promise<Record<string, unknown>>
  readAuditsManifest(opts?: FetchOptions): Promise<ManifestItem[]>
  readContentManifest(opts?: FetchOptions): Promise<ContentItem[]>
  readContentAggregate(opts?: FetchOptions): Promise<ContentAggregate>
  readLoreIndex(relPath?: string, opts?: FetchOptions): Promise<LoreIndexNode>
  readNewsManifest(opts?: FetchOptions): Promise<NewsItem[]>
  fetchRaw(relPath: string, init?: RequestInit): Promise<Response>
  clearCache(): void
}

const cache = new Map<string, unknown>()

export class VfsError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    if (cause !== undefined) (this as any).cause = cause
  }
}

function ensureTrailingSlash(s: string): string {
  return s.endsWith('/') ? s : s + '/'
}
function stripLeadingSlash(s: string): string {
  return s.startsWith('/') ? s.slice(1) : s
}
function disallowTraversal(rel: string): void {
  const backslash = String.fromCharCode(92)
  if (rel.includes('..') || rel.startsWith('/') || rel.startsWith(backslash)) {
    throw new VfsError('[VFS] Illegal relative path: ' + rel)
  }
}

function makeBase(config?: VfsConfig): string {
  const envBase = (import.meta as any)?.env?.VITE_DATA_BASE as string | undefined
  const base = config?.base ?? envBase ?? 'data/'
  return ensureTrailingSlash(stripLeadingSlash(base))
}

function joinBase(base: string, rel: string): string {
  disallowTraversal(rel)
  return base + rel
}

async function fetchExpect(
  url: string,
  kind: NonNullable<FetchOptions['expect']>,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(url, { cache: 'no-store', ...init })
  if (!res.ok) throw new VfsError('[VFS] HTTP ' + res.status + ' for ' + url)
  const ct = res.headers.get('content-type') || ''
  if (kind === 'json' && !ct.startsWith('application/json')) {
    if (ct && !ct.includes('json')) throw new VfsError('[VFS] Unexpected content-type ' + ct + ' for ' + url)
  }
  if (kind === 'html' && !ct.includes('html') && !ct.includes('text/')) {
    throw new VfsError('[VFS] Unexpected content-type ' + ct + ' for ' + url)
  }
  return res
}

function key(base: string, rel: string) {
  return 'vfs:' + base + rel
}

const ajvInstance = new Ajv({ allErrors: true, strict: false })
const CONTENT_SCHEMA_PATH = 'content/_schema/content.schema.json'
const CONTENT_MANIFEST_PATH = 'content/manifest.json'
const DEFAULT_LORE_INDEX_REL = 'lore/_index.json'
const DEFAULT_LORE_INDEX_PATH = 'content/' + DEFAULT_LORE_INDEX_REL
const CATEGORY_MANIFEST_DEFAULTS: Record<ContentCategory, string> = {
  locations: 'content/locations/manifest.json',
  characters: 'content/characters/manifest.json',
  technologies: 'content/technologies/manifest.json',
  factions: 'content/factions/manifest.json',
  events: 'content/events/manifest.json',
  lore: DEFAULT_LORE_INDEX_PATH,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeManifestPath(value: string): string {
  const trimmed = value.trim().replace(/^\.\/?/, '')
  if (!trimmed) return ''
  return trimmed.startsWith('content/') ? trimmed : 'content/' + trimmed
}

function normalizeLoreSummaryPath(value: string): string {
  const trimmed = value.trim().replace(/^\.\/?/, '')
  const normalized = trimmed.startsWith('content/') ? trimmed : 'content/' + trimmed
  return normalized.startsWith('content/lore/') ? normalized : DEFAULT_LORE_INDEX_PATH
}

function normalizeLoreRequestPath(input?: string): string {
  const raw = (input ?? '').trim().replace(/^content\//, '').replace(/^\.\/?/, '')
  if (!raw) return DEFAULT_LORE_INDEX_REL
  if (!raw.startsWith('lore/')) {
    throw new VfsError('[VFS] Lore index path must stay under lore/: ' + input)
  }
  disallowTraversal(raw)
  return raw
}

function sortContentItems(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.date || ''
    const dateB = b.date || ''
    if (dateA < dateB) return 1
    if (dateA > dateB) return -1
    const weightA = typeof a.weight === 'number' ? a.weight : Number.POSITIVE_INFINITY
    const weightB = typeof b.weight === 'number' ? b.weight : Number.POSITIVE_INFINITY
    if (weightA !== weightB) return weightA - weightB
    return a.id.localeCompare(b.id)
  })
}

export function createVfs(config?: VfsConfig): VfsApi {
  const base = makeBase(config)
  let contentValidator: ValidateFunction | null = null

  async function json<T = Json>(relPath: string, opts?: FetchOptions): Promise<T> {
    const k = key(base, relPath)
    if (!opts?.force && cache.has(k)) return cache.get(k) as T
    const url = joinBase(base, relPath)
    const res = await fetchExpect(url, opts?.expect ?? 'json')
    const data = (await res.json()) as T
    cache.set(k, data)
    return data
  }

  async function text(relPath: string, opts?: FetchOptions): Promise<string> {
    const k = key(base, relPath)
    if (!opts?.force && cache.has(k)) return cache.get(k) as string
    const url = joinBase(base, relPath)
    const res = await fetchExpect(url, opts?.expect ?? 'text')
    const data = await res.text()
    cache.set(k, data)
    return data
  }

  async function fetchRaw(relPath: string, init?: RequestInit): Promise<Response> {
    const url = joinBase(base, relPath)
    return fetch(url, { cache: 'no-store', ...init })
  }

  const readIndex = (opts?: FetchOptions) => json<Record<string, unknown>>('index.json', opts)
  const readObjects = (opts?: FetchOptions) => json<Record<string, unknown>>('objects.json', opts)
  const readLogs = (opts?: FetchOptions) => json<Record<string, unknown>>('logs.json', opts)
  const readAuditsManifest = (opts?: FetchOptions) => json<ManifestItem[]>('audits/manifest.json', opts)

  async function ensureContentValidator(): Promise<ValidateFunction> {
    if (contentValidator) return contentValidator
    const schema = await json<Json>(CONTENT_SCHEMA_PATH, { force: true })
    if (!isRecord(schema) && !Array.isArray(schema)) {
      throw new VfsError('[VFS] content schema has unexpected shape')
    }
    contentValidator = ajvInstance.compile(schema as Record<string, unknown>)
    return contentValidator
  }

  async function validateContentItems(data: unknown): Promise<ContentItem[]> {
    const validator = await ensureContentValidator()
    if (!validator(data)) {
      const detail = ajvInstance.errorsText(validator.errors ?? [], { separator: '; ' })
      throw new VfsError('[VFS] content manifest invalid: ' + detail)
    }
    return data as ContentItem[]
  }

  async function readContentAggregate(opts?: FetchOptions): Promise<ContentAggregate> {
    const cacheKey = key(base, CONTENT_MANIFEST_PATH + '#aggregate')
    if (!opts?.force && cache.has(cacheKey)) return cache.get(cacheKey) as ContentAggregate

    const raw = await json<unknown>(CONTENT_MANIFEST_PATH, opts)
    let aggregate: ContentAggregate

    if (Array.isArray(raw)) {
      const items = sortContentItems(await validateContentItems(raw))
      aggregate = {
        meta: { version: 1, source: 'legacy' },
        items,
        categories: buildCategorySummary(items),
        lore: { index: DEFAULT_LORE_INDEX_PATH, roots: [] },
      }
        } else if (isRecord(raw)) {
      const meta = extractAggregateMeta(raw.meta)
      const rootItems = await validateContentItems(raw.items ?? [])
      let pool: ContentItem[] = [...rootItems]
      if (meta.version >= 2) {
        const manifests = collectCategoryManifests(raw.categories)
        for (const entry of manifests) {
          try {
            const data = await json<unknown>(entry.manifest, opts)
            const categoryItems = await validateContentItems(data)
            pool = pool.concat(categoryItems)
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error)
            throw new VfsError(`[VFS] unable to read ${entry.manifest}: ${reason}`)
          }
        }
      }
      const items = sortContentItems(dedupeContentItems(pool))
      aggregate = {
        meta,
        items,
        categories: mergeCategorySummaries(raw.categories, items),
        lore: extractLoreSummary(raw.lore),
      }
    } else {
      throw new VfsError('[VFS] content/manifest.json has unexpected shape')
    }

    cache.set(cacheKey, aggregate)
    return aggregate
  }

  async function readLoreIndex(relPath?: string, opts?: FetchOptions): Promise<LoreIndexNode> {
    const normalized = normalizeLoreRequestPath(relPath)
    return json<LoreIndexNode>('content/' + normalized, opts)
  }

  const readContentManifest = async (opts?: FetchOptions) => {
    const aggregate = await readContentAggregate(opts)
    return aggregate.items
  }

  const readNewsManifest = async (opts?: FetchOptions) => {
    const items = await json<unknown>('news/manifest.json', opts)
    return validateNewsArray(items)
  }

  function clearCache() {
    cache.clear()
    contentValidator = null
  }

  return {
    json,
    text,
    readIndex,
    readObjects,
    readLogs,
    readAuditsManifest,
    readContentManifest,
    readContentAggregate,
    readLoreIndex,
    readNewsManifest,
    fetchRaw,
    clearCache,
  }
}

function isString(x: unknown): x is string {
  return typeof x === 'string'
}
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(isString)
}

function validateNewsArray(data: unknown): NewsItem[] {
  if (!Array.isArray(data)) throw new VfsError('[VFS] news/manifest.json is not an array')
  const out: NewsItem[] = []
  for (const it of data) {
    if (typeof it !== 'object' || it == null) throw new VfsError('[VFS] news item is not an object')
    const obj = it as Record<string, unknown>
    const id = obj.id
    const date = obj.date
    const title = obj.title
    const kind = obj.kind
    const tags = obj.tags
    const summary = obj.summary
    const link = obj.link
    const file = obj.file
    if (!isString(id) || !isString(date) || !isString(title) || !isString(kind)) {
      throw new VfsError('[VFS] invalid news item')
    }
    const item: NewsItem = {
      id,
      date,
      title,
      kind: kind as NewsKind,
    }
    if (isStringArray(tags)) item.tags = tags as string[]
    if (isString(summary)) item.summary = summary as string
    if (isString(link)) item.link = link as string
    if (isString(file)) item.file = file as string
    out.push(item)
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return out
}

export const vfs = createVfs()












