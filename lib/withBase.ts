export function withBase(p: string) {
  const base = (import.meta as any)?.env?.BASE_URL ?? import.meta.env.BASE_URL ?? '/';
  const baseNorm = String(base || '/').endsWith('/') ? String(base) : String(base) + '/';
  return baseNorm + String(p || '').replace(/^\//, '');
}

