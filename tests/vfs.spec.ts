// AXIOM_DEMO_UI — WEB CORE
// Canvas: C31 — tests/vfs.spec.ts
// Purpose: Basic runtime tests for VFS utilities (path guards, news validation, cache).
// Note: This is a lightweight test file; integrate with your chosen runner (Vitest/Jest) later.

import { describe, it, expect } from 'vitest';
import { createVfs } from '@/lib/vfs';

// Mock fetch for unit tests
function mockFetch(map: Record<string, any>){
  globalThis.fetch = (async (url: any) => {
    const u = String(url);
    if (!(u in map)) return new Response('not found', { status: 404 });
    const val = map[u];
    const body = typeof val === 'string' ? val : JSON.stringify(val);
    const ct = typeof val === 'string' ? 'text/plain' : 'application/json';
    return new Response(body, { status: 200, headers: { 'content-type': ct } });
  }) as any;
}

describe('VFS', () => {
  it('disallows path traversal', async () => {
    const vfs = createVfs({ base: 'data/' });
    await expect(vfs.json('../secrets.json')).rejects.toThrow();
    await expect(vfs.text('/abs.txt')).rejects.toThrow();
  });

  it('reads json and text with cache', async () => {
    const vfs = createVfs({ base: 'data/' });
    mockFetch({
      'data/index.json': { ok: true },
      'data/readme.txt': 'Hello',
    });
    const a = await vfs.json<any>('index.json');
    const b = await vfs.text('readme.txt');
    expect(a.ok).toBe(true);
    expect(b).toBe('Hello');

    // Mutate mock to prove cache works
    mockFetch({ 'data/index.json': { ok: false }, 'data/readme.txt': 'Changed' });
    const a2 = await vfs.json<any>('index.json');
    const b2 = await vfs.text('readme.txt');
    expect(a2.ok).toBe(true); // still cached
    expect(b2).toBe('Hello');

    vfs.clearCache();
    const a3 = await vfs.json<any>('index.json', { force: true });
    expect(a3.ok).toBe(false);
  });

  it('validates news manifest', async () => {
    const vfs = createVfs({ base: 'data/' });
    mockFetch({
      'data/news/manifest.json': [
        { id: 'a', date: '2025-01-01', title: 'A', kind: 'update' },
        { id: 'b', date: '2025-02-01', title: 'B', kind: 'release', tags: ['ui'], summary: 'x', link: '/l' }
      ]
    });
    const arr = await vfs.readNewsManifest();
    expect(arr.length).toBe(2);
    expect(arr[0]!.id).toBe('b');
  });
});
