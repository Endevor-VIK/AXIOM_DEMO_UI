import { randomBytes } from 'node:crypto'

import { getDb } from '../db/db'
import { SESSION_TTL_MS } from '../config'

export type SessionRecord = {
  id: string
  user_id: string
  created_at: number
  expires_at: number
  revoked_at: number | null
  ip: string | null
  ua: string | null
}

function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

export function createSession(userId: string, ip?: string, ua?: string): SessionRecord {
  const now = Date.now()
  const expires = now + SESSION_TTL_MS
  const id = generateSessionId()
  getDb()
    .prepare(
      'INSERT INTO sessions (id, user_id, created_at, expires_at, revoked_at, ip, ua) VALUES (?, ?, ?, ?, NULL, ?, ?)',
    )
    .run(id, userId, now, expires, ip ?? null, ua ?? null)
  return {
    id,
    user_id: userId,
    created_at: now,
    expires_at: expires,
    revoked_at: null,
    ip: ip ?? null,
    ua: ua ?? null,
  }
}

export function getSession(id: string): SessionRecord | null {
  const row = getDb()
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(id)
  return (row as SessionRecord) || null
}

export function revokeSession(id: string): void {
  getDb()
    .prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
    .run(Date.now(), id)
}

export function revokeSessionsByUserId(userId: string): void {
  getDb()
    .prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .run(Date.now(), userId)
}

export function listSessionsByUserId(userId: string, limit = 60): SessionRecord[] {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 200)
  const rows = getDb()
    .prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, safeLimit)
  return (rows as SessionRecord[]) || []
}

export function isSessionValid(session: SessionRecord): boolean {
  if (session.revoked_at) return false
  if (session.expires_at <= Date.now()) return false
  return true
}
