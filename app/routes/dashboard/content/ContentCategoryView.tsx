import React, { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import ContentList from '@/components/ContentList'
import ContentPreview from '@/components/ContentPreview'
import type { ContentCategory, ContentItem, ContentStatus } from '@/lib/vfs'

import { useContentHub } from './context'

function matchesQuery(item: ContentItem, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true
  const haystack = [
    item.title,
    item.summary,
    item.author,
    item.id,
    (item.tags ?? []).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

function matchesTag(item: ContentItem, tag: string): boolean {
  if (!tag) return true
  const tags = item.tags ?? []
  return tags.includes(tag)
}

function matchesStatus(item: ContentItem, status: ContentStatus | 'any'): boolean {
  if (status === 'any') return true
  return item.status === status
}

function matchesLang(item: ContentItem, lang: string | 'any'): boolean {
  if (lang === 'any') return true
  return (item.lang ?? '').toLowerCase() === lang.toLowerCase()
}

function filterByCategory(items: ContentItem[], category: 'all' | ContentCategory): ContentItem[] {
  if (category === 'all') return items
  return items.filter((item) => item.category === category)
}

function orderByPins(items: ContentItem[], pinned: string[]): ContentItem[] {
  if (!pinned.length) return items
  const set = new Set(pinned)
  const pinnedItems: ContentItem[] = []
  const rest: ContentItem[] = []
  for (const item of items) {
    if (set.has(item.id)) pinnedItems.push(item)
    else rest.push(item)
  }
  return [...pinnedItems, ...rest]
}

export interface ContentCategoryViewProps {
  category: 'all' | ContentCategory
}

const ContentCategoryView: React.FC<ContentCategoryViewProps> = ({ category }) => {
  const { aggregate, loading, error, filters, dataBase, pinned, togglePin } = useContentHub()
  const [searchParams, setSearchParams] = useSearchParams()

  const items = useMemo(() => {
    if (!aggregate) return []
    return filterByCategory(aggregate.items, category)
      .filter((item) => matchesQuery(item, filters.query))
      .filter((item) => matchesTag(item, filters.tag))
      .filter((item) => matchesStatus(item, filters.status))
      .filter((item) => matchesLang(item, filters.lang))
  }, [aggregate, category, filters])

  const ordered = useMemo(() => orderByPins(items, pinned), [items, pinned])

  const selectedId = useMemo(() => searchParams.get('item'), [searchParams])
  const hasSelected = selectedId && ordered.some((item) => item.id === selectedId)
  const effectiveSelectedId = hasSelected ? (selectedId as string) : ordered[0]?.id ?? null

  useEffect(() => {
    if (!ordered.length) return
    if (!hasSelected) {
      const next = new URLSearchParams(searchParams)
      if (effectiveSelectedId) {
        next.set('item', effectiveSelectedId)
        setSearchParams(next, { replace: true })
      }
    }
  }, [effectiveSelectedId, hasSelected, ordered, searchParams, setSearchParams])

  const selectedItem = ordered.find((item) => item.id === effectiveSelectedId) ?? null

  if (loading) {
    return <p className='ax-muted'>Loading content…</p>
  }

  if (error) {
    return null
  }

  if (!ordered.length) {
    return <p className='ax-muted'>No content found in this category.</p>
  }

  return (
    <div className={`ax-content-view ${filters.view}`}>
      <div className='ax-content-column list'>
        <ContentList
          items={ordered}
          view={filters.view}
          selectedId={effectiveSelectedId}
          onSelect={(id) => {
            const next = new URLSearchParams(searchParams)
            next.set('item', id)
            setSearchParams(next, { replace: true })
          }}
          pinned={pinned}
          onTogglePin={togglePin}
        />
      </div>
      <div className='ax-content-column preview'>
        <ContentPreview item={selectedItem} dataBase={dataBase} />
      </div>
    </div>
  )
}

export default ContentCategoryView
