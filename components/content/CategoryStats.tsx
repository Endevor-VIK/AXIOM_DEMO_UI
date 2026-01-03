import React, { useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CategoryStat } from '@/lib/contentStats'
import { categoryIcons } from '@/components/icons'
import './category-stats.css'

export type CategoryItem = CategoryStat & { active?: boolean; disabled?: boolean }

type Props = {
  items: CategoryItem[]
  variant?: 'table'
}

function normalizeCount(value: number): { raw: number; display: string } {
  const numeric = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  return { raw: numeric, display: numeric > 99 ? '99+' : String(numeric) }
}

export default function CategoryStats({ items }: Props) {
  const navigate = useNavigate()
  const activeIndex = items.findIndex((item) => item.active)
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])

  tabRefs.current = items.map((item, index) =>
    item.disabled ? null : tabRefs.current[index] ?? null,
  )

  const handleActivate = useCallback(
    (item: CategoryItem) => {
      if (item.disabled) return
      navigate(item.href, { replace: false })
    },
    [navigate],
  )

  const focusTab = useCallback((index: number) => {
    tabRefs.current[index]?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
      if (!items.length) return
      if (items[index]?.disabled) return
      const findNextEnabled = (start: number, direction: 1 | -1) => {
        for (let step = 1; step <= items.length; step += 1) {
          const idx = (start + step * direction + items.length) % items.length
          if (!items[idx]?.disabled) return idx
        }
        return -1
      }
      let nextIndex = -1
      switch (event.key) {
        case ' ':
        case 'Spacebar':
        case 'Enter':
          event.preventDefault()
          handleActivate(items[index]!)
          return
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = findNextEnabled(index, 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = findNextEnabled(index, -1)
          break
        case 'Home':
          nextIndex = items.findIndex((item) => !item.disabled)
          break
        case 'End':
          for (let i = items.length - 1; i >= 0; i -= 1) {
            if (!items[i]?.disabled) {
              nextIndex = i
              break
            }
          }
          break
        default:
          return
      }
      event.preventDefault()
      if (nextIndex >= 0) {
        focusTab(nextIndex)
        handleActivate(items[nextIndex]!.href)
      }
    },
    [focusTab, handleActivate, items],
  )

  const normalizedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      normalizedCount: normalizeCount(item.count),
    }))
  }, [items])

  return (
    <nav
      aria-label='Content categories'
      className='ax-CategoryStats'
      data-variant='table'
      role='tablist'
    >
      <ul role='presentation' className='ax-CategoryStats__list'>
        {normalizedItems.map((item, index) => {
          const { raw, display } = item.normalizedCount
          const title = item.title.toUpperCase()
          const Icon = categoryIcons[item.key]
          const isActive = Boolean(item.active)
          const isDisabled = Boolean(item.disabled)
          return (
            <li
              key={item.key}
              className='ax-CategoryStats__item ax-Cell'
              data-index={index}
              data-active={isActive || undefined}
              data-next-active={activeIndex === index + 1 ? 'true' : undefined}
              data-disabled={isDisabled ? 'true' : undefined}
            >
              {isDisabled ? (
                <span
                  className='ax-Cell__link'
                  role='tab'
                  tabIndex={-1}
                  aria-disabled='true'
                  aria-label={`${title} (${raw} ${raw === 1 ? 'item' : 'items'})`}
                  data-disabled='true'
                >
                  <span className='ax-Cell__icon' aria-hidden='true'>
                    <Icon />
                  </span>
                  <span className='ax-Cell__title' data-text={title}>
                    {title}
                  </span>
                  <span
                    className='ax-Cell__count'
                    aria-label={`${raw} ${raw === 1 ? 'item' : 'items'}`}
                  >
                    {display}
                  </span>
                </span>
              ) : (
                <Link
                  ref={(node) => {
                    tabRefs.current[index] = node
                  }}
                  to={item.href}
                  role='tab'
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  className='ax-Cell__link'
                  data-active={isActive ? 'true' : undefined}
                  aria-label={`${title} (${raw} ${raw === 1 ? 'item' : 'items'})`}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                >
                  <span className='ax-Cell__icon' aria-hidden='true'>
                    <Icon />
                  </span>
                  <span className='ax-Cell__title' data-text={title}>
                    {title}
                  </span>
                  <span
                    className='ax-Cell__count'
                    aria-label={`${raw} ${raw === 1 ? 'item' : 'items'}`}
                  >
                    {display}
                  </span>
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
