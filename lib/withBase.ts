export function withBase(p: string) {
  const anyMeta: any = (import.meta as any);
  const base = anyMeta?.env?.BASE_URL ?? anyMeta?.env?.BASE ?? (import.meta as any).env?.BASE_URL ?? '/';
  const baseNorm = String(base || '/').replace(/\/*$/, '/');
  return baseNorm + String(p || '').replace(/^\/+/, '');
}

