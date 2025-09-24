// Все html из статической папки маппим как строку (raw)
export const ROADMAP_HTML = import.meta.glob('/app/static/roadmap/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const AUDIT_HTML = import.meta.glob('/app/static/audits/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Поиск по хвосту пути (без жёсткой привязки к абсолютному ключу)
export function getHtml(map: Record<string, string>, endsWith: string) {
  const key = Object.keys(map).find((k) => k.endsWith(endsWith));
  return key ? map[key] : null;
}

// Новое: проверка, есть ли что отрисовывать (игнорим только-комментарии/doctype/пробелы)
export function isRenderableHtml(src?: string | null) {
  if (!src) return false;
  const stripped = src
    .replace(/<!--[\s\S]*?-->/g, '') // comments
    .replace(/<!DOCTYPE[^>]*>/gi, '') // doctype
    .trim();
  return stripped.length > 0;
}

// Новое: утилита для базового URL
export function ensureTrailingSlash(s: string) {
  return s.endsWith('/') ? s : s + '/';
}
