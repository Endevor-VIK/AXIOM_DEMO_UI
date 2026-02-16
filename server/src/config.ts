import path from 'node:path'

const truthy = (value?: string) => value === '1' || value === 'true' || value === 'on'
const csv = (value?: string) =>
  (value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

const DEFAULT_AXCHAT_SOURCE_DIRS = ['export', 'content-src', 'content']
const DEFAULT_AXCHAT_PUBLIC_SOURCE_DIRS = ['content-src', 'content']
const DEFAULT_AXCHAT_CREATOR_SOURCE_DIRS = [...DEFAULT_AXCHAT_SOURCE_DIRS]
const DEFAULT_AXCHAT_ADMIN_SOURCE_DIRS = [...DEFAULT_AXCHAT_SOURCE_DIRS]
const AXCHAT_SOURCE_DIRS = csv(process.env.AXCHAT_SOURCE_DIRS)
const AXCHAT_PUBLIC_SOURCE_DIRS = csv(process.env.AXCHAT_PUBLIC_SOURCE_DIRS)
const AXCHAT_CREATOR_SOURCE_DIRS = csv(process.env.AXCHAT_CREATOR_SOURCE_DIRS)
const AXCHAT_ADMIN_SOURCE_DIRS = csv(process.env.AXCHAT_ADMIN_SOURCE_DIRS)

export const config = {
  port: Number(process.env.AX_API_PORT || 8787),
  host: process.env.AX_API_HOST || '127.0.0.1',
  deployTarget: process.env.AX_DEPLOY_TARGET === 'ghpages' ? 'ghpages' : 'local',
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
  axchatIndexPath:
    process.env.AXCHAT_INDEX_PATH ||
    path.resolve(process.cwd(), 'runtime', 'axchat', 'index.sqlite'),
  axchatSourceDirs: AXCHAT_SOURCE_DIRS.length ? AXCHAT_SOURCE_DIRS : DEFAULT_AXCHAT_SOURCE_DIRS,
  axchatPublicSourceDirs: AXCHAT_PUBLIC_SOURCE_DIRS.length
    ? AXCHAT_PUBLIC_SOURCE_DIRS
    : DEFAULT_AXCHAT_PUBLIC_SOURCE_DIRS,
  axchatCreatorSourceDirs: AXCHAT_CREATOR_SOURCE_DIRS.length
    ? AXCHAT_CREATOR_SOURCE_DIRS
    : DEFAULT_AXCHAT_CREATOR_SOURCE_DIRS,
  axchatAdminSourceDirs: AXCHAT_ADMIN_SOURCE_DIRS.length
    ? AXCHAT_ADMIN_SOURCE_DIRS
    : DEFAULT_AXCHAT_ADMIN_SOURCE_DIRS,
  axchatModel: process.env.AXCHAT_MODEL || 'qwen2.5:7b-instruct',
  axchatHost: process.env.AXCHAT_HOST || 'http://127.0.0.1:11434',
  axchatHeartbeatLines: truthy(process.env.AXCHAT_HEARTBEAT_LINES),
  axchatTimeoutMs: Number(process.env.AXCHAT_TIMEOUT_MS || 60_000),
  axchatTopK: Number(process.env.AXCHAT_TOP_K || 4),
  axchatChunkSize: Number(process.env.AXCHAT_CHUNK_SIZE || 1000),
  axchatChunkOverlap: Number(process.env.AXCHAT_CHUNK_OVERLAP || 120),
}

export const SESSION_TTL_MS = config.sessionTtlDays * 24 * 60 * 60 * 1000
