import { build } from 'vite'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { promises as fs } from 'fs'
import { join } from 'path'

const OUT = 'dist'
const TARGET = 'export/site'
const CONTENT_DIR = join(process.cwd(), 'public', 'data', 'content')

const CONTENT_CATEGORIES = [
  'locations',
  'characters',
  'technologies',
  'factions',
  'events',
] as const

interface ContentAggregateItem {
  id?: string
  category?: string
  date?: string
  weight?: number
  [key: string]: unknown
}

interface ContentCategorySummary {
  count: number
  manifest: string
}

interface LoreIndexNode {
  id: string
  title: string
  path?: string
  children?: LoreIndexNode[]
  [key: string]: unknown
}

interface ContentAggregateFile {
  meta: {
    version: number
    generatedAt: string
    source: string
  }
  items: ContentAggregateItem[]
  categories: Record<'all' | typeof CONTENT_CATEGORIES[number] | 'lore', ContentCategorySummary>
  lore: {
    index: string
    roots: LoreIndexNode[]
  }
}

async function readJson<T>(path: string): Promise<T> {
  const raw = await fs.readFile(path, 'utf8')
  return JSON.parse(raw) as T
}

async function safeReadJson<T>(path: string): Promise<T | null> {
  try {
    return await readJson<T>(path)
  } catch (error: any) {
    if (error && error.code === 'ENOENT') return null
    throw error
  }
}

function sortItems(items: ContentAggregateItem[]): void {
  items.sort((a, b) => {
    const weightA = typeof a.weight === 'number' ? a.weight : 0
    const weightB = typeof b.weight === 'number' ? b.weight : 0
    if (weightA !== weightB) return weightA - weightB
    const dateA = typeof a.date === 'string' ? a.date : ''
    const dateB = typeof b.date === 'string' ? b.date : ''
    if (dateA < dateB) return 1
    if (dateA > dateB) return -1
    const idA = typeof a.id === 'string' ? a.id : ''
    const idB = typeof b.id === 'string' ? b.id : ''
    return idA.localeCompare(idB)
  })
}

async function generateContentAggregate(): Promise<void> {
  const items: ContentAggregateItem[] = []

  for (const category of CONTENT_CATEGORIES) {
    const manifestPath = join(CONTENT_DIR, category, 'manifest.json')
    const entries = await safeReadJson<ContentAggregateItem[]>(manifestPath)
    if (!entries) continue
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue
      if (!entry.category) entry.category = category
      items.push(entry)
    }
  }

  sortItems(items)

  const loreIndexPath = join(CONTENT_DIR, 'lore', '_index.json')
  const loreIndex = await safeReadJson<LoreIndexNode>(loreIndexPath)
  const loreRoots = loreIndex?.children ?? []

  const categories: Record<'all' | typeof CONTENT_CATEGORIES[number] | 'lore', ContentCategorySummary> = {
    all: { count: items.length, manifest: 'content/manifest.json' },
    locations: { count: 0, manifest: 'content/locations/manifest.json' },
    characters: { count: 0, manifest: 'content/characters/manifest.json' },
    technologies: { count: 0, manifest: 'content/technologies/manifest.json' },
    factions: { count: 0, manifest: 'content/factions/manifest.json' },
    events: { count: 0, manifest: 'content/events/manifest.json' },
    lore: { count: Array.isArray(loreRoots) ? loreRoots.length : 0, manifest: 'content/lore/_index.json' },
  }

  for (const item of items) {
    const cat = item.category
    if (cat && (CONTENT_CATEGORIES as readonly string[]).includes(cat)) {
      categories[cat as typeof CONTENT_CATEGORIES[number]].count += 1
    }
  }

  const aggregate: ContentAggregateFile = {
    meta: {
      version: 2,
      generatedAt: new Date().toISOString(),
      source: 'tools/export.ts',
    },
    items,
    categories,
    lore: {
      index: 'content/lore/_index.json',
      roots: loreRoots,
    },
  }

  const targetPath = join(CONTENT_DIR, 'manifest.json')
  await fs.writeFile(targetPath, JSON.stringify(aggregate, null, 2), 'utf8')
  console.log('[export] generated content aggregate', items.length)
}

async function main() {
  await generateContentAggregate()

  rmSync(OUT, { recursive: true, force: true })
  await build()

  rmSync(TARGET, { recursive: true, force: true })
  mkdirSync(TARGET, { recursive: true })
  cpSync(OUT, TARGET, { recursive: true })

  const fallback = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./">'
  writeFileSync(join(TARGET, '404.html'), fallback)
  writeFileSync(join(TARGET, '.nojekyll'), '')

  if (!existsSync(join(TARGET, 'index.html'))) {
    throw new Error('Export failed: missing index.html in export/site')
  }

  console.log('[export] done =>', TARGET)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
