// AXIOM_DEMO_UI — WEB CORE
// Canvas: C12 — lib/auth/crypto.ts
// Purpose: Password hashing & verification via WebCrypto (PBKDF2 + SHA-256).

// NOTE: This is PUBLIC demo crypto. For PRO, use server-side hashing with per-user salt & strong params.

const TEXT = 'utf-8';
const ITERATIONS = 120_000; // balanced for web; tune in PRO
const KEYLEN = 32;          // 256-bit derived key
const DIGEST = 'SHA-256';

export interface HashedPassword {
  /** base64 salt */ s: string;
  /** base64 derived key */ k: string;
  /** iterations */ i: number;
  /** digest alg */ d: 'SHA-256';
}

function getSubtle(){
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('[auth/crypto] WebCrypto not available');
  return subtle;
}

function toBytes(s: string){ return new TextEncoder().encode(s); }
function b64(b: ArrayBuffer){ return btoa(String.fromCharCode(...new Uint8Array(b))); }
function fromB64(s: string){ return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

export async function hashPassword(password: string): Promise<HashedPassword>{
  const subtle = getSubtle();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await subtle.importKey('raw', toBytes(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: DIGEST, iterations: ITERATIONS, salt }, keyMaterial, KEYLEN*8);
  return { s: b64(salt), k: b64(bits), i: ITERATIONS, d: 'SHA-256' };
}

export async function verifyPassword(password: string, hashed: HashedPassword): Promise<boolean>{
  const subtle = getSubtle();
  const salt = fromB64(hashed.s);
  const keyMaterial = await subtle.importKey('raw', toBytes(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: hashed.d, iterations: hashed.i, salt }, keyMaterial, KEYLEN*8);
  const k = b64(bits);
  // timing-safe-ish compare
  return k.length === hashed.k.length && crypto.timingSafeEqual ?
    crypto.timingSafeEqual(toBytes(k), toBytes(hashed.k)) :
    k === hashed.k;
}
