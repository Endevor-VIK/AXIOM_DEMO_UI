import { describe, it, expect } from 'vitest'
import { createVfs } from '@/lib/vfs'

function mockFetch(map: Record<string, unknown | string>) {
  globalThis.fetch = (async (url: any) => {
    const u = String(url)
    if (!(u in map)) return new Response('not found', { status: 404 })
    const val = map[u]
    if (typeof val === 'string') {
      return new Response(val, { status: 200, headers: { 'content-type': 'text/plain' } })
    }
    return new Response(JSON.stringify(val), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as any
}

describe('VFS', () => {
  it('disallows path traversal', async () => {
    const vfs = createVfs({ base: 'data/' })
    await expect(vfs.json('..\\secrets.json')).rejects.toThrow()
    await expect(vfs.text('/abs.txt')).rejects.toThrow()
  })

  it('reads json and text with cache', async () => {
    const vfs = createVfs({ base: 'data/' })
    mockFetch({
      'data/index.json': { ok: true },
      'data/readme.txt': 'Hello',
    })
    const a = await vfs.json<{ ok: boolean }>('index.json')
    const b = await vfs.text('readme.txt')
    expect(a.ok).toBe(true)
    expect(b).toBe('Hello')

    mockFetch({ 'data/index.json': { ok: false }, 'data/readme.txt': 'Changed' })
    const a2 = await vfs.json<{ ok: boolean }>('index.json')
    const b2 = await vfs.text('readme.txt')
    expect(a2.ok).toBe(true)
    expect(b2).toBe('Hello')

    vfs.clearCache()
    const a3 = await vfs.json<{ ok: boolean }>('index.json', { force: true })
    expect(a3.ok).toBe(false)
  })

  it('validates news manifest', async () => {
    const vfs = createVfs({ base: 'data/' })
    mockFetch({
      'data/news/manifest.json': [
        { id: 'a', date: '2025-01-01', title: 'A', kind: 'update' },
        { id: 'b', date: '2025-02-01', title: 'B', kind: 'release', tags: ['ui'], summary: 'x', link: '/l' },
      ],
    })
    const arr = await vfs.readNewsManifest()
    expect(arr.length).toBe(2)
    expect(arr[0]!.id).toBe('b')
  })

  it('aggregates content manifest and reads lore index', async () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'category', 'title', 'date', 'file', 'format', 'status', 'meta'],
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string' },
          file: { type: 'string' },
          format: { type: 'string' },
          status: { type: 'string' },
          meta: { type: 'object' },
        },
      },
    }

    mockFetch({
      'data/content/_schema/content.schema.json': schema,
      'data/content/manifest.json': [
        {
          id: 'LOC-1',
          category: 'locations',
          title: 'Base',
          date: '2025-01-01',
          file: 'locations/base.html',
          format: 'html',
          status: 'published',
          meta: { v: 2 },
        },
        {
          id: 'EVT-1',
          category: 'events',
          title: 'Launch',
          date: '2025-02-01',
          file: 'events/launch.html',
          format: 'html',
          status: 'published',
          meta: { v: 2 },
        },
      ],
      'data/content/lore/_index.json': {
        id: 'ROOT',
        title: 'Root',
        children: [{ id: 'ARC', title: 'Arc', path: 'arc' }],
      },
      'data/content/lore/arc/_index.json': {
        id: 'ARC',
        title: 'Arc',
        children: [],
      },
    })

    const vfs = createVfs({ base: 'data/' })
    vfs.clearCache()
    const aggregate = await vfs.readContentAggregate()
    expect(aggregate.items.length).toBe(2)
    expect(aggregate.categories.events.count).toBe(1)
    expect(aggregate.lore.index).toBe('content/lore/_index.json')

    const itemList = await vfs.readContentManifest()
    const itemIds = itemList.map((entry) => entry.id).sort()
    const loreNode = await vfs.readLoreIndex('lore/arc/_index.json')
    expect(itemIds).toEqual(['EVT-1', 'LOC-1'].sort())
    expect(loreNode.id).toBe('ARC')
  })

  it('builds aggregate from category manifests when version is 2', async () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'category', 'title', 'date', 'file', 'format', 'status', 'meta'],
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string' },
          file: { type: 'string' },
          format: { type: 'string' },
          status: { type: 'string' },
          meta: { type: 'object' },
        },
      },
    }

    mockFetch({
      'data/content/_schema/content.schema.json': schema,
      'data/content/manifest.json': {
        meta: { version: 2, generatedAt: '2025-09-22T00:00:00Z' },
        items: [
          {
            id: 'CHR-001',
            category: 'characters',
            title: 'Legacy Viktor',
            date: '2025-09-01',
            file: 'characters/legacy.md',
            format: 'md',
            status: 'published',
            meta: { v: 2 },
          },
        ],
        categories: {
          characters: { manifest: 'content/characters/manifest.json', count: 99 },
          locations: { manifest: 'content/locations/manifest.json', count: 0 },
          technologies: { manifest: 'content/technologies/manifest.json', count: 0 },
          factions: { manifest: 'content/factions/manifest.json', count: 0 },
          events: { manifest: 'content/events/manifest.json', count: 0 },
        },
        lore: { index: 'content/lore/_index.json', roots: [] },
      },
      'data/content/characters/manifest.json': [
        {
          id: 'CHR-001',
          category: 'characters',
          title: 'Viktor',
          date: '2025-09-25',
          file: 'characters/viktor.md',
          format: 'md',
          status: 'published',
          meta: { v: 2 },
          weight: 10,
        },
        {
          id: 'CHR-002',
          category: 'characters',
          title: 'Axiom',
          date: '2025-09-20',
          file: 'characters/axiom.md',
          format: 'md',
          status: 'published',
          meta: { v: 2 },
          weight: 5,
        },
      ],
      'data/content/locations/manifest.json': [
        {
          id: 'LOC-001',
          category: 'locations',
          title: 'Hub',
          date: '2025-09-06',
          file: 'locations/hub.html',
          format: 'html',
          status: 'published',
          meta: { v: 2 },
          weight: 1,
        },
      ],
      'data/content/technologies/manifest.json': [],
      'data/content/factions/manifest.json': [],
      'data/content/events/manifest.json': [],
      'data/content/lore/_index.json': {
        id: 'ROOT',
        title: 'Root',
        children: [],
      },
    })

    const vfs = createVfs({ base: 'data/' })
    vfs.clearCache()
    const aggregate = await vfs.readContentAggregate()
    expect(aggregate.meta.version).toBe(2)
    expect(aggregate.items.map((entry) => entry.id)).toEqual(['CHR-001', 'CHR-002', 'LOC-001'])
    expect(aggregate.categories.characters.count).toBe(2)
    expect(aggregate.categories.locations.count).toBe(1)
    expect(aggregate.categories.characters.manifest).toBe('content/characters/manifest.json')
    const viktor = aggregate.items.find((entry) => entry.id === 'CHR-001')
    expect(viktor?.title).toBe('Viktor')
    expect(viktor?.date).toBe('2025-09-25')
  })

  it('rejects invalid content manifests via schema', async () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'category', 'title', 'date', 'file', 'format', 'status', 'meta'],
      },
    }

    mockFetch({
      'data/content/_schema/content.schema.json': schema,
      'data/content/manifest.json': [
        {
          id: 'LOC-1',
          category: 'locations',
          title: 'Broken',
          date: '2025-01-01',
          file: 'locations/base.html',
          format: 'html',
          meta: { v: 2 },
        },
      ],
    })

    const vfs = createVfs({ base: 'data/' })
    vfs.clearCache()
    await expect(vfs.readContentAggregate()).rejects.toThrow()
  })
})


