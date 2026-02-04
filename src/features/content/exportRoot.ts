function resolveExportRoot(): string {
  const raw = ((import.meta as any)?.env?.AXS_EXPORT_ROOT as string | undefined)?.trim()
  const fallback = '/app/content'
  const base = raw || fallback
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export function getExportRoot(): string {
  return resolveExportRoot()
}

export function withExportPath(rel: string): string {
  const base = resolveExportRoot()
  const cleaned = rel.startsWith('/') ? rel.slice(1) : rel
  return `${base}/${cleaned}`
}
