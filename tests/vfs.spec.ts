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

