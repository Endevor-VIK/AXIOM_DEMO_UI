import { randomUUID } from 'node:crypto'

import { getDb } from './db'

export type DbUser = {
  id: string
  email: string
  password_hash: string
  created_at: number
  updated_at: number
}

export type UserRecord = {
  id: string
  email: string
  roles: string[]
  createdAt: number
  updatedAt: number
}

export function findUserByEmail(email: string): DbUser | null {
  const row = getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email)
  return (row as DbUser) || null
}

export function findUserById(id: string): DbUser | null {
  const row = getDb()
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id)
  return (row as DbUser) || null
}

export function createUser(email: string, passwordHash: string): DbUser {
  const now = Date.now()
  const id = randomUUID()
  getDb()
    .prepare(
      'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(id, email, passwordHash, now, now)
  const created = findUserById(id)
  if (!created) {
    throw new Error('Failed to create user')
  }
  return created
}

export function listUsers(): UserRecord[] {
  const rows = getDb()
    .prepare(
      'SELECT u.id, u.email, u.created_at, u.updated_at, GROUP_CONCAT(r.role) as roles FROM users u LEFT JOIN user_roles r ON u.id = r.user_id GROUP BY u.id ORDER BY u.created_at DESC',
    )
    .all() as Array<{
    id: string
    email: string
    created_at: number
    updated_at: number
    roles: string | null
  }>
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    roles: row.roles ? row.roles.split(',') : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export function getUserRoles(userId: string): string[] {
  const rows = getDb()
    .prepare('SELECT role FROM user_roles WHERE user_id = ?')
    .all(userId) as Array<{ role: string }>
  return rows.map((row) => row.role)
}

export function addUserRole(userId: string, role: string): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)')
    .run(userId, role)
}

export function setUserRoles(userId: string, roles: string[]): void {
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId)
    for (const role of roles) {
      db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)').run(userId, role)
    }
  })
  tx()
}

export function deleteUserById(userId: string): boolean {
  const result = getDb()
    .prepare('DELETE FROM users WHERE id = ?')
    .run(userId)
  return result.changes > 0
}

export function updateUserPassword(userId: string, passwordHash: string): boolean {
  const now = Date.now()
  const result = getDb()
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(passwordHash, now, userId)
  return result.changes > 0
}
