import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

import { config } from '../config'

let db: Database.Database | null = null

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  ip TEXT,
  ua TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
  payload_json TEXT,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_events(subject_user_id);
`

export function getDb(): Database.Database {
  if (db) return db
  const dir = path.dirname(config.dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  db = new Database(config.dbPath)
  db.exec(SCHEMA_SQL)
  return db
}
