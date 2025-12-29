import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import type { User } from '@/lib/identity/types'

export interface UserMenuDropdownProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onNavigate: (path: string) => void
  onLogout: () => void
  user?: User | null
}

type Coords = { top: number; left: number }

function computeCoords(anchor: HTMLElement, panel: HTMLElement | null): Coords {
  const rect = anchor.getBoundingClientRect()
  const panelWidth = panel?.offsetWidth || 280
  const panelHeight = panel?.offsetHeight || 0
  const margin = 12
  const preferredLeft = rect.left + rect.width / 2 - panelWidth / 2
  const maxLeft = window.innerWidth - panelWidth - margin
  const minLeft = margin
  const left = Math.min(Math.max(preferredLeft, minLeft), maxLeft)
  const preferredTop = rect.bottom + 10
  const maxTop = window.innerHeight - panelHeight - margin
  const top = Math.min(preferredTop, maxTop)
  return { top, left }
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'AX'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  const first = (parts[0] ?? '').charAt(0)
  const last = (parts[parts.length - 1] ?? '').charAt(0) || first
  return `${first}${last}`.toUpperCase()
}

export function UserMenuDropdown({
  anchorEl,
  open,
  onClose,
  onNavigate,
  onLogout,
  user,
}: UserMenuDropdownProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [coords, setCoords] = useState<Coords | null>(null)

  const header = useMemo(() => {
    const displayName = user?.displayName || 'CREATOR'
    const handle = user?.handle || '@endeavor_prime'
    const role = (user?.role || 'user').toUpperCase()
    return { displayName, handle, role }
  }, [user])

  const updatePosition = useCallback(() => {
    if (!anchorEl || !open) return
    setCoords(computeCoords(anchorEl, panelRef.current))
  }, [anchorEl, open])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const handler = () => updatePosition()
    window.addEventListener('resize', handler, true)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler, true)
      window.removeEventListener('scroll', handler, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const handlePointer = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (panelRef.current?.contains(target)) return
      if (anchorEl?.contains(target)) return
      onClose()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', handlePointer, true)
    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointer, true)
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [anchorEl, onClose, open])

  const handleNavigate = (path: string) => {
    onNavigate(path)
    onClose()
  }

  const handleLogout = () => {
    onLogout()
    onClose()
  }

  if (!open || !coords) return null

  const menu = (
    <div
      ref={panelRef}
      className='ax-user-menu'
      role='menu'
      aria-label='User menu'
      style={{ top: coords.top, left: coords.left }}
    >
      <div className='ax-user-menu__head'>
        <div className='ax-user-menu__avatar' aria-hidden='true'>
          {initials(header.displayName)}
        </div>
        <div className='ax-user-menu__identity'>
          <div className='ax-user-menu__name'>{header.displayName}</div>
          <div className='ax-user-menu__handle'>{header.handle}</div>
          <div className='ax-user-menu__badges'>
            <span className='ax-chip' data-variant='accent'>
              DEMO
            </span>
            <span className='ax-chip' data-variant='level'>
              {header.role}
            </span>
          </div>
        </div>
      </div>
      <div className='ax-user-menu__body'>
        <button type='button' role='menuitem' className='ax-user-menu__item' onClick={() => handleNavigate('/profile')}>
          Profile
        </button>
        <button type='button' role='menuitem' className='ax-user-menu__item' onClick={() => handleNavigate('/favorites')}>
          Favorites
        </button>
        <button
          type='button'
          role='menuitem'
          className='ax-user-menu__item'
          onClick={() => handleNavigate('/settings/personalization')}
        >
          Personalization
        </button>
        <button type='button' role='menuitem' className='ax-user-menu__item' onClick={() => handleNavigate('/settings')}>
          Settings
        </button>
        <button type='button' role='menuitem' className='ax-user-menu__item' onClick={() => handleNavigate('/help')}>
          Help
        </button>
        <div className='ax-user-menu__divider' role='separator' />
        <button
          type='button'
          role='menuitem'
          className='ax-user-menu__item ax-user-menu__item--logout'
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  )

  const container =
    document.getElementById('ax-modal-root') ??
    document.getElementById('modal-root') ??
    document.body
  return createPortal(menu, container)
}

export default UserMenuDropdown
