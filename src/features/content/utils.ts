export function withBasePath(rel: string): string {
  const base = ((import.meta as any)?.env?.BASE_URL as string | undefined) ?? '/'
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const cleaned = rel.startsWith('/') ? rel.slice(1) : rel
  return `${normalizedBase}/${cleaned}`
}
