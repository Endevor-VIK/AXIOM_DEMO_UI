// AXIOM_DEMO_UI - WEB CORE
// Canvas: C04 - app/routes/_layout.tsx
// Purpose: Shared dashboard layout with Red Protocol navigation and system status shell.

import React, { useCallback, useMemo } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'

import HeadlinesTicker from '../../components/news/HeadlinesTicker'
import { useNewsManifest } from '../../lib/useNewsManifest'
import StatusLine from '@/components/StatusLine'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'HOME', end: true },
  { to: '/dashboard/roadmap', label: 'ROADMAP' },
  { to: '/dashboard/audit', label: 'AUDIT' },
  { to: '/dashboard/content', label: 'CONTENT' },
  { to: '/dashboard/news', label: 'NEWS' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const route = location.pathname || '/'

  const section = useMemo(() => {
    const parts = route.split('/').filter(Boolean)
    if (parts[0] !== 'dashboard') return route.toUpperCase()
    const key = parts[1] || 'home'
    return key === 'home' ? 'HOME' : key.replace(/-/g, ' ').toUpperCase()
  }, [route])

  const ribbonTokens = useMemo(() => ['MODE :: RED PROTOCOL', `SECTION :: ${section}`], [section])

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('axiom.auth')
    } catch {
      // storage unavailable
    }
    navigate('/login', { replace: true })
  }, [navigate])

  const tickerItems = useNewsManifest()

  return (
    <div className='ax-page'>
      <header className='ax-header ax-topbar'>
        <div className='ax-container'>
          <div className='ax-topbar__inner'>
            <div className='ax-brand' aria-label='AXIOM Panel'>
              AXIOM PANEL
            </div>
            <nav className='ax-tabs' aria-label='Primary navigation'>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={Boolean(item.end)}
                  className={({ isActive }) => (isActive ? 'ax-tab is-active' : 'ax-tab')}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button type='button' className='ax-btn ghost ax-action-logout' onClick={handleLogout}>
              EXIT
            </button>
          </div>
          <div className='ax-ribbon' role='status' aria-live='polite'>
            {ribbonTokens.map((token, index) => (
              <React.Fragment key={token}>
                {index > 0 && (
                  <span className='ax-ribbon__sep' aria-hidden='true'>//</span>
                )}
                <span className='ax-ribbon__item'>{token}</span>
              </React.Fragment>
            ))}
            <span className='visually-hidden'>Active route {route}</span>
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
          <StatusLine />
        </div>
      </footer>

      {/* Портал для модалок */}
      <div id='modal-root' />
    </div>
  )
}
