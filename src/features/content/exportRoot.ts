import { withBasePath } from './utils'

function resolveExportRoot(): string | null {
  const raw = ((import.meta as any)?.env?.AXS_EXPORT_ROOT as string | undefined)?.trim()
  if (!raw) return null
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export function getExportRoot(): string | null {
  return resolveExportRoot()
}

export function withExportPath(rel: string): string {
  const base = resolveExportRoot()
  if (!base) {
    return withBasePath(rel)
  }
  const cleaned = rel.startsWith('/') ? rel.slice(1) : rel
  return `${base}/${cleaned}`
}
