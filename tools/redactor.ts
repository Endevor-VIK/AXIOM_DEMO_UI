// AXIOM_DEMO_UI — WEB CORE
// Canvas: C29 — tools/redactor.ts
// Purpose: Redact secrets and normalize paths during export using `tools/whitelist.json`.

import fs from 'node:fs'
import path from 'node:path'

interface WhiteList {
  version: number
  paths: { allow: string[]; deny: string[] }
  extensions: { allow: string[]; deny: string[] }
  fields: Record<string, string[]> // e.g., { 'news.manifest': ['id','date',...] }
  redact: { patterns: { type: 'regex'; pattern: string; replacement: string }[] }
  links?: { external_allowlist?: string[]; require_https?: boolean }
  limits?: { max_file_size_kb?: number; max_items_per_manifest?: number }
}

function loadWhitelist(root: string): WhiteList {
  const file = path.join(root, 'tools', 'whitelist.json')
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw) as WhiteList
}

function isAllowedExtension(p: string, wl: WhiteList) {
  const ext = path.extname(p).toLowerCase()
  return wl.extensions.allow.includes(ext) && !wl.extensions.deny.includes(ext)
}

function globLikeToRegex(pat: string): RegExp {
  // very small glob → regex: ** → .*, * → [^/]*
  const esc = pat.replace(/[.+^${}()|[\]\\]/g, (r) => `\\${r}`)
  const rx = esc.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
  return new RegExp('^' + rx + '$')
}

function isAllowedPath(rel: string, wl: WhiteList) {
  const allow = wl.paths.allow.map(globLikeToRegex)
  const deny = wl.paths.deny.map(globLikeToRegex)
  if (!allow.some((rx) => rx.test(rel))) return false
  if (deny.some((rx) => rx.test(rel))) return false
  return true
}

function redactContent(text: string, wl: WhiteList): string {
  let out = text
  for (const r of wl.redact.patterns) {
    if (r.type !== 'regex') continue
    const re = new RegExp(r.pattern, 'g')
    out = out.replace(re, r.replacement)
  }
  return out
}

function normalizeLinks(text: string, wl: WhiteList): string {
  if (!wl.links) return text
  let out = text
  if (wl.links.require_https) {
    out = out.replace(/http:\/\//g, 'https://')
  }
  // optional: enforce allowlist (lightweight)
  if (wl.links.external_allowlist && wl.links.external_allowlist.length) {
    // Replace href/src that point to external domains not on allowlist with '#'
    out = out.replace(/(href|src)=("|')(https?:\/\/[^"']+)(\2)/g, (m, attr, q, url, q2) => {
      try {
        const u = new URL(url)
        const ok = wl.links!.external_allowlist!.some((base) => url.startsWith(base))
        return ok ? m : `${attr}=${q}#${q2}`
      } catch {
        return m
      }
    })
  }
  return out
}

export function processFile(rel: string, abs: string, wl: WhiteList): { ok: boolean; reason?: string; content?: Buffer } {
  if (!isAllowedPath(rel, wl)) return { ok: false, reason: 'path not allowed' }
  if (!isAllowedExtension(rel, wl)) return { ok: false, reason: 'ext not allowed' }

  const buf = fs.readFileSync(abs)
  if (wl.limits?.max_file_size_kb && buf.length > wl.limits.max_file_size_kb * 1024) {
    return { ok: false, reason: 'file too large' }
  }

  // Only redact text-like files
  const ext = path.extname(rel).toLowerCase()
  const textLike = ['.json', '.html', '.htm', '.md', '.txt', '.svg'].includes(ext)
  if (!textLike) return { ok: true, content: buf }

  let text = buf.toString('utf-8')
  text = redactContent(text, wl)
  text = normalizeLinks(text, wl)
  return { ok: true, content: Buffer.from(text, 'utf-8') }
}

export function walkData(root: string): string[] {
  const base = path.join(root, 'public', 'data')
  if (!fs.existsSync(base)) return []
  const out: string[] = []
  const stack = ['']
  while (stack.length) {
    const rel = stack.pop()!
    const abs = path.join(base, rel)
    const st = fs.statSync(abs)
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(abs)) {
        stack.push(path.join(rel, name))
      }
    } else {
      out.push(rel.replace(/^\\+|^\/+/, ''))
    }
  }
  return out.sort()
}

export function redactExport(root = process.cwd()) {
  const wl = loadWhitelist(root)
  const files = walkData(root)
  const outDir = path.join(root, 'export', 'data')
  fs.mkdirSync(outDir, { recursive: true })

  const results: { rel: string; ok: boolean; reason?: string }[] = []

  for (const rel of files) {
    const abs = path.join(root, 'public', 'data', rel)
    const r = processFile(rel, abs, wl)
    results.push({ rel, ok: r.ok, reason: r.reason })
    if (!r.ok || !r.content) continue
    const dst = path.join(outDir, rel)
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.writeFileSync(dst, r.content)
  }

  // Write manifest of export
  const manifestPath = path.join(root, 'export', 'manifest.json')
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, JSON.stringify({ at: new Date().toISOString(), files: results }, null, 2))

  return results
}

if (require.main === module) {
  const res = redactExport()
  // eslint-disable-next-line no-console
  console.log(`[redactor] processed ${res.length} files`)
}

