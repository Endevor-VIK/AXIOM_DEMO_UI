// AXIOM_DEMO_UI — WEB CORE
// Canvas: C32 — tests/news.spec.ts
// Purpose: Tests for News schema (types/guards) and News provider (find/byId/limit).
// Runner: Vitest (integrate in project config before running)

import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock VFS for news provider -------------------------------------------
// We keep dataset mutable to tweak it per test.
const state = {
  data: [
    { id: '4', date: '2025-02-20', title: 'Heads up: breaking change', kind: 'heads-up', summary: '...' },
    { id: '2', date: '2025-02-15', title: 'Bravo', kind: 'release', tags: ['core'] },
    { id: '3', date: '2025-02-10', title: 'Roadmap posted', kind: 'roadmap', tags: ['roadmap'] },
    { id: '1', date: '2025-01-01', title: 'Alpha', kind: 'update', tags: ['ui'] }
  ] as any[],
};

vi.mock('@/lib/vfs', () => ({
  vfs: {
    readNewsManifest: vi.fn(async () => state.data),
  },
}));

import { news } from '@/lib/news';
import { newsKinds, isNewsRecord, NewsJsonSchema, type NewsRecord } from '@/lib/news/schema';

// --- Tests -----------------------------------------------------------------

describe('News schema', () => {
  it('exposes supported kinds', () => {
    expect(newsKinds).toEqual(['update', 'release', 'roadmap', 'heads-up']);
  });

  it('runtime guard isNewsRecord works', () => {
    const good: NewsRecord = { id: 'x', date: '2025-09-06', title: 'ok', kind: 'update' };
    const bad: any = { id: 1, date: 20250906 };
    expect(isNewsRecord(good)).toBe(true);
    expect(isNewsRecord(bad)).toBe(false);
  });

  it('JSON schema kind enum matches newsKinds', () => {
    // schema typing uses any, so cast for comparison
    expect((NewsJsonSchema as any).items.properties.kind.enum).toEqual(newsKinds);
  });
});


describe('News provider', () => {
  beforeEach(() => {
    // Reset dataset (already sorted DESC by date)
    state.data = [
      { id: '4', date: '2025-02-20', title: 'Heads up: breaking change', kind: 'heads-up', summary: '...' },
      { id: '2', date: '2025-02-15', title: 'Bravo', kind: 'release', tags: ['core'] },
      { id: '3', date: '2025-02-10', title: 'Roadmap posted', kind: 'roadmap', tags: ['roadmap'] },
      { id: '1', date: '2025-01-01', title: 'Alpha', kind: 'update', tags: ['ui'] },
    ];
  });

  it('all() returns full list', async () => {
    const arr = await news.all();
    expect(arr.map(x => x.id)).toEqual(['4','2','3','1']);
  });

  it('find() filters by kind', async () => {
      const rel = await news.find({ kind: 'release' });
      expect(rel).toHaveLength(1);
      expect(rel[0]!.id).toBe('2');
  });

  it('find() applies free-text search', async () => {
    const res = await news.find({ q: 'roadmap' });
    expect(res.map(x => x.id)).toEqual(['3']);
  });

  it('find() respects limit', async () => {
    const res = await news.find({ limit: 2 });
    expect(res.map(x => x.id)).toEqual(['4','2']);
  });

  it('byId() returns matching item', async () => {
    const it = await news.byId('2');
    expect(it?.title).toBe('Bravo');
  });
});
