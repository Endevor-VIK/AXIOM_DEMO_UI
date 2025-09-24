import React from 'react'
import { Link } from 'react-router-dom'

import type { CategoryStat } from '@/lib/contentStats'

import './category-stats.css'

export type CategoryItem = CategoryStat & { active?: boolean }

type Props = {
  items: CategoryItem[]
  variant?: 'table'
}

function normalizeCount(value: number): { raw: number; display: string } {
  const numeric = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return {
    raw: numeric,
    display: numeric > 99 ? '99+' : String(numeric),
  }
}

export default function CategoryStats({ items, variant = 'table' }: Props) {
  return (
    <nav
      aria-label='Content categories'
      data-variant={variant}
      className='ax-CategoryStats'
    >
      <ul role='list' className='ax-CategoryStats__list'>
        {items.map((item) => {
          const { raw, display } = normalizeCount(item.count)
          const label = `${raw} ${raw === 1 ? 'item' : 'items'}`
          return (
            <li key={item.key} className='ax-CategoryStats__item'>
              <Link
                to={item.href}
                className='ax-CategoryStats__link'
                data-active={item.active ? 'true' : undefined}
              >
                <span className='title'>{item.title.toUpperCase()}</span>
                <span className='count' aria-label={label}>
                  {display}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
