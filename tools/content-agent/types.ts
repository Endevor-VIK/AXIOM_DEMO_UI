export type CategoryKey =
  | 'locations'
  | 'characters'
  | 'technologies'
  | 'factions'
  | 'events'

type LoreCategoryKey = 'lore'

export type RootCategoryKey = 'all' | CategoryKey | LoreCategoryKey

export type ContentStatus = 'draft' | 'published' | 'archived'
export type ContentFormat = 'html' | 'md' | 'markdown' | 'txt'
export type ContentRenderMode = 'plain' | 'hybrid' | 'sandbox'
export type ContentVisibility = 'public' | 'internal'

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

export interface ContentItem {
  id: string
  category: RootCategoryKey
  subCategory?: string
  title: string
  summary?: string
  date: string
  tags?: string[]
  file: string
  format: ContentFormat
  renderMode?: ContentRenderMode
  assetsBase?: string
  version?: string
  author?: string
  status: ContentStatus
  visibility?: ContentVisibility
  weight?: number
  lang?: string
  slug?: string
  numericSuffix?: string
  links?: ContentLink[]
  cover?: string
  meta: ContentMeta
  [key: string]: unknown
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

export interface RootManifest {
  meta: {
    version: number
    generatedAt?: string
    source?: string
    [key: string]: unknown
  }
  items: ContentItem[]
  categories: Record<RootCategoryKey, ContentCategorySummary>
  lore?: ContentLoreSummary
  [key: string]: unknown
}

export interface AgentSanitizeConfig {
  addTags: string[]
  addAttrs: string[]
}

export interface AgentWriteConfig {
  syncCategory: boolean
  sort: boolean
}

export interface AgentConfig {
  base: string
  categories: CategoryKey[]
  sanitize: AgentSanitizeConfig
  write: AgentWriteConfig
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  base: 'public/data/',
  categories: ['locations', 'characters', 'technologies', 'factions', 'events'],
  sanitize: {
    addTags: ['style', 'svg', 'path', 'defs', 'linearGradient', 'radialGradient'],
    addAttrs: ['class', 'style', 'role', 'aria-label', 'id', 'fill', 'stroke', 'viewBox'],
  },
  write: {
    syncCategory: false,
    sort: true,
  },
}

export interface AgentPaths {
  rootDir: string
  baseDir: string
  contentDir: string
  schemaPath: string
  rootManifestPath: string
  logsDir: string
  reportsDir: string
  categoryManifestPath(category: CategoryKey): string
}

export interface NormalizationChange {
  field: string
  from: unknown
  to: unknown
  reason?: string
}

export interface NormalizedItemResult {
  item: ContentItem
  changes: NormalizationChange[]
  warnings: string[]
}

export interface CategoryScanResult {
  key: CategoryKey
  manifestPath: string
  items: ContentItem[]
  normalized: NormalizedItemResult[]
  missingFiles: string[]
  errors: string[]
}

export interface DuplicateRecord {
  id: string
  sources: string[]
}

export interface AggregateBuildResult {
  manifest: RootManifest
  duplicates: DuplicateRecord[]
  added: string[]
  removed: string[]
  updated: string[]
  categorySummaries: Record<RootCategoryKey, ContentCategorySummary>
}

export interface ValidationIssue {
  level: 'error' | 'warning'
  message: string
  file?: string
  itemId?: string
}

export interface ValidationReport {
  issues: ValidationIssue[]
  hasErrors: boolean
  seenIds: Set<string>
}
