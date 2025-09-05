// AXIOM_DEMO_UI — WEB CORE
// Canvas: C13 — lib/auth/index.ts
// Purpose: Local (PUBLIC demo) auth store, user model, helpers for login/register.

import { hashPassword as hp, verifyPassword as vp, type HashedPassword } from './crypto';

export type { HashedPassword } from './crypto';

export interface AuthUser {
  login: string;
  password: HashedPassword; // hashed
  createdAt: string;        // ISO string
}

const LS_KEY = 'axiom.users';

export async function hashPassword(password: string){ return hp(password); }
export async function verifyPassword(password: string, hashed: HashedPassword){ return vp(password, hashed); }

export async function loadUsers(): Promise<AuthUser[]> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // Soft validation
    return arr.filter(u => typeof u?.login === 'string' && typeof u?.password?.k === 'string');
  } catch {
    return [];
  }
}

export async function saveUsers(users: AuthUser[]): Promise<void> {
  localStorage.setItem(LS_KEY, JSON.stringify(users));
}

export async function saveUser(user: AuthUser): Promise<void> {
  const users = await loadUsers();
  users.push(user);
  await saveUsers(users);
}

export async function ensureDemoUser(login = 'demo', password = 'axiom'){
  const users = await loadUsers();
  if (users.some(u => u.login === login)) return;
  const hashed = await hp(password);
  users.push({ login, password: hashed, createdAt: new Date().toISOString() });
  await saveUsers(users);
}
