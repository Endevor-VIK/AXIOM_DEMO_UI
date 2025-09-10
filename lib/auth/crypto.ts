// AXIOM_DEMO_UI — WEB CORE
// Canvas: C12 — lib/auth/crypto.ts
// Purpose: Password hashing & verification via WebCrypto (PBKDF2 + SHA-256).
// NOTE: This is PUBLIC demo crypto. For PRO, use server-side hashing with per-user salt & strong params.

export function isCryptoReady(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    // Secure context required for WebCrypto in most browsers
    const sc = (window as any).isSecureContext;
    const subtle = typeof crypto !== 'undefined' && !!(crypto as any)?.subtle;
    return !!sc && !!subtle;
  } catch {
    return false;
  }
}

