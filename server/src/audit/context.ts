import type { FastifyRequest } from 'fastify'

export type AuditContext = {
  ip: string | null
  ua: string | null
  device: string
  region: string
  network: string
}

function takeFirst(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] || ''
  return raw || ''
}

function readForwardedIp(headers: FastifyRequest['headers']): string | null {
  const fromForwarded = takeFirst(headers['x-forwarded-for']).split(',')[0]?.trim()
  if (fromForwarded) return fromForwarded
  const fromRealIp = takeFirst(headers['x-real-ip']).trim()
  if (fromRealIp) return fromRealIp
  return null
}

export function resolveRegion(headers: FastifyRequest['headers']): string {
  const candidates = [
    takeFirst(headers['x-vercel-ip-country']),
    takeFirst(headers['cf-ipcountry']),
    takeFirst(headers['x-country-code']),
    takeFirst(headers['x-geo-country']),
  ]
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)

  if (candidates.length) return candidates[0]!
  return 'UNKNOWN'
}

export function resolveNetwork(ip: string | null): string {
  if (!ip) return 'unknown'
  const normalized = ip.trim().toLowerCase()
  if (!normalized) return 'unknown'
  if (normalized === '::1' || normalized === '127.0.0.1') return 'loopback'
  const octets = normalized.split('.')
  if (octets.length === 4 && octets.every((part) => /^\d+$/.test(part))) {
    const o1 = Number(octets[0])
    const o2 = Number(octets[1])
    if (o1 === 10) return 'private'
    if (o1 === 192 && o2 === 168) return 'private'
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return 'private'
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return 'private'
  return 'public'
}

export function resolveDevice(ua: string | null): string {
  if (!ua) return 'unknown'
  const normalized = ua.toLowerCase()
  if (normalized.includes('bot') || normalized.includes('crawler') || normalized.includes('spider')) return 'bot'
  if (normalized.includes('mobile') || normalized.includes('android') || normalized.includes('iphone')) return 'mobile'
  if (normalized.includes('ipad') || normalized.includes('tablet')) return 'tablet'
  if (normalized.includes('windows') || normalized.includes('linux') || normalized.includes('macintosh')) {
    return 'desktop'
  }
  return 'unknown'
}

export function buildAuditContext(request: FastifyRequest): AuditContext {
  const ip = readForwardedIp(request.headers) || request.ip || null
  const ua = takeFirst(request.headers['user-agent']).trim() || null
  return {
    ip,
    ua,
    device: resolveDevice(ua),
    region: resolveRegion(request.headers),
    network: resolveNetwork(ip),
  }
}
