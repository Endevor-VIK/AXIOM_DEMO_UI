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

type MenuIconName =
  | 'profile'
  | 'favorites'
  | 'personalization'
  | 'settings'
  | 'help'
  | 'logout'

const MenuIcon = ({ name }: { name: MenuIconName }) => {
  switch (name) {
    case 'profile':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <circle cx='12' cy='8' r='3.25' />
          <path d='M5 19c0-3.3 3.1-6 7-6s7 2.7 7 6' />
        </svg>
      )
    case 'favorites':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M12 3.5l2.6 5.2 5.7.8-4.1 4 .97 5.6L12 16.4l-5.17 2.7.97-5.6-4.1-4 5.7-.8z' />
        </svg>
      )
    case 'personalization':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M4 6h16M4 12h16M4 18h16' />
          <circle cx='9' cy='6' r='1.6' />
          <circle cx='15' cy='12' r='1.6' />
          <circle cx='7' cy='18' r='1.6' />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <circle cx='12' cy='12' r='4' />
          <path d='M12 3v3M12 18v3M3 12h3M18 12h3M5.4 5.4l2.1 2.1M16.5 16.5l2.1 2.1M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1' />
        </svg>
      )
    case 'help':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <circle cx='12' cy='12' r='9' />
          <path d='M9.7 9.2a2.6 2.6 0 0 1 4.6 1.6c0 1.4-1 2-2 2.6-.8.5-1.1 1-1.1 2.1' />
          <circle cx='12' cy='17' r='1' />
        </svg>
      )
    case 'logout':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M10 5H6.5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2H10' />
          <path d='M14 8l4 4-4 4' />
          <path d='M18 12H10' />
        </svg>
      )
    default:
      return null
  }
}

function resolveViewportScale(): number {
  if (typeof document === 'undefined') return 1
  const root = document.documentElement
  if (root.dataset.scaleMode !== 'managed') return 1
  const raw = getComputedStyle(root).getPropertyValue('--ax-viewport-scale')
  const scale = Number.parseFloat(raw)
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

function computeCoords(anchor: HTMLElement, panel: HTMLElement | null): Coords {
  const viewportScale = resolveViewportScale()
  const rect = anchor.getBoundingClientRect()
  const panelWidth = panel?.offsetWidth || 280
  const margin = 12
  const viewportWidth = window.innerWidth / viewportScale
  const anchorRight = rect.right / viewportScale
  const anchorBottom = rect.bottom / viewportScale

  const preferredLeft = anchorRight - panelWidth
  const maxLeft = viewportWidth - panelWidth - margin
  const minLeft = margin
  const left = Math.min(Math.max(preferredLeft, minLeft), maxLeft)

  const preferredTop = anchorBottom + 8
  const top = Math.max(preferredTop, margin)
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
    const next = computeCoords(anchorEl, panelRef.current)
    setCoords((prev) => {
      if (prev && prev.top === next.top && prev.left === next.left) return prev
      return next
    })
  }, [anchorEl, open])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const rafId = requestAnimationFrame(updatePosition)
    const handler = () => updatePosition()
    window.addEventListener('resize', handler, true)
    window.addEventListener('scroll', handler, true)
    return () => {
      cancelAnimationFrame(rafId)
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
          <span className='ax-user-menu__icon' aria-hidden='true'>
            <MenuIcon name='profile' />
          </span>
          <span className='ax-user-menu__label'>Profile</span>
        </button>
        <button type='button' role='menuitem' className='ax-user-menu__item' onClick={() => handleNavigate('/favorites')}>
          <span className='ax-user-menu__icon' aria-hidden='true'>
            <MenuIcon name='favorites' />
          </span>
          <span className='ax-user-menu__label'>Favorites</span>
        </button>
        <button
          type='button'
          role='menuitem'
          className='ax-user-menu__item'
          onClick={() => handleNavigate('/settings/personalization')}
        >
          <span className='ax-user-menu__icon' aria-hidden='true'>
            <MenuIcon name='personalization' />
          </span>
          <span className='ax-user-menu__label'>Personalization</span>
        </button>
        <button type='button' role='menuitem' className='ax-user-menu__item' onClick={() => handleNavigate('/settings')}>
          <span className='ax-user-menu__icon' aria-hidden='true'>
            <MenuIcon name='settings' />
          </span>
          <span className='ax-user-menu__label'>Settings</span>
        </button>
        <button type='button' role='menuitem' className='ax-user-menu__item' onClick={() => handleNavigate('/help')}>
          <span className='ax-user-menu__icon' aria-hidden='true'>
            <MenuIcon name='help' />
          </span>
          <span className='ax-user-menu__label'>Help</span>
        </button>
        <div className='ax-user-menu__divider' role='separator' />
        <button
          type='button'
          role='menuitem'
          className='ax-user-menu__item ax-user-menu__item--logout'
          onClick={handleLogout}
        >
          <span className='ax-user-menu__icon' aria-hidden='true'>
            <MenuIcon name='logout' />
          </span>
          <span className='ax-user-menu__label'>Logout</span>
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
