const REDACT_KEY_RE = /(pass(word)?|token|secret|authorization|cookie|api[_-]?key)/i

function truncateString(value: string, max = 1200): string {
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

function sanitizeString(value: string): string {
  const trimmed = value.trim()
  const maskedBearer = trimmed.replace(/bearer\s+[a-z0-9._\-]+/gi, 'bearer [REDACTED]')
  return truncateString(maskedBearer)
}

function sanitizeUnknown(value: unknown, depth: number, keyHint?: string): unknown {
  if (value === null || value === undefined) return value

  if (keyHint && REDACT_KEY_RE.test(keyHint)) return '[REDACTED]'

  if (typeof value === 'string') return sanitizeString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) {
    if (depth <= 0) return '[MAX_DEPTH]'
    return value.slice(0, 50).map((item) => sanitizeUnknown(item, depth - 1))
  }

  if (typeof value === 'object') {
    if (depth <= 0) return '[MAX_DEPTH]'
    const out: Record<string, unknown> = {}
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 80)
    for (const [key, nextValue] of entries) {
      out[key] = sanitizeUnknown(nextValue, depth - 1, key)
    }
    return out
  }

  return String(value)
}

export function sanitizeLogPayload<T = unknown>(value: T): T {
  return sanitizeUnknown(value, 4) as T
}
