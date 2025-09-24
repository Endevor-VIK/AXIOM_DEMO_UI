export function safeText(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (!cleaned || cleaned.toLowerCase() === 'undefined' || cleaned.toLowerCase() === 'nan') {
      return fallback;
    }
    if (/^[\W_]+$/.test(cleaned)) return fallback;
    return cleaned;
  }
  try {
    const stringified = String(value).trim();
    return stringified ? stringified : fallback;
  } catch {
    return fallback;
  }
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return '—';
  }
}

export function classNames(...tokens: Array<string | false | null | undefined>): string {
  return tokens.filter(Boolean).join(' ');
}

export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
  // Only visible elements
  return nodes.filter((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}
