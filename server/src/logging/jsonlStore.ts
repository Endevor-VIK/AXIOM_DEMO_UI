import fs from 'node:fs'
import path from 'node:path'

import { sanitizeLogPayload } from './sanitize'

const LOG_ROOT = path.resolve(process.cwd(), 'runtime', 'logs')

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
}

function dayStamp(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function safePathSegment(value: string): string {
  const safe = value.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
  return safe || 'unknown'
}

function appendJsonl(filePath: string, payload: Record<string, unknown>) {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, `${JSON.stringify(sanitizeLogPayload(payload))}\n`, 'utf8')
}

function resolveDailyPath(parts: string[], ts: number): string {
  return path.resolve(LOG_ROOT, ...parts, `${dayStamp(ts)}.jsonl`)
}

function parseLine(line: string): Record<string, unknown> | null {
  const raw = line.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function parseTimestamp(raw: unknown): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function readJsonlFile(filePath: string): Record<string, unknown>[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    if (!content.trim()) return []
    return content
      .split('\n')
      .map(parseLine)
      .filter((row): row is Record<string, unknown> => Boolean(row))
  } catch {
    return []
  }
}

function listDailyFiles(dirPath: string): string[] {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name))
      .sort((a, b) => b.localeCompare(a))
      .map((name) => path.join(dirPath, name))
  } catch {
    return []
  }
}

export type AxchatAuditEntry = {
  ts: number
  userId: string
  login: string | null
  sessionId: string | null
  conversationId: string | null
  requestId: string | null
  type: 'axchat.message' | 'axchat.error'
  role: 'user' | 'ai' | 'system'
  text: string
  meta?: Record<string, unknown>
}

export type ReadAxchatOptions = {
  from?: number
  to?: number
  q?: string
  limit?: number
  cursor?: string
}

export type AxchatConversationSummary = {
  conversationId: string
  messages: number
  startedAt: number
  lastTs: number
  lastRole: string
}

export function writeTelemetryLog(entry: Record<string, unknown>, ts = Date.now()) {
  appendJsonl(resolveDailyPath(['telemetry'], ts), entry)
}

export function writeApiLog(entry: Record<string, unknown>, ts = Date.now()) {
  appendJsonl(resolveDailyPath(['api'], ts), entry)
}

export function writeAdminAuditLog(entry: Record<string, unknown>, ts = Date.now()) {
  appendJsonl(resolveDailyPath(['admin_audit'], ts), entry)
}

export function writeAxchatLog(userId: string, entry: AxchatAuditEntry, ts = Date.now()) {
  const segment = safePathSegment(userId)
  appendJsonl(resolveDailyPath(['axchat', segment], ts), entry as unknown as Record<string, unknown>)
}

export function readAxchatLogs(userId: string, options: ReadAxchatOptions = {}) {
  const segment = safePathSegment(userId)
  const dir = path.resolve(LOG_ROOT, 'axchat', segment)
  const files = listDailyFiles(dir)

  const fromTs = Number.isFinite(options.from) ? Number(options.from) : 0
  const toTs = Number.isFinite(options.to) ? Number(options.to) : Number.MAX_SAFE_INTEGER
  const cursorTs = Number.isFinite(Number(options.cursor)) ? Number(options.cursor) : Number.MAX_SAFE_INTEGER
  const query = (options.q || '').trim().toLowerCase()
  const safeLimit = Math.min(Math.max(1, Math.floor(options.limit || 120)), 400)

  const entries: AxchatAuditEntry[] = []

  for (const filePath of files) {
    const rows = readJsonlFile(filePath)
    for (const row of rows) {
      const ts = parseTimestamp(row.ts)
      if (!ts) continue
      if (ts < fromTs || ts > toTs || ts >= cursorTs) continue

      const text = typeof row.text === 'string' ? row.text : ''
      const type = row.type === 'axchat.error' ? 'axchat.error' : 'axchat.message'
      const role = row.role === 'user' || row.role === 'ai' || row.role === 'system' ? row.role : 'system'

      if (query) {
        const haystack = `${text}\n${JSON.stringify(row.meta || {})}`.toLowerCase()
        if (!haystack.includes(query)) continue
      }

      const parsedMeta = row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : null
      const entry: AxchatAuditEntry = {
        ts,
        userId: typeof row.userId === 'string' ? row.userId : userId,
        login: typeof row.login === 'string' ? row.login : null,
        sessionId: typeof row.sessionId === 'string' ? row.sessionId : null,
        conversationId: typeof row.conversationId === 'string' ? row.conversationId : null,
        requestId: typeof row.requestId === 'string' ? row.requestId : null,
        type,
        role,
        text,
        ...(parsedMeta ? { meta: parsedMeta } : {}),
      }
      entries.push(entry)
    }
  }

  entries.sort((a, b) => b.ts - a.ts)
  const items = entries.slice(0, safeLimit)
  const nextCursor = entries.length > safeLimit ? String(items[items.length - 1]?.ts || '') : null

  return {
    items,
    nextCursor,
  }
}

export function listAxchatConversations(userId: string, options: Pick<ReadAxchatOptions, 'from' | 'to'> = {}) {
  const batch = readAxchatLogs(userId, {
    ...options,
    limit: 400,
  }).items

  const index = new Map<string, AxchatConversationSummary>()
  for (const item of batch) {
    const conversationId = item.conversationId || item.sessionId || `session:${item.userId}`
    const existing = index.get(conversationId)
    if (!existing) {
      index.set(conversationId, {
        conversationId,
        messages: 1,
        startedAt: item.ts,
        lastTs: item.ts,
        lastRole: item.role,
      })
      continue
    }
    existing.messages += 1
    existing.startedAt = Math.min(existing.startedAt, item.ts)
    if (item.ts >= existing.lastTs) {
      existing.lastTs = item.ts
      existing.lastRole = item.role
    }
  }

  return [...index.values()].sort((a, b) => b.lastTs - a.lastTs)
}

export function buildAxchatDownload(userId: string, options: ReadAxchatOptions = {}) {
  const rows = readAxchatLogs(userId, {
    ...options,
    limit: Math.min(Math.max(1, Math.floor(options.limit || 1000)), 5000),
  }).items
  return rows
    .sort((a, b) => a.ts - b.ts)
    .map((row) => JSON.stringify(row))
    .join('\n')
}
