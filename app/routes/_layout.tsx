// AXIOM_DEMO_UI - WEB CORE
// Canvas: C04 - app/routes/_layout.tsx
// Purpose: Shared dashboard layout with Red Protocol navigation and system status shell.

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'

import HeadlinesTicker from '../../components/news/HeadlinesTicker'
import { useNewsManifest } from '../../lib/useNewsManifest'
import StatusLine from '@/components/StatusLine'
import UserMenuDropdown from '@/components/UserMenuDropdown'
import { logout } from '@/lib/identity/authService'
import { resolvePrimaryRole } from '@/lib/identity/roles'
import { useSession } from '@/lib/identity/useSession'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

function resolveInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'AX'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  const first = parts[0]?.charAt(0) ?? 'A'
  const last = parts[parts.length - 1]?.charAt(0) ?? first
  return `${first}${last}`.toUpperCase()
}

export default function Layout() {
  const location = useLocation()
  const route = location.pathname || '/'
  const navigate = useNavigate()
  const avatarRef = useRef<HTMLButtonElement | null>(null)

  const section = useMemo(() => {
    const parts = route.split('/').filter(Boolean)
    if (parts[0] !== 'dashboard') return route.toUpperCase()
    const key = parts[1] || 'home'
    return key === 'home' ? 'HOME' : key.replace(/-/g, ' ').toUpperCase()
  }, [route])

  const modeLabel = 'RED PROTOCOL'
  const [menuOpen, setMenuOpen] = useState(false)

  const statusMeta = useMemo(
    () => ({
      mode: modeLabel,
      section,
      version: 'v0.2.3.1',
    }),
    [modeLabel, section],
  )

  const tickerItems = useNewsManifest()
  const session = useSession()
  const userName = session.user?.displayName || 'CREATOR'
  const userRole = resolvePrimaryRole(session.user?.roles).toUpperCase()
  const userInitials = resolveInitials(userName)

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { to: '/dashboard', label: 'HOME', end: true },
      { to: '/dashboard/roadmap', label: 'ROADMAP' },
      { to: '/dashboard/axchat', label: 'AXCHAT' },
      { to: '/dashboard/content', label: 'CONTENT' },
      { to: '/dashboard/news', label: 'NEWS' },
    ]
    return items
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/', { replace: true })
  }, [navigate])

  const handleMenuNavigate = useCallback(
    (path: string) => {
      navigate(path)
      setMenuOpen(false)
    },
    [navigate],
  )

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  React.useEffect(() => {
    setMenuOpen(false)
  }, [route])

  return (
    <div className='ax-page'>
      <header className='ax-header ax-topbar'>
        <div className='ax-container'>
          <div className='ax-topbar__inner'>
            <div className='ax-brand' aria-label='AXIOM Panel'>
              AXIOM PANEL
            </div>
            <nav className='ax-tabs' aria-label='Primary navigation'>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={Boolean(item.end)}
                  className={({ isActive }) =>
                    isActive ? 'ax-tab ax-link-underline is-active' : 'ax-tab ax-link-underline'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className='ax-topbar__actions'>
              <button
                ref={avatarRef}
                type='button'
                className='ax-user-trigger'
                aria-label='Open user menu'
                aria-haspopup='menu'
                aria-expanded={menuOpen}
                data-open={menuOpen ? 'true' : undefined}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span className='ax-user-trigger__avatar' aria-hidden='true'>
                  {userInitials}
                </span>
                <span className='ax-user-trigger__meta'>
                  <span className='ax-user-trigger__name'>{userName}</span>
                  <span className='ax-user-trigger__role'>{userRole}</span>
                </span>
                <span className='ax-user-trigger__caret' aria-hidden='true' />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* RED PROTOCOL Headlines Ticker */}
      <HeadlinesTicker {...(tickerItems ? { items: tickerItems } : {})} />

      {/* FX-layer: эффекты/scanlines; без интеракции */}
      <div id='fx-layer' aria-hidden />

      <main className='ax-shell ax-content'>
        <div className='ax-container'>
          <Outlet />
        </div>
      </main>

      <footer className='ax-footer ax-status'>
        <div className='ax-container'>
          <StatusLine meta={statusMeta} />
        </div>
      </footer>

      <UserMenuDropdown
        anchorEl={avatarRef.current}
        open={menuOpen}
        onClose={closeMenu}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        user={session.user ?? null}
      />
    </div>
  )
}
