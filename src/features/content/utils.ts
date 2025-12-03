function resolveBase(): string {
  // Prefer the runtime <base> (GitHub Pages sets absolute URL)
  if (typeof document !== 'undefined') {
    const baseEl = document.querySelector('base')
    if (baseEl?.href) {
      try {
        const url = new URL(baseEl.href)
        return url.pathname || '/'
      } catch {
        // fall through
      }
    }
  }

  // Fallback to Vite’s compile-time BASE_URL
  const fromEnv = ((import.meta as any)?.env?.BASE_URL as string | undefined) ?? '/'
  return fromEnv
}

export function withBasePath(rel: string): string {
  const base = resolveBase()
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const cleaned = rel.startsWith('/') ? rel.slice(1) : rel
  return `${normalizedBase}/${cleaned}`
}
