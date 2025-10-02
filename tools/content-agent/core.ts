import fs from 'node:fs'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import Ajv, { type ValidateFunction } from 'ajv'

import {
  AgentConfig,
  AgentPaths,
  AggregateBuildResult,
  CategoryKey,
  CategoryScanResult,
  ContentItem,
  ContentCategorySummary,
  ContentLoreSummary,
  DEFAULT_AGENT_CONFIG,
  DuplicateRecord,
  NormalizationChange,
  NormalizedItemResult,
  RootCategoryKey,
  RootManifest,
  ValidationIssue,
  ValidationReport,
} from './types'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ID_RE = /^(LOC|CHR|TEC|FAC|EVT|LORE|CNT)-[A-Z0-9-]+$/
const STATUS_SET = new Set(['draft', 'published', 'archived'])
const VISIBILITY_SET = new Set(['public', 'internal'])
const FORMAT_SET = new Set(['html', 'md', 'markdown', 'txt'])
const CONTENT_PREFIX = 'content/'
const DEFAULT_LORE_INDEX = 'content/lore/_index.json'

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

function transliterateChar(char: string): string | null {
  const lower = char.toLowerCase()
  const mapped = CYRILLIC_MAP[lower as keyof typeof CYRILLIC_MAP]
  return mapped ?? null
}

function slugify(input: string): string {
  if (!input) return 'item'
  const normalized = input.normalize('NFKD')
  let out = ''
  for (const char of normalized) {
    if (/[a-z0-9]/.test(char)) {
      out += char
      continue
    }
    if (/[0-9]/.test(char)) {
      out += char
      continue
    }
    const translit = transliterateChar(char)
    if (translit) {
      out += translit
      continue
    }
    if (char === ' ' || char === '_' || char === '-' || char === '.') {
      out += '-'
      continue
    }
  }
  const collapsed = out.replace(/-+/g, '-').replace(/^-|-$/g, '')
  return collapsed || 'item'
}

function extractNumericSuffix(id: string): string | null {
  const match = id.match(/-([0-9A-Z]{2,})$/)
  return match ? match[1] ?? null : null
}

function normalizeFilePath(file: string): string {
  let next = file.trim()
  next = next.replace(/\\/g, '/').replace(/^\.\//, '')
  while (next.startsWith('/')) next = next.slice(1)
  if (next.toLowerCase().startsWith(CONTENT_PREFIX)) next = next.slice(CONTENT_PREFIX.length)
  return next
}

function inferFormat(file: string): ContentItem['format'] | null {
  const lower = file.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html'
  if (lower.endsWith('.txt')) return 'txt'
  return null
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableValue(entry))
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      result[key] = stableValue((value as Record<string, unknown>)[key])
    }
    return result
  }
  return value
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

function mergeConfig(base: AgentConfig, override?: Partial<AgentConfig>): AgentConfig {
  if (!override) return { ...base, categories: [...base.categories], sanitize: { ...base.sanitize }, write: { ...base.write } }
  return {
    base: override.base ?? base.base,
    categories: override.categories ? Array.from(new Set(override.categories)) as CategoryKey[] : [...base.categories],
    sanitize: {
      addTags: override.sanitize?.addTags ? Array.from(new Set(override.sanitize.addTags)) : [...base.sanitize.addTags],
      addAttrs: override.sanitize?.addAttrs ? Array.from(new Set(override.sanitize.addAttrs)) : [...base.sanitize.addAttrs],
    },
    write: {
      syncCategory: override.write?.syncCategory ?? base.write.syncCategory,
      sort: override.write?.sort ?? base.write.sort,
    },
  }
}

function makeAgentPaths(rootDir: string, config: AgentConfig): AgentPaths {
  const baseDir = path.resolve(rootDir, config.base)
  const contentDir = path.join(baseDir, 'content')
  return {
    rootDir,
    baseDir,
    contentDir,
    schemaPath: path.join(contentDir, '_schema', 'content.schema.json'),
    rootManifestPath: path.join(contentDir, 'manifest.json'),
    logsDir: path.join(rootDir, 'logs'),
    reportsDir: path.join(rootDir, 'reports'),
    categoryManifestPath(category: CategoryKey) {
      return path.join(contentDir, category, 'manifest.json')
    },
  }
}

async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const raw = await fsp.readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return null
    throw new Error(`[agent] Unable to read ${filePath}: ${err.message}`)
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const dir = path.dirname(filePath)
  await fsp.mkdir(dir, { recursive: true })
  const payload = `${JSON.stringify(value, null, 2)}\n`
  await fsp.writeFile(filePath, payload, 'utf8')
}

function sortContentItems(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.date ?? ''
    const dateB = b.date ?? ''
    if (dateA !== dateB) return dateA < dateB ? 1 : -1
    const weightA = typeof a.weight === 'number' && Number.isFinite(a.weight) ? a.weight : Number.POSITIVE_INFINITY
    const weightB = typeof b.weight === 'number' && Number.isFinite(b.weight) ? b.weight : Number.POSITIVE_INFINITY
    if (weightA !== weightB) return weightA - weightB
    return a.id.localeCompare(b.id)
  })
}

function buildCategorySummary(
  items: ContentItem[],
  categories: CategoryKey[],
  existing?: Record<RootCategoryKey, ContentCategorySummary>
): Record<RootCategoryKey, ContentCategorySummary> {
  const summary: Record<RootCategoryKey, ContentCategorySummary> = Object.create(null)

  summary.all = {
    count: items.length,
    manifest: existing?.all?.manifest ?? 'content/manifest.json',
  }

  for (const category of categories) {
    const count = items.filter((entry) => entry.category === category).length
    summary[category] = {
      count,
      manifest: existing?.[category]?.manifest ?? `content/${category}/manifest.json`,
    }
  }

  const loreCount = items.filter((entry) => entry.category === 'lore').length
  summary.lore = {
    count: existing?.lore ? existing.lore.count ?? loreCount : loreCount,
    manifest: existing?.lore?.manifest ?? DEFAULT_LORE_INDEX,
  }

  return summary
}

function ensureLoreSummary(source?: ContentLoreSummary): ContentLoreSummary {
  if (!source) return { index: DEFAULT_LORE_INDEX, roots: [] }
  const index = typeof source.index === 'string' ? normalizeLorePath(source.index) : DEFAULT_LORE_INDEX
  const roots = Array.isArray(source.roots) ? source.roots : []
  return { index, roots }
}

function normalizeLorePath(input: string): string {
  let next = input.trim().replace(/\\/g, '/').replace(/^\.\//, '')
  while (next.startsWith('/')) next = next.slice(1)
  if (!next.startsWith('content/')) return `content/${next}`
  return next
}

function computeDiff(previous: ContentItem[], next: ContentItem[]) {
  const prevMap = new Map(previous.map((item) => [item.id, item]))
  const nextMap = new Map(next.map((item) => [item.id, item]))
  const added: string[] = []
  const removed: string[] = []
  const changed: string[] = []

  for (const [id, item] of nextMap.entries()) {
    const prev = prevMap.get(id)
    if (!prev) {
      added.push(id)
    } else if (stableStringify(prev) !== stableStringify(item)) {
      changed.push(id)
    }
  }

  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) removed.push(id)
  }

  return { added, removed, changed }
}

function arraysEqual(a: ContentItem[], b: ContentItem[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (stableStringify(a[i]) !== stableStringify(b[i])) return false
  }
  return true
}

async function ensureDir(target: string): Promise<void> {
  await fsp.mkdir(target, { recursive: true })
}

export async function loadAgentConfig(rootDir: string, overrides?: Partial<AgentConfig>): Promise<AgentConfig> {
  const baseConfig = DEFAULT_AGENT_CONFIG
  const configPath = path.join(rootDir, 'content.agent.json')
  let fileConfig: Partial<AgentConfig> | undefined
  try {
    const raw = await fsp.readFile(configPath, 'utf8')
    fileConfig = JSON.parse(raw) as Partial<AgentConfig>
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code && err.code !== 'ENOENT') {
      throw new Error(`[agent] Failed to read content.agent.json: ${err.message}`)
    }
  }
  const merged = mergeConfig(baseConfig, fileConfig)
  return mergeConfig(merged, overrides)
}

export function resolveAgentPaths(rootDir: string, config: AgentConfig): AgentPaths {
  return makeAgentPaths(rootDir, config)
}

type RootPayload = {
  items: ContentItem[]
  meta: Record<string, unknown>
  categories?: Record<RootCategoryKey, ContentCategorySummary>
  lore?: ContentLoreSummary
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

async function readRootPayload(rootManifestPath: string): Promise<RootPayload> {
  const raw = await readJsonFile<unknown>(rootManifestPath)
  if (!raw) {
    return { items: [], meta: { version: 2 } }
  }
  if (Array.isArray(raw)) {
    return { items: raw as ContentItem[], meta: { version: 1 } }
  }
  if (isRecord(raw)) {
    const obj = raw
    const items = Array.isArray(obj.items) ? (obj.items as ContentItem[]) : []
    const meta = isRecord(obj.meta) ? (obj.meta as Record<string, unknown>) : {}
    const categories = isRecord(obj.categories)
      ? (obj.categories as Record<RootCategoryKey, ContentCategorySummary>)
      : undefined
    const lore = isRecord(obj.lore) ? (obj.lore as ContentLoreSummary) : undefined
    return { items, meta, categories, lore }
  }
  throw new Error('[agent] content/manifest.json has unknown shape')
}

function buildMeta(source: Record<string, unknown>): RootManifest['meta'] {
  const meta: RootManifest['meta'] = { version: 2 }
  if (typeof source.generatedAt === 'string') meta.generatedAt = source.generatedAt
  if (typeof source.source === 'string') meta.source = source.source
  for (const [key, value] of Object.entries(source)) {
    if (key === 'version' || key === 'generatedAt' || key === 'source') continue
    meta[key] = value
  }
  return meta
}

export interface FixCommandResult {
  aggregate: AggregateBuildResult
  categoryWrites: Array<{ key: CategoryKey; manifestPath: string; changed: boolean }>
}

export interface DiffReport {
  aggregate: AggregateBuildResult
  categoryChanges: Array<{ key: RootCategoryKey; previous: number; next: number }>
}

export interface CheckLinksReport {
  missing: Array<{ id: string; file: string }>
}

export class ContentAgent {
  readonly config: AgentConfig
  readonly paths: AgentPaths
  private readonly ajv: Ajv
  private validator: ValidateFunction | null = null

  constructor(rootDir: string, config: AgentConfig) {
    this.config = config
    this.paths = makeAgentPaths(rootDir, config)
    this.ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true })
  }

  static async create(rootDir: string, overrides?: Partial<AgentConfig>): Promise<ContentAgent> {
    const config = await loadAgentConfig(rootDir, overrides)
    return new ContentAgent(rootDir, config)
  }

  async scanCategories(): Promise<CategoryScanResult[]> {
    const results: CategoryScanResult[] = []
    for (const key of this.config.categories) {
      const manifestPath = this.paths.categoryManifestPath(key)
      const raw = await readJsonFile<unknown>(manifestPath)
      if (raw == null) {
        results.push({ key, manifestPath, items: [], normalized: [], missingFiles: [], errors: [`Missing manifest: ${manifestPath}`] })
        continue
      }
      if (!Array.isArray(raw)) {
        results.push({ key, manifestPath, items: [], normalized: [], missingFiles: [], errors: ['Manifest is not an array'] })
        continue
      }
      const normalized: NormalizedItemResult[] = []
      const missingFiles: string[] = []
      const errors: string[] = []
      for (const entry of raw) {
        if (!isRecord(entry)) {
          errors.push('Encountered non-object content entry')
          continue
        }
        const result = this.normalizeItem(entry as ContentItem, key)
        normalized.push(result)
        const filePath = path.join(this.paths.contentDir, result.item.file)
        if (!fs.existsSync(filePath)) {
          missingFiles.push(result.item.file)
        }
      }
      results.push({ key, manifestPath, items: raw as ContentItem[], normalized, missingFiles: Array.from(new Set(missingFiles)), errors })
    }
    return results
  }

  private normalizeItem(raw: ContentItem, defaultCategory: RootCategoryKey): NormalizedItemResult {
    const item: ContentItem = { ...raw }
    const changes: NormalizationChange[] = []
    const warnings: string[] = []

    const category = (item.category as RootCategoryKey) ?? defaultCategory
    if (item.category !== category) {
      changes.push({ field: 'category', from: item.category, to: category, reason: 'Adjusted to manifest category' })
      item.category = category
    }

    if (typeof item.file === 'string') {
      const normalizedFile = normalizeFilePath(item.file)
      if (normalizedFile !== item.file) {
        changes.push({ field: 'file', from: item.file, to: normalizedFile, reason: 'Normalized path' })
        item.file = normalizedFile
      }
    } else {
      warnings.push('Missing or invalid file path')
      item.file = '' as any
    }

    const inferred = item.file ? inferFormat(item.file) : null
    if (inferred && item.format !== inferred) {
      changes.push({ field: 'format', from: item.format, to: inferred, reason: 'Derived from file extension' })
      item.format = inferred
    }

    if (!FORMAT_SET.has(item.format)) {
      warnings.push(`Unexpected format: ${item.format}`)
    }

    if (item.lang) {
      const normalizedLang = item.lang.toLowerCase()
      if (normalizedLang !== item.lang) {
        changes.push({ field: 'lang', from: item.lang, to: normalizedLang, reason: 'Language forced to lower-case' })
        item.lang = normalizedLang
      }
    }

    const canonicalSlug = slugify(item.slug ?? item.title ?? '')
    if (canonicalSlug && canonicalSlug !== item.slug) {
      changes.push({ field: 'slug', from: item.slug, to: canonicalSlug, reason: 'Slug sanitized' })
      item.slug = canonicalSlug
    }

    const suffix = extractNumericSuffix(item.id)
    if (suffix && suffix !== item.numericSuffix) {
      changes.push({ field: 'numericSuffix', from: item.numericSuffix, to: suffix, reason: 'Derived from id' })
      item.numericSuffix = suffix
    }

    if (item.status && !STATUS_SET.has(item.status)) {
      warnings.push(`Unsupported status value: ${item.status}`)
    }

    if (item.visibility && !VISIBILITY_SET.has(item.visibility)) {
      warnings.push(`Unsupported visibility value: ${item.visibility}`)
    }

    if (typeof item.weight !== 'number' || Number.isNaN(item.weight)) {
      if (item.weight != null) {
        changes.push({ field: 'weight', from: item.weight, to: undefined, reason: 'Removed invalid weight' })
      }
      delete item.weight
    }

    return { item, changes, warnings }
  }

  private async ensureValidator(): Promise<ValidateFunction> {
    if (this.validator) return this.validator
    const schema = await readJsonFile<unknown>(this.paths.schemaPath)
    if (!schema || typeof schema !== 'object') {
      throw new Error(`[agent] Schema not found at ${this.paths.schemaPath}`)
    }
    this.validator = this.ajv.compile(schema)
    return this.validator
  }

  async buildAggregate(): Promise<{ aggregate: AggregateBuildResult; scans: CategoryScanResult[] }> {
    const scans = await this.scanCategories()
    const aggregate = await this.buildAggregateFromScans(scans)
    return { aggregate, scans }
  }

  private async buildAggregateFromScans(scans: CategoryScanResult[]): Promise<AggregateBuildResult> {
    const root = await readRootPayload(this.paths.rootManifestPath)
    const meta = buildMeta(root.meta)
    const pool = new Map<string, { item: ContentItem; sources: string[] }>()

    const accept = (entry: NormalizedItemResult | ContentItem, source: string) => {
      const payload = 'item' in entry ? entry.item : entry
      const item = { ...payload }
      const record = pool.get(item.id)
      if (record) {
        record.sources.push(source)
        record.item = item
      } else {
        pool.set(item.id, { item, sources: [source] })
      }
    }

    for (const raw of root.items) {
      const normalized = this.normalizeItem(raw, (raw.category as RootCategoryKey) ?? 'all')
      accept(normalized, 'root')
    }

    for (const scan of scans) {
      for (const normalized of scan.normalized) {
        accept(normalized, `category:${scan.key}`)
      }
    }

    const deduped = Array.from(pool.values()).map((entry) => entry.item)
    const sorted = sortContentItems(deduped)
    const summary = buildCategorySummary(sorted, this.config.categories, root.categories)

    meta.version = 2
    meta.generatedAt = new Date().toISOString()
    meta.source = 'content-agent-v2.1'

    const manifest: RootManifest = {
      meta,
      items: sorted,
      categories: summary,
      lore: ensureLoreSummary(root.lore),
    }

    const diff = computeDiff(root.items, sorted)
    const duplicates: DuplicateRecord[] = []
    for (const [id, entry] of pool.entries()) {
      if (entry.sources.length > 1) {
        duplicates.push({ id, sources: entry.sources })
      }
    }

    return {
      manifest,
      duplicates,
      added: diff.added,
      removed: diff.removed,
      updated: diff.changed,
      categorySummaries: summary,
    }
  }

  async writeRootManifest(manifest: RootManifest): Promise<void> {
    await writeJsonFile(this.paths.rootManifestPath, manifest)
  }

  async writeCategoryManifest(category: CategoryKey, items: ContentItem[]): Promise<void> {
    const filePath = this.paths.categoryManifestPath(category)
    const dir = path.dirname(filePath)
    await ensureDir(dir)
    await writeJsonFile(filePath, items)
  }

  async validate(): Promise<ValidationReport> {
    const { aggregate } = await this.buildAggregate()
    const validator = await this.ensureValidator()
    const issues: ValidationIssue[] = []
    const seenIds = new Set<string>()

    if (!validator(aggregate.manifest.items)) {
      for (const err of validator.errors ?? []) {
        issues.push({
          level: 'error',
          message: `Schema: ${err.instancePath || '/'} ${err.message ?? ''}`.trim(),
        })
      }
    }

    for (const item of aggregate.manifest.items) {
      if (seenIds.has(item.id)) {
        issues.push({ level: 'error', message: `Duplicate id detected: ${item.id}`, itemId: item.id })
      } else {
        seenIds.add(item.id)
      }

      if (!ID_RE.test(item.id)) {
        issues.push({ level: 'error', message: `Invalid id format: ${item.id}`, itemId: item.id })
      }

      if (!ISO_DATE_RE.test(item.date)) {
        issues.push({ level: 'error', message: `Invalid date format: ${item.date}`, itemId: item.id })
      }

      if (!STATUS_SET.has(item.status)) {
        issues.push({ level: 'error', message: `Unsupported status: ${item.status}`, itemId: item.id })
      }

      if (item.visibility && !VISIBILITY_SET.has(item.visibility)) {
        issues.push({ level: 'warning', message: `Visibility outside whitelist: ${item.visibility}`, itemId: item.id })
      }

      if (!FORMAT_SET.has(item.format)) {
        issues.push({ level: 'warning', message: `Format outside whitelist: ${item.format}`, itemId: item.id })
      }

      const filePath = path.join(this.paths.contentDir, item.file)
      if (!fs.existsSync(filePath)) {
        issues.push({ level: 'error', message: `Content file missing: ${item.file}`, itemId: item.id, file: filePath })
      }

      if (!this.config.categories.includes(item.category as CategoryKey) && item.category !== 'all' && item.category !== 'lore') {
        issues.push({ level: 'warning', message: `Item in unexpected category: ${item.category}`, itemId: item.id })
      }
    }

    for (const duplicate of aggregate.duplicates) {
      issues.push({
        level: 'error',
        message: `Duplicate id across sources: ${duplicate.id} (${duplicate.sources.join(', ')})`,
        itemId: duplicate.id,
      })
    }

    return { issues, hasErrors: issues.some((issue) => issue.level === 'error'), seenIds }
  }

  async diff(): Promise<DiffReport> {
    const { aggregate } = await this.buildAggregate()
    const current = await readRootPayload(this.paths.rootManifestPath)
    const currentSummary = buildCategorySummary(current.items, this.config.categories, current.categories)
    const changes: Array<{ key: RootCategoryKey; previous: number; next: number }> = []
    for (const key of Object.keys(aggregate.categorySummaries) as RootCategoryKey[]) {
      const previous = currentSummary[key]?.count ?? 0
      const next = aggregate.categorySummaries[key]?.count ?? 0
      if (previous !== next) {
        changes.push({ key, previous, next })
      }
    }
    return { aggregate, categoryChanges: changes }
  }

  async fix(options?: { syncCategory?: boolean }): Promise<FixCommandResult> {
    const scans = await this.scanCategories()
    const syncCategory = options?.syncCategory ?? this.config.write.syncCategory
    const categoryWrites: Array<{ key: CategoryKey; manifestPath: string; changed: boolean }> = []

    if (syncCategory) {
      for (const scan of scans) {
        const normalizedItems = scan.normalized.map((entry) => entry.item)
        const changed = !arraysEqual(scan.items, normalizedItems)
        if (changed) {
          const payload = this.config.write.sort ? sortContentItems(normalizedItems) : normalizedItems
          await this.writeCategoryManifest(scan.key, payload)
        }
        categoryWrites.push({ key: scan.key, manifestPath: scan.manifestPath, changed })
      }
    } else {
      for (const scan of scans) {
        categoryWrites.push({ key: scan.key, manifestPath: scan.manifestPath, changed: false })
      }
    }

    const aggregate = await this.buildAggregateFromScans(scans)
    await this.writeRootManifest(aggregate.manifest)

    return { aggregate, categoryWrites }
  }

  async checkLinks(): Promise<CheckLinksReport> {
    const { aggregate } = await this.buildAggregate()
    const missing: Array<{ id: string; file: string }> = []
    for (const item of aggregate.manifest.items) {
      const filePath = path.join(this.paths.contentDir, item.file)
      if (!fs.existsSync(filePath)) {
        missing.push({ id: item.id, file: item.file })
      }
    }
    return { missing }
  }
}
