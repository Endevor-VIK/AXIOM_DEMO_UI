import path from 'node:path'

const truthy = (value?: string) => value === '1' || value === 'true' || value === 'on'

export const config = {
  port: Number(process.env.AX_API_PORT || 8787),
  host: process.env.AX_API_HOST || '127.0.0.1',
  dbPath:
    process.env.AX_DB_PATH ||
    path.resolve(process.cwd(), 'runtime', 'auth.sqlite'),
  cookieName: process.env.AX_COOKIE_NAME || 'ax_session',
  cookieSecure: truthy(process.env.AX_COOKIE_SECURE) || process.env.NODE_ENV === 'production',
  allowRegister: truthy(process.env.AX_ALLOW_REGISTER),
  sessionTtlDays: Number(process.env.AX_SESSION_TTL_DAYS || 14),
  creatorEmail: process.env.AX_CREATOR_EMAIL || '',
  creatorPassword: process.env.AX_CREATOR_PASSWORD || '',
  seedTest: truthy(process.env.AX_SEED_TEST),
  testEmail: process.env.AX_TEST_EMAIL || 'test@local',
  testPassword: process.env.AX_TEST_PASSWORD || 'test12345',
}

export const SESSION_TTL_MS = config.sessionTtlDays * 24 * 60 * 60 * 1000
