import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { ContentPreviewData } from '../types'

interface ReaderMenuLayerProps {
  open: boolean
  entries: ContentPreviewData[]
  activeId?: string | null
  search: string
  onSearchChange: (value: string) => void
  onSelect: (id: string) => void
  onClose: () => void
}

const MENU_Z = 66
const OVERLAY_Z = 60

export const ReaderMenuLayer: React.FC<ReaderMenuLayerProps> = ({
  open,
  entries,
  activeId,
  search,
  onSearchChange,
  onSelect,
  onClose,
}) => {
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null)
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null)
  const lastTouchY = useRef<number | null>(null)

  useEffect(() => {
    const node = document.getElementById('modal-root') ?? document.body
    setModalRoot(node)
  }, [])

  useEffect(() => {
    if (!open) return
    const node = document.getElementById('axr-scroll')
    if (node) setScrollRoot(node)
  }, [open])

  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>('.axr-header')
    const root = document.documentElement

    const setHeaderSize = () => {
      const h = header?.getBoundingClientRect().height ?? 48
      root.style.setProperty('--axr-header-h-dyn', `${h}px`)
    }

    setHeaderSize()
    window.addEventListener('resize', setHeaderSize)
    return () => window.removeEventListener('resize', setHeaderSize)
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return entries
    return entries.filter((entry) => {
      const haystack = [entry.id, entry.title, entry.tags.join(' ')].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [entries, search])

  const layer = (
    <div className={`axr-menu-layer${open ? ' is-open' : ''}`} style={{ zIndex: OVERLAY_Z }}>
      <div
        className={`axr-overlay${open ? ' axr-overlay--open' : ''}`}
        data-overlay
        aria-hidden={!open}
        onClick={onClose}
        onWheel={(event) => {
          if (!scrollRoot) return
          scrollRoot.scrollBy({ top: event.deltaY, left: event.deltaX })
          event.preventDefault()
        }}
        onTouchStart={(event) => {
          if (event.touches.length === 1) {
            lastTouchY.current = event.touches[0].clientY
          }
        }}
        onTouchMove={(event) => {
          if (!scrollRoot || event.touches.length !== 1 || lastTouchY.current === null) return
          const current = event.touches[0].clientY
          const delta = lastTouchY.current - current
          scrollRoot.scrollBy({ top: delta })
          lastTouchY.current = current
          event.preventDefault()
        }}
        onTouchEnd={() => {
          lastTouchY.current = null
        }}
      />
      <div className='axr-menu-shell' style={{ zIndex: MENU_Z }}>
        <nav className={`axr-menu${open ? ' axr-menu--open' : ''}`} aria-label='Файлы контента'>
          <div className='axr-menu-inner'>
            <div className='axr-menu-header'>
              <div className='axr-menu-title'>AXIOM FILES</div>
              <div className='axr-menu-note'>Быстрый поиск и переход</div>
            </div>

            <div className='axr-menu-search'>
              <input
                type='search'
                placeholder='Поиск файла…'
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                aria-label='Поиск по списку файлов'
              />
            </div>

            <ul className='axr-menu-list'>
              {filtered.map((item) => {
                const active = item.id === activeId
                return (
                  <li key={item.id} className={`axr-menu-item${active ? ' axr-menu-item--active' : ''}`}>
                    <button type='button' onClick={() => onSelect(item.id)}>
                      <span className='axr-menu-id'>[{item.id}]</span>
                      <span className='axr-menu-name'>{item.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  )

  if (!modalRoot) return null
  return createPortal(layer, modalRoot)
}
