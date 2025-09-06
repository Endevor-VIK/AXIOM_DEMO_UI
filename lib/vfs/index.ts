// AXIOM_DEMO_UI — WEB CORE
// Canvas: C09 — lib/vfs/index.ts
// Purpose: Read-only VFS layer for static data snapshots under /data.
//          Provides small cache, safe path guards, helpers for common manifests (audits/content/news).

export type Json = unknown;

export type FetchOptions = {
  /** bypass cache if true */ force?: boolean;
  /** expected content-type startsWith check (e.g., 'application/json') */ expect?: 'json' | 'text' | 'html';
};

export interface VfsConfig {
  /** base URL relative to app root, defaults to 'data/' */ base?: string;
}

export interface VfsApi {
  /** Read arbitrary JSON under /data */ json<T = Json>(relPath: string, opts?: FetchOptions): Promise<T>;
  /** Read arbitrary text (md/html/txt) under /data */ text(relPath: string, opts?: FetchOptions): Promise<string>;
  /** Convenience: read core snapshots */
  readIndex<T = Json>(opts?: FetchOptions): Promise<T>;
  readObjects<T = Json>(opts?: FetchOptions): Promise<T>;
  readLogs<T = Json>(opts?: FetchOptions): Promise<T>;
  /** Manifests */
  readAuditsManifest(opts?: FetchOptions): Promise<ManifestItem[]>;
  readContentManifest(opts?: FetchOptions): Promise<ManifestItem[]>;
  readNewsManifest(opts?: FetchOptions): Promise<NewsItem[]>;
  /** Raw fetch with base applied (no content-type checks) */
  fetchRaw(relPath: string, init?: RequestInit): Promise<Response>;
  /** Clear in-memory cache */
  clearCache(): void;
}

export interface ManifestItem {
  title?: string;
  date?: string; // ISO-like
  file?: string; // relative path under data/
  [k: string]: unknown;
}

export type NewsKind = 'update' | 'release' | 'roadmap' | 'heads-up';

export interface NewsItem {
  id: string;
  date: string;   // YYYY-MM-DD
  title: string;
  kind: NewsKind;
  tags?: string[];
  summary?: string;
  link?: string;  // deeplink within app
}

/** Lightweight in-memory cache */
const cache = new Map<string, unknown>();

export class VfsError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

function ensureTrailingSlash(s: string): string { return s.endsWith('/') ? s : s + '/'; }
function stripLeadingSlash(s: string): string { return s.startsWith('/') ? s.slice(1) : s; }
function disallowTraversal(rel: string): void {
  if (rel.includes('..') || rel.startsWith('/') || rel.startsWith('\\')) {
    throw new VfsError(`[VFS] Illegal relative path: ${rel}`);
  }
}

function makeBase(config?: VfsConfig): string {
  const envBase = (import.meta as any)?.env?.VITE_DATA_BASE as string | undefined; // optional override
  const base = config?.base ?? envBase ?? 'data/';
  return ensureTrailingSlash(stripLeadingSlash(base));
}

function joinBase(base: string, rel: string): string {
  disallowTraversal(rel);
  return base + rel;
}

async function fetchExpect(url: string, kind: NonNullable<FetchOptions['expect']>, init?: RequestInit) {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) throw new VfsError(`[VFS] HTTP ${res.status} for ${url}`);
  const ct = res.headers.get('content-type') || '';
  if (kind === 'json' && !ct.startsWith('application/json')) {
    // allow empty type on GitHub Pages for json
    if (ct && !ct.includes('json')) throw new VfsError(`[VFS] Unexpected content-type ${ct} for ${url}`);
  }
  if (kind === 'html' && !ct.includes('html') && !ct.includes('text/')) {
    throw new VfsError(`[VFS] Unexpected content-type ${ct} for ${url}`);
  }
  if (kind === 'text' && !ct.startsWith('text/') && !ct.includes('html') && !ct.includes('xml')) {
    // best-effort
  }
  return res;
}

function key(base: string, rel: string) { return `vfs:${base}${rel}`; }

export function createVfs(config?: VfsConfig): VfsApi {
  const base = makeBase(config);

  async function json<T = Json>(relPath: string, opts?: FetchOptions): Promise<T> {
    const k = key(base, relPath);
    if (!opts?.force && cache.has(k)) return cache.get(k) as T;
    const url = joinBase(base, relPath);
    const res = await fetchExpect(url, 'json');
    const data = (await res.json()) as T;
    cache.set(k, data);
    return data;
  }

  async function text(relPath: string, opts?: FetchOptions): Promise<string> {
    const k = key(base, relPath);
    if (!opts?.force && cache.has(k)) return cache.get(k) as string;
    const url = joinBase(base, relPath);
    const res = await fetchExpect(url, 'text');
    const data = await res.text();
    cache.set(k, data);
    return data;
  }

  async function fetchRaw(relPath: string, init?: RequestInit): Promise<Response> {
    const url = joinBase(base, relPath);
    return fetch(url, { cache: 'no-store', ...init });
  }

  // Core snapshots
  const readIndex = <T = Json>(opts?: FetchOptions) => json<T>('index.json', opts);
  const readObjects = <T = Json>(opts?: FetchOptions) => json<T>('objects.json', opts);
  const readLogs = <T = Json>(opts?: FetchOptions) => json<T>('logs.json', opts);

  // Manifests
  const readAuditsManifest = (opts?: FetchOptions) => json<ManifestItem[]>('audits/manifest.json', opts);
  const readContentManifest = (opts?: FetchOptions) => json<ManifestItem[]>('content/manifest.json', opts);
  const readNewsManifest = async (opts?: FetchOptions) => {
    const items = await json<unknown>('news/manifest.json', opts);
    return validateNewsArray(items);
  };

  function clearCache() { cache.clear(); }

  return { json, text, readIndex, readObjects, readLogs, readAuditsManifest, readContentManifest, readNewsManifest, fetchRaw, clearCache };
}

/** Runtime guard for News manifest */
function isString(x: unknown): x is string { return typeof x === 'string'; }
function isStringArray(x: unknown): x is string[] { return Array.isArray(x) && x.every(isString); }

function validateNewsArray(data: unknown): NewsItem[] {
  if (!Array.isArray(data)) throw new VfsError('[VFS] news/manifest.json is not an array');
  const out: NewsItem[] = [];
  for (const it of data) {
    if (typeof it !== 'object' || it == null) throw new VfsError('[VFS] news item is not an object');
    const obj = it as Record<string, unknown>;
    const id = obj.id; const date = obj.date; const title = obj.title; const kind = obj.kind; const tags = obj.tags; const summary = obj.summary; const link = obj.link;
    if (!isString(id) || !isString(date) || !isString(title) || !isString(kind)) {
      throw new VfsError('[VFS] news item missing required fields (id/date/title/kind)');
    }
    if (tags != null && !isStringArray(tags)) throw new VfsError('[VFS] news.tags must be string[]');
    if (summary != null && !isString(summary)) throw new VfsError('[VFS] news.summary must be string');
    if (link != null && !isString(link)) throw new VfsError('[VFS] news.link must be string');
    // kind check (soft)
    const okKinds: NewsKind[] = ['update','release','roadmap','heads-up'];
    if (!okKinds.includes(kind as NewsKind)) throw new VfsError(`[VFS] news.kind must be one of ${okKinds.join(', ')}`);
    const item: NewsItem = { id, date, title, kind: kind as NewsKind };
    if (tags != null) item.tags = tags as string[];
    if (summary != null) item.summary = summary as string;
    if (link != null) item.link = link as string;
    out.push(item);
  }
  // Sort desc by date by default (YYYY-MM-DD assumed)
  out.sort((a,b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

// Default instance for convenience
export const vfs = createVfs();
