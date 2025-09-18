import React from 'react'
import { NavLink } from 'react-router-dom'

import type { ContentCategory, ContentCategorySummary } from '@/lib/vfs'

const TAB_LABELS: Record<'all' | ContentCategory, string> = {
  all: 'All',
  locations: 'Locations',
  characters: 'Characters',
  technologies: 'Technologies',
  factions: 'Factions',
  events: 'Events',
  lore: 'Lore',
}

const TAB_PATHS: Record<'all' | ContentCategory, string> = {
  all: 'all',
  locations: 'locations',
  characters: 'characters',
  technologies: 'technologies',
  factions: 'factions',
  events: 'events',
  lore: 'lore',
}

export interface ContentTabsProps {
  categories: Record<'all' | ContentCategory, ContentCategorySummary>
  active: 'all' | ContentCategory
}

const ContentTabs: React.FC<ContentTabsProps> = ({ categories, active }) => {
  return (
    <nav className='ax-content-tabs' aria-label='Content categories'>
      {(Object.keys(TAB_LABELS) as Array<'all' | ContentCategory>).map((key) => {
        const count = categories[key]?.count ?? 0
        const to = TAB_PATHS[key]
        return (
          <NavLink
            key={key}
            to={to}
            className={({ isActive }) =>
              `ax-tab ${isActive || active === key ? 'active' : ''}`.trim()
            }
          >
            <span>{TAB_LABELS[key]}</span>
            <span className='ax-pill' aria-label={`${count} items`}>
              {count}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default ContentTabs
