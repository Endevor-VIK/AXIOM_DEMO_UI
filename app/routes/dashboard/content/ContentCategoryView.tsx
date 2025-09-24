import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import ContentList from '@/components/ContentList'
import Modal from '@/components/Modal'
import PreviewPane from '@/components/PreviewPane'
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
  return items.filter((content) => content.category === category)
}

function orderByPins(items: ContentItem[], pinned: string[]): ContentItem[] {
  if (!pinned.length) return items
  const set = new Set(pinned)
  const pinnedItems: ContentItem[] = []
  const rest: ContentItem[] = []
  for (const entry of items) {
    if (set.has(entry.id)) pinnedItems.push(entry)
    else rest.push(entry)
  }
  return [...pinnedItems, ...rest]
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : true
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [query])

  return matches
}

export interface ContentCategoryViewProps {
  category: 'all' | ContentCategory
}

const noop = () => {}

const ContentCategoryView: React.FC<ContentCategoryViewProps> = ({ category }) => {
  const { aggregate, loading, error, filters, dataBase, pinned } = useContentHub()
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

  const selectedParam = searchParams.get('item') ?? ''

  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [selected, setSelected] = useState<ContentItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!ordered.length) {
      setSelected(null)
      setModalOpen(false)
      return
    }

    if (selectedParam) {
      const match = ordered.find((item) => item.id === selectedParam)
      if (match && match.id !== selected?.id) {
        setSelected(match)
        return
      }
    }

    if (!selected || !ordered.some((item) => item.id === selected.id)) {
      setSelected(ordered[0] ?? null)
    }
  }, [ordered, selectedParam, selected])

  useEffect(() => {
    if (!selected) {
      if (!selectedParam) return
      const next = new URLSearchParams(searchParams)
      next.delete('item')
      setSearchParams(next, { replace: true })
      return
    }

    if (selectedParam === selected.id) return
    const next = new URLSearchParams(searchParams)
    next.set('item', selected.id)
    setSearchParams(next, { replace: true })
  }, [selected, selectedParam, searchParams, setSearchParams])

  useEffect(() => {
    if (isDesktop && modalOpen) {
      setModalOpen(false)
    }
  }, [isDesktop, modalOpen])

  useEffect(() => {
    if (!selected) return
    if (!isDesktop) return
    setModalOpen(false)
  }, [isDesktop, selected])

  const handleSelect = (item: ContentItem) => {
    setSelected(item)
    if (!isDesktop) {
      setModalOpen(true)
    }
  }

  const handleModalChange = (open: boolean) => {
    setModalOpen(open)
  }

  if (loading) {
    return (
      <div className='ax-content-split'>
        <div className='ax-content-column list'>
          <ContentList items={[]} selectedId={null} onSelect={noop} />
        </div>
        {isDesktop ? (
          <aside className='ax-content-preview'>
            <PreviewPane item={null} dataBase={dataBase} />
          </aside>
        ) : null}
      </div>
    )
  }

  if (error) {
    return <p className='ax-muted'>Unable to load content right now.</p>
  }

  if (!ordered.length) {
    return <p className='ax-muted'>No content found in this category.</p>
  }

  return (
    <div className='ax-content-split'>
      <div className='ax-content-column list'>
        <ContentList items={ordered} selectedId={selected?.id ?? null} onSelect={handleSelect} />
      </div>

      {isDesktop ? (
        <aside className='ax-content-preview'>
          <PreviewPane item={selected} dataBase={dataBase} />
        </aside>
      ) : null}

      {!isDesktop ? (
        <Modal open={modalOpen} onOpenChange={handleModalChange} title={selected ? selected.title : 'Preview'}>
          <PreviewPane item={selected} dataBase={dataBase} />
        </Modal>
      ) : null}
    </div>
  )
}

export default ContentCategoryView
