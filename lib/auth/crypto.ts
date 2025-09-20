// lib/auth/crypto.ts
// Minimal, safe-for-demo crypto helpers.
// Do NOT use the insecure fallback in production.

export type HashedPassword = string
export function isCryptoReady(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      !!(window.isSecureContext && (window.crypto as any)?.subtle)
    );
  } catch (_) {
    return false;
  }
}

/**
 * Returns SHA-256 of the input as a hex string.
 * In insecure contexts where WebCrypto isn't available, uses a simple
 * 32-bit hash fallback so demo login does not crash. Only for local/demo!
 */
export async function hashPassword(password: string): Promise<HashedPassword> {
  const enc = new TextEncoder();
  const data = enc.encode(password ?? '');

  if (isCryptoReady()) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // DEV fallback (only for demo): primitive 32-bit hash -> hex(8)
  let h = 0;
  for (const b of data) h = ((h << 5) - h + b) | 0;
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

/**
 * Compares a plain password with an expected hex hash using the same
 * hashing method available in the current context. Returns true if equal.
 */
export async function verifyPassword(password: string, expectedHex: HashedPassword): Promise<boolean> {
  try {
    if (typeof expectedHex !== 'string' || expectedHex.length === 0) return false;
    const actual = await hashPassword(password);
    // timing-safe-ish comparison without early return
    const a = actual;
    const b = expectedHex;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  } catch (_) {
    return false;
  }
}
