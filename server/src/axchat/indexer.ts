import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import matter from 'gray-matter'

export type AxchatRef = {
  title: string
  path: string
  route: string
  anchor?: string
  excerpt?: string
  score?: number
}

export type AxchatIndexStatus = {
  ok: boolean
  indexed_at?: string
  version?: string
}

export type BuildIndexOptions = {
  root: string
  indexPath: string
  sourceDirs?: string[]
  chunkSize: number
  chunkOverlap: number
}

type Section = {
  title: string
  anchor?: string
  content: string
}

const INDEX_VERSION = 'fts5-v1'
const DEFAULT_DIRS = ['export', 'content-src', 'content']

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function toPosix(p: string) {
  return p.split(path.sep).join('/')
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

function stripMarkdown(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^\)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitSections(markdown: string, fallbackTitle: string): Section[] {
  const lines = markdown.split(/\r?\n/)
  const sections: Section[] = []
  let current: Section = { title: fallbackTitle, content: '' }

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line)
    if (match) {
      if (current.content.trim().length > 0) sections.push(current)
      const heading = match[2]?.trim() || fallbackTitle
      current = {
        title: heading,
        anchor: slugify(heading),
        content: '',
      }
      continue
    }
    current.content += line + '\n'
  }
  if (current.content.trim().length > 0) sections.push(current)
  if (sections.length === 0) {
    return [{ title: fallbackTitle, content: markdown }]
  }
  return sections
}

function chunkText(text: string, size: number, overlap: number) {
  const chunks: string[] = []
  if (!text) return chunks
  let start = 0
  const total = text.length
  while (start < total) {
    const end = Math.min(start + size, total)
    const slice = text.slice(start, end).trim()
    if (slice.length > 0) chunks.push(slice)
    if (end === total) break
    start = Math.max(0, end - overlap)
  }
  return chunks
}

function makeExcerpt(text: string, maxLen = 260) {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= maxLen) return clean
  return clean.slice(0, maxLen).trim() + '…'
}

function resolveSourceDirs(root: string, sourceDirs: string[]) {
  const dirs: string[] = []
  const seen = new Set<string>()
  for (const entry of sourceDirs) {
    const safe = entry.trim()
    if (!safe) continue
    if (seen.has(safe)) continue
    seen.add(safe)
    const full = path.join(root, safe)
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      dirs.push(full)
    }
  }
  return dirs
}

function walkMarkdownFiles(root: string, dirs: string[]) {
  const files: string[] = []
  const allowedExt = new Set(['.md', '.markdown'])

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue
        walk(full)
      } else {
        const ext = path.extname(entry.name).toLowerCase()
        if (allowedExt.has(ext)) files.push(full)
      }
    }
  }

  for (const dir of dirs) {
    walk(dir)
  }

  return files
}

function ensureSchema(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      anchor TEXT,
      route TEXT NOT NULL,
      excerpt TEXT,
      source TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      content,
      title,
      path,
      anchor,
      source,
      doc_id UNINDEXED
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

function resetIndex(db: Database.Database) {
  db.exec('DELETE FROM documents;')
  db.exec('DELETE FROM documents_fts;')
}

function setMeta(db: Database.Database, key: string, value: string) {
  const stmt = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
  stmt.run(key, value)
}

export function buildAxchatIndex(options: BuildIndexOptions) {
  const { root, indexPath, chunkSize, chunkOverlap, sourceDirs } = options
  ensureDir(path.dirname(indexPath))
  const db = new Database(indexPath)
  ensureSchema(db)
  resetIndex(db)

  const now = new Date().toISOString()
  const dirs = resolveSourceDirs(root, sourceDirs?.length ? sourceDirs : DEFAULT_DIRS)
  const files = walkMarkdownFiles(root, dirs)
  const insertDoc = db.prepare(
    `INSERT INTO documents (path, title, anchor, route, excerpt, source, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const insertFts = db.prepare(
    `INSERT INTO documents_fts (content, title, path, anchor, source, doc_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  let docCount = 0
  let chunkCount = 0

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = matter(raw)
    const body = parsed.content || ''
    const relPath = toPosix(path.relative(root, filePath))
    const frontTitle =
      typeof parsed.data?.title === 'string' && parsed.data.title.trim().length > 0
        ? parsed.data.title.trim()
        : null
    const baseTitle = frontTitle || path.basename(filePath, path.extname(filePath))

    const sections = splitSections(body, baseTitle)
    for (const section of sections) {
      const sectionText = stripMarkdown(section.content)
      if (!sectionText) continue
      const chunks = chunkText(sectionText, chunkSize, chunkOverlap)
      for (const chunk of chunks) {
        const title = section.title ? `${baseTitle} · ${section.title}` : baseTitle
        const route = `/api/axchat/file?path=${encodeURIComponent(relPath)}`
        const excerpt = makeExcerpt(chunk)
        const source = relPath.split('/')[0] || ''
        const result = insertDoc.run(
          relPath,
          title,
          section.anchor || null,
          route,
          excerpt,
          source,
          Date.now(),
        )
        const docId = Number(result.lastInsertRowid)
        insertFts.run(chunk, title, relPath, section.anchor || '', source, docId)
        chunkCount += 1
      }
      docCount += 1
    }
  }

  setMeta(db, 'indexed_at', now)
  setMeta(db, 'version', INDEX_VERSION)
  setMeta(db, 'documents', String(docCount))
  setMeta(db, 'chunks', String(chunkCount))

  db.close()

  return { indexedAt: now, documents: docCount, chunks: chunkCount, indexPath }
}

export function readIndexStatus(indexPath: string): AxchatIndexStatus {
  if (!fs.existsSync(indexPath)) return { ok: false }
  try {
    const db = new Database(indexPath, { readonly: true })
    const meta = db.prepare('SELECT key, value FROM meta').all() as Array<{ key: string; value: string }>
    const map = new Map(meta.map((row) => [row.key, row.value]))
    db.close()
    return {
      ok: true,
      indexed_at: map.get('indexed_at') || undefined,
      version: map.get('version') || undefined,
    }
  } catch {
    return { ok: false }
  }
}

export function searchAxchatIndex(
  indexPath: string,
  query: string,
  limit = 6,
  options: { allowedSources?: string[] } = {},
): AxchatRef[] {
  if (!fs.existsSync(indexPath)) return []
  const tokens = (query.match(/[\p{L}\p{N}]+/gu) || []).map((t) => t.toLowerCase())
  if (tokens.length === 0) return []
  const ftsQuery = tokens.map((token) => `${token}*`).join(' ')
  const allowedSources = (options.allowedSources || []).map((entry) => entry.trim()).filter(Boolean)

  try {
    const db = new Database(indexPath, { readonly: true })
    const sourceClause = allowedSources.length
      ? ` AND d.source IN (${allowedSources.map(() => '?').join(',')})`
      : ''
    const stmt = db.prepare(
      `SELECT d.title as title, d.path as path, d.route as route, d.anchor as anchor, d.excerpt as excerpt,
              bm25(documents_fts) as score
       FROM documents_fts
       JOIN documents d ON d.id = documents_fts.doc_id
       WHERE documents_fts MATCH ?
       ${sourceClause}
       ORDER BY score
       LIMIT ?`
    )
    const params = allowedSources.length ? [ftsQuery, ...allowedSources, limit] : [ftsQuery, limit]
    const rows = stmt.all(...params) as AxchatRef[]
    db.close()
    return rows.map((row) => ({
      ...row,
      score: typeof row.score === 'number' ? Math.round(row.score * 1000) / 1000 : undefined,
    }))
  } catch {
    return []
  }
}

export function safeResolvePath(root: string, relPath: string) {
  const resolved = path.resolve(root, relPath)
  const safeRoot = root.endsWith(path.sep) ? root : root + path.sep
  if (!resolved.startsWith(safeRoot)) return null
  return resolved
}

export function readAxchatFile(root: string, relPath: string) {
  const safePath = safeResolvePath(root, relPath)
  if (!safePath || !fs.existsSync(safePath)) return null
  const stat = fs.statSync(safePath)
  if (!stat.isFile()) return null
  return fs.readFileSync(safePath, 'utf8')
}
