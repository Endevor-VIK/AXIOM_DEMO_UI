import React from 'react'
import { Link } from 'react-router-dom'
import type { CategoryStat } from '@/lib/contentStats'
import { categoryIcons } from '@/components/icons'
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

export default function CategoryStats({ items }: Props) {
  return (
    <nav aria-label='Content categories' className='ax-CategoryStats' data-variant='table'>
      <ul role='list' className='ax-CategoryStats__list'>
        {items.map((item) => {
          const { raw, display } = normalizeCount(item.count)
            // верхний регистр для визуала
          const title = item.title.toUpperCase()
          const Icon = categoryIcons[item.key]
          return (
            <li key={item.key} className='ax-CategoryStats__item ax-Cell'>
              <Link
                to={item.href}
                className='ax-CategoryStats__link ax-Cell__link'
                data-active={item.active ? 'true' : undefined}
                aria-label={`${title} (${raw} ${raw === 1 ? 'item' : 'items'})`}
              >
                <div className='ax-Cell__title'>
                  <span
                    className='ax-erase'
                    data-ch={title.length}
                    style={{ ['--ch' as any]: title.length }}
                  >
                    {title}
                  </span>
                </div>
                <div className='ax-Cell__icon' aria-hidden='true'>
                  <Icon />
                </div>
                <span
                  className='ax-Cell__count'
                  aria-label={`${raw} ${raw === 1 ? 'item' : 'items'}`}
                >
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
