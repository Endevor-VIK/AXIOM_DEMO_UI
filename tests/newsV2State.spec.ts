import { describe, it, expect } from 'vitest'

import { countNewSince, newsV2Keys, readIdSet, writeIdSet } from '@/lib/news/v2State'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()

  get length() {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

describe('newsV2Keys', () => {
  it('namespaces by userId when present', () => {
    expect(newsV2Keys('u1')).toEqual({
      lastSeenAt: 'news.u1.last_seen_at',
      readIds: 'news.u1.read_ids',
      pinnedIds: 'news.u1.pinned_ids',
    })
  })

  it('falls back to global keys when userId missing', () => {
    expect(newsV2Keys(null)).toEqual({
      lastSeenAt: 'news.last_seen_at',
      readIds: 'news.read_ids',
      pinnedIds: 'news.pinned_ids',
    })
  })
})

describe('id sets', () => {
  it('roundtrips a set of ids through Storage', () => {
    const storage = new MemoryStorage()
    const keys = newsV2Keys('u1')

    writeIdSet(storage, keys.readIds, new Set(['a', 'b']))
    expect(Array.from(readIdSet(storage, keys.readIds)).sort()).toEqual(['a', 'b'])
  })
})

describe('countNewSince', () => {
  it('counts all items as new when lastSeenAt missing', () => {
    const items = [
      { date: '2025-01-01' },
      { date: '2025-02-01' },
      { date: null },
    ]
    expect(countNewSince(items, null)).toBe(2)
  })

  it('counts items strictly newer than lastSeenAt', () => {
    const items = [
      { date: '2025-01-01' },
      { date: '2025-02-01' },
      { date: '2025-03-01' },
    ]
    expect(countNewSince(items, '2025-02-01T00:00:00Z')).toBe(1)
  })
})

