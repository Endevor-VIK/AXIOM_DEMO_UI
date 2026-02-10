import React from 'react'

import type {
  ContentAggregate,
  ContentCategory,
  ContentCategorySummary,
  ContentStatus,
} from '@/lib/vfs'

export type ContentLayoutMode = 'browse' | 'inspect'
export type ContentViewMode = 'cards' | 'list' | 'orbit'

export interface ContentFiltersSnapshot {
  query: string
  tag: string
  status: ContentStatus | 'any'
  lang: string | 'any'
  layout: ContentLayoutMode
  view: ContentViewMode
}

export interface ContentFiltersApi extends ContentFiltersSnapshot {
  setQuery(value: string): void
  setTag(value: string): void
  setStatus(value: ContentStatus | 'any'): void
  setLang(value: string | 'any'): void
  setLayout(value: ContentLayoutMode): void
  setView(value: ContentViewMode): void
  reset(): void
}

export interface ContentFeatures {
  orbitView: boolean
}

export interface ContentHubContextValue {
  aggregate: ContentAggregate | null
  loading: boolean
  error: string | null
  dataBase: string
  categories: Record<'all' | ContentCategory, ContentCategorySummary>
  availableTags: string[]
  availableLanguages: string[]
  features: ContentFeatures
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
