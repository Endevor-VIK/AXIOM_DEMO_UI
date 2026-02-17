import { getDb } from './db'

const MAX_AUDIT_EVENTS = 5000
let schemaEnsured = false

export type AuditEventRecord = {
  id: number
  createdAt: number
  actorUserId: string | null
  subjectUserId: string | null
  scope: string
  eventType: string
  status: string | null
  message: string | null
  ip: string | null
  ua: string | null
  device: string
  region: string
  network: string
  payload: Record<string, unknown> | null
}

export type InsertAuditEventInput = {
  actorUserId?: string | null
  subjectUserId?: string | null
  scope: string
  eventType: string
  status?: string | null
  message?: string | null
  ip?: string | null
  ua?: string | null
  device?: string | null
  region?: string | null
  network?: string | null
  payload?: Record<string, unknown> | null
  createdAt?: number
}

type AuditRow = {
  id: number
  created_at: number
  actor_user_id: string | null
  subject_user_id: string | null
  scope: string
  event_type: string
  status: string | null
  message: string | null
  ip: string | null
  ua: string | null
  device: string | null
  region: string | null
  network: string | null
  payload_json: string | null
}

function parsePayload(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // ignore JSON parse errors
  }
  return null
}

function toEvent(row: AuditRow): AuditEventRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorUserId: row.actor_user_id,
    subjectUserId: row.subject_user_id,
    scope: row.scope,
    eventType: row.event_type,
    status: row.status,
    message: row.message,
    ip: row.ip,
    ua: row.ua,
    device: row.device || 'unknown',
    region: row.region || 'UNKNOWN',
    network: row.network || 'unknown',
    payload: parsePayload(row.payload_json),
  }
}

function cleanupAuditEvents() {
  try {
    const db = getDb()
    const boundary = db
      .prepare('SELECT id FROM audit_events ORDER BY id DESC LIMIT 1 OFFSET ?')
      .get(MAX_AUDIT_EVENTS) as { id: number } | undefined
    if (!boundary?.id) return
    db.prepare('DELETE FROM audit_events WHERE id <= ?').run(boundary.id)
  } catch {
    // no-op, audit cleanup must never break request flow
  }
}

function ensureAuditSchema() {
  if (schemaEnsured) return
  try {
    const db = getDb()
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        actor_user_id TEXT,
        subject_user_id TEXT,
        scope TEXT NOT NULL,
        event_type TEXT NOT NULL,
        status TEXT,
        message TEXT,
        ip TEXT,
        ua TEXT,
        device TEXT,
        region TEXT,
        network TEXT,
        payload_json TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_events(subject_user_id);
    `)
    schemaEnsured = true
  } catch {
    // no-op, retry lazily on next call
  }
}

export function recordAuditEvent(input: InsertAuditEventInput): void {
  try {
    ensureAuditSchema()
    const now = input.createdAt ?? Date.now()
    getDb()
      .prepare(
        `INSERT INTO audit_events (
          created_at, actor_user_id, subject_user_id, scope, event_type, status, message, ip, ua, device, region, network, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        now,
        input.actorUserId ?? null,
        input.subjectUserId ?? null,
        input.scope,
        input.eventType,
        input.status ?? null,
        input.message ?? null,
        input.ip ?? null,
        input.ua ?? null,
        input.device ?? 'unknown',
        input.region ?? 'UNKNOWN',
        input.network ?? 'unknown',
        input.payload ? JSON.stringify(input.payload) : null,
      )
    cleanupAuditEvents()
  } catch {
    // no-op, audit insert must never block main API
  }
}

export function listAuditEvents(limit = 80): AuditEventRecord[] {
  try {
    ensureAuditSchema()
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 200)
    const rows = getDb()
      .prepare('SELECT * FROM audit_events ORDER BY created_at DESC, id DESC LIMIT ?')
      .all(safeLimit) as AuditRow[]
    return rows.map(toEvent)
  } catch {
    return []
  }
}

export function listAuditEventsByUser(userId: string, limit = 120): AuditEventRecord[] {
  try {
    ensureAuditSchema()
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 400)
    const rows = getDb()
      .prepare(
        `SELECT * FROM audit_events
         WHERE actor_user_id = ? OR subject_user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
      )
      .all(userId, userId, safeLimit) as AuditRow[]
    return rows.map(toEvent)
  } catch {
    return []
  }
}
