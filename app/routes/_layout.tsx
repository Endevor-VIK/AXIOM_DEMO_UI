// AXIOM_DEMO_UI - WEB CORE
// Canvas: C04 - app/routes/_layout.tsx
// Purpose: Shared dashboard layout with Red Protocol navigation and system status shell.

import React, { useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

import Ticker from '@/components/Ticker'
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
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('axiom.auth')
    } catch {
      // storage unavailable
    }
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div className='ax-shell'>
      <header className='ax-topbar'>
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
                  end={item.end}
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
        </div>
      </header>
      <div className='ax-ticker'>
        <div className='ax-container'>
          <Ticker />
        </div>
      </div>
      <main className='ax-main'>
        <div className='ax-container'>
          <Outlet />
        </div>
      </main>
      <footer className='ax-status'>
        <div className='ax-container'>
          <StatusLine />
        </div>
      </footer>
    </div>
  )
}
