import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { categoryIcons } from '@/components/icons'
import type { CategoryStat } from '@/lib/contentStats'

import './category-tiles.css'

interface TileItem extends Omit<CategoryStat, 'href'> {
  href: string
}

interface Props {
  items: TileItem[] // теперь содержит и 'all'
}

export default function CategoryTiles({ items }: Props) {
  const { pathname } = useLocation()
  return (
    <div className='ax-catTiles' role='navigation' aria-label='Content categories'>
      {items.map((it) => {
        const Icon = categoryIcons[it.key]
        const active = pathname.startsWith(it.href)
        const empty = it.count === 0
        const label = `${it.title} :: ${it.count} ${it.count === 1 ? 'item' : 'items'}`
        const ch = it.title.length
        return (
          <Link
            key={it.key}
            to={it.href}
            className={`ax-catTile${active ? ' is-active' : ''}${empty ? ' is-empty' : ''}`}
            aria-label={label}
            data-active={active || undefined}
            style={{ ['--ch' as any]: ch }}
          >
            <div className='ax-catTile__icon' aria-hidden='true'>
              <Icon />
            </div>
            <div className='ax-catTile__body'>
              <h3 className='ax-catTile__title'>
                <span className='ax-erase'>{it.title}</span>
              </h3>
              <div className='ax-catTile__meta'>
                <span className='ax-chip ax-catTile__count' data-variant='level'>
                  {it.count}
                </span>
                {empty && (
                  <span className='ax-chip ax-catTile__empty' data-variant='warn'>
                    EMPTY
                  </span>
                )}
              </div>
              {empty && <p className='ax-catTile__placeholder'>Заполнится скоро</p>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
