
const SCHEME_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const PROTOCOL_RELATIVE_REGEX = /^\/\//;

function ensureTrailingSlash(value: string): string {
  if (!value) return '/';
  return value.endsWith('/') ? value : `${value}/`;
}

function safeOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost';
}

function toAbsoluteProtocol(value: string, origin: string): string {
  if (value.startsWith('//')) {
    const protocol = typeof window !== 'undefined' && window.location?.protocol ? window.location.protocol : 'https:';
    return `${protocol}${value}`;
  }
  if (value.startsWith('/')) {
    const normalizedOrigin = origin.endsWith('/') ? origin : `${origin}/`;
    return `${normalizedOrigin.replace(/\/$/, '')}${value}`;
  }
  return value;
}

function createBaseUrl(dataBase: string, assetsBase?: string | null): { baseUrl: URL; origin: string } {
  const origin = safeOrigin();
  const originWithSlash = origin.endsWith('/') ? origin : `${origin}/`;
  const normalizedDataBase = dataBase ? ensureTrailingSlash(dataBase) : './';
  const dataUrl = new URL(normalizedDataBase, originWithSlash);

  if (assetsBase && assetsBase.trim()) {
    const trimmed = assetsBase.trim();
    if (SCHEME_REGEX.test(trimmed)) {
      return { baseUrl: new URL(ensureTrailingSlash(trimmed)), origin };
    }

    if (PROTOCOL_RELATIVE_REGEX.test(trimmed) || trimmed.startsWith('/')) {
      const absolute = toAbsoluteProtocol(ensureTrailingSlash(trimmed), origin);
      return { baseUrl: new URL(absolute), origin };
    }

    if (normalizedDataBase !== './' && trimmed.startsWith(normalizedDataBase)) {
      const absolutePath = ensureTrailingSlash(trimmed);
      return { baseUrl: new URL(absolutePath, originWithSlash), origin };
    }

    const relativeTarget = ensureTrailingSlash(trimmed);
    return { baseUrl: new URL(relativeTarget, dataUrl), origin };
  }

  return { baseUrl: dataUrl, origin };
}

function formatResolvedUrl(url: URL, origin: string): string {
  if (url.origin === origin) {
    const path = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    return `${path}${url.search}${url.hash}`;
  }

  return url.toString();
}

function shouldSkipAsset(value: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '#') return true;
  if (trimmed.startsWith('#')) return true;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return true;
  if (PROTOCOL_RELATIVE_REGEX.test(trimmed)) return true;
  if (SCHEME_REGEX.test(trimmed)) return true;
  return false;
}

function rewriteUrl(value: string | null, baseUrl: URL, origin: string): string | null {
  if (!value || shouldSkipAsset(value)) {
    return null;
  }

  try {
    const resolved = new URL(value, baseUrl);
    return formatResolvedUrl(resolved, origin);
  } catch (error) {
    return null;
  }
}

function rewriteWithDomParser(html: string, baseUrl: URL, origin: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('[src],[href]').forEach((el) => {
    const attr = el.hasAttribute('src') ? 'src' : 'href';
    const current = el.getAttribute(attr);
    const next = rewriteUrl(current, baseUrl, origin);
    if (next) {
      el.setAttribute(attr, next);
    }
  });
  return doc.body.innerHTML;
}

const FALLBACK_PATTERN = /(\s(?:src|href))=("|')(.*?)(\2)/gi;

function rewriteWithRegex(html: string, baseUrl: URL, origin: string): string {
  return html.replace(FALLBACK_PATTERN, (match, prefix, quote, value) => {
    const next = rewriteUrl(value, baseUrl, origin);
    if (!next) return match;
    return `${prefix}=${quote}${next}${quote}`;
  });
}

export function resolveAssets(html: string, assetsBase: string | null | undefined, dataBase: string): string {
  if (!html || (!html.includes('src=') && !html.includes('href='))) {
    return html;
  }

  const { baseUrl, origin } = createBaseUrl(dataBase, assetsBase);

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    return rewriteWithDomParser(html, baseUrl, origin);
  }

  return rewriteWithRegex(html, baseUrl, origin);
}

export function deriveAssetsBase(
  item: { assetsBase?: string | null; file?: string | null },
  fallback?: string,
): string | undefined {
  if (item.assetsBase) {
    return item.assetsBase;
  }
  const file = item.file ?? fallback;
  if (!file) return undefined;
  const index = file.lastIndexOf('/');
  if (index === -1) {
    return '';
  }
  return file.slice(0, index + 1);
}
