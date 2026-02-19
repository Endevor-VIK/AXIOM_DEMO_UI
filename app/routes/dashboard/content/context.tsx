import React from 'react'

import type {
  ContentAggregate,
  ContentCategory,
  ContentCategorySummary,
  ContentStatus,
} from '@/lib/vfs'

export type ContentViewMode = 'browse' | 'cards' | 'inspect'

export interface ContentFiltersSnapshot {
  query: string
  tag: string
  status: ContentStatus | 'any'
  lang: string | 'any'
  mode: ContentViewMode
}

export interface ContentFiltersApi extends ContentFiltersSnapshot {
  setQuery(value: string): void
  setTag(value: string): void
  setStatus(value: ContentStatus | 'any'): void
  setLang(value: string | 'any'): void
  setMode(value: ContentViewMode): void
  reset(): void
}

export interface ContentHubContextValue {
  aggregate: ContentAggregate | null
  loading: boolean
  error: string | null
  dataBase: string
  categories: Record<'all' | ContentCategory, ContentCategorySummary>
  availableTags: string[]
  availableLanguages: string[]
  filters: ContentFiltersApi
  pinned: string[]
  togglePin(id: string): void
  isPinned(id: string): boolean
}

export const ContentHubContext = React.createContext<ContentHubContextValue | undefined>(
  undefined
)

export function useContentHub(): ContentHubContextValue {
  const ctx = React.useContext(ContentHubContext)
  if (!ctx) {
    throw new Error('useContentHub requires ContentHubContext provider')
  }
  return ctx
}
