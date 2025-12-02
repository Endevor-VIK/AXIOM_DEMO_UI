#!/usr/bin/env tsx
/**
 * Build CONTENT HUB v2 data:
 * - reads markdown with front-matter from /content-src
 * - renders HTML bodies into /public/content-html/<id>.html
 * - writes index to /src/features/content/data/content-index.json
 */

import { promises as fs } from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'

type Status = 'published' | 'draft'

interface ContentIndexEntry {
  id: string
  slug: string
  title: string
  zone: string
  category: string
  status: Status
  lang: string
  version: string
  tags: string[]
  preview: {
    kicker: string
    logline: string
    markers: string[]
    signature: string[]
    image: string
  }
}

const ROOT = process.cwd()
const CONTENT_SRC_DIR = path.join(ROOT, 'content-src')
const OUTPUT_HTML_DIR = path.join(ROOT, 'public', 'content-html')
const INDEX_PATH = path.join(ROOT, 'src', 'features', 'content', 'data', 'content-index.json')

marked.setOptions({ gfm: true, breaks: false, mangle: false })

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'content-item'
}

function assertString(value: unknown, field: string, file: string): string {
  if (typeof value !== 'string') {
    throw new Error(`[build-content] ${file}: field "${field}" must be a string`)
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`[build-content] ${file}: field "${field}" is empty`)
  }
  return trimmed
}

function ensureArray(value: unknown, field: string, file: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`[build-content] ${file}: field "${field}" must be an array of strings`)
  }
  const items = value.map((item) => assertString(item, `${field}[]`, file))
  if (!items.length) {
    throw new Error(`[build-content] ${file}: field "${field}" cannot be empty`)
  }
  return items
}

function ensureStatus(value: unknown, file: string): Status {
  const normalized = assertString(value, 'status', file).toLowerCase()
  if (normalized !== 'published' && normalized !== 'draft') {
    throw new Error(
      `[build-content] ${file}: status must be "published" or "draft" (received "${normalized}")`
    )
  }
  return normalized as Status
}

function hasHeading(html: string): boolean {
  return /^<h1[\s>]/i.test(html.trim())
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildPreview(data: Record<string, unknown>, file: string) {
  const kicker = assertString(data.preview_kicker ?? (data.preview as any)?.kicker, 'preview_kicker', file)
  const logline = assertString(
    data.preview_logline ?? (data.preview as any)?.logline,
    'preview_logline',
    file
  )
  const markers = ensureArray(
    data.preview_markers ?? (data.preview as any)?.markers,
    'preview_markers',
    file
  )
  const signature = ensureArray(
    data.preview_signature ?? (data.preview as any)?.signature,
    'preview_signature',
    file
  )
  const image = assertString(data.image ?? (data.preview as any)?.image, 'image', file)

  return { kicker, logline, markers, signature, image }
}

async function readMarkdownFiles(): Promise<ContentIndexEntry[]> {
  const entries = await fs.readdir(CONTENT_SRC_DIR)
  const mdFiles = entries.filter((name) => name.toLowerCase().endsWith('.md'))
  if (!mdFiles.length) {
    throw new Error('[build-content] No markdown files found in content-src/')
  }

  const idSet = new Set<string>()
  const slugSet = new Set<string>()
  const results: ContentIndexEntry[] = []

  for (const file of mdFiles) {
    const absPath = path.join(CONTENT_SRC_DIR, file)
    const raw = await fs.readFile(absPath, 'utf8')
    const parsed = matter(raw)
    const data = parsed.data as Record<string, unknown>

    const id = assertString(data.id, 'id', file)
    const title = assertString(data.title, 'title', file)
    const zone = assertString(data.zone, 'zone', file)
    const category = assertString(data.category, 'category', file)
    const status = ensureStatus(data.status, file)
    const lang = assertString(data.lang, 'lang', file)
    const version = assertString(data.version, 'version', file)
    const tags = ensureArray(data.tags, 'tags', file)
    const preview = buildPreview(data, file)
    const slug = (data.slug ? assertString(data.slug, 'slug', file) : slugify(title)).toLowerCase()

    if (idSet.has(id)) {
      throw new Error(`[build-content] Duplicate id "${id}" in file ${file}`)
    }
    if (slugSet.has(slug)) {
      throw new Error(`[build-content] Duplicate slug "${slug}" in file ${file}`)
    }
    idSet.add(id)
    slugSet.add(slug)

    const rendered = marked.parse(parsed.content)
    const html = typeof rendered === 'string' ? rendered : String(rendered)
    const withHeading = hasHeading(html) ? html.trim() : `<h1>${escapeHtml(title)}</h1>\n${html.trim()}`

    const htmlTarget = path.join(OUTPUT_HTML_DIR, `${id}.html`)
    await fs.writeFile(htmlTarget, withHeading, 'utf8')

    results.push({
      id,
      slug,
      title,
      zone,
      category,
      status,
      lang,
      version,
      tags,
      preview,
    })
  }

  results.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }))
  return results
}

async function ensureDirs() {
  await fs.mkdir(CONTENT_SRC_DIR, { recursive: true })
  await fs.rm(OUTPUT_HTML_DIR, { recursive: true, force: true })
  await fs.mkdir(OUTPUT_HTML_DIR, { recursive: true })
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true })
}

async function build() {
  await ensureDirs()
  const index = await readMarkdownFiles()
  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8')
  console.log(`[build-content] Generated ${index.length} entries`)
  console.log(`[build-content] HTML: ${OUTPUT_HTML_DIR}`)
  console.log(`[build-content] Index: ${INDEX_PATH}`)
}

build().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
