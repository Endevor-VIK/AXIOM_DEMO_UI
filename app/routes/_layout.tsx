// AXIOM_DEMO_UI - WEB CORE
// Canvas: C04 - app/routes/_layout.tsx
// Purpose: Shared dashboard layout with Red Protocol navigation and system status shell.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'

import Ticker from '@/components/Ticker'
import StatusLine from '@/components/StatusLine'

type TextScale = 'base' | 'plus'

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

function useTextScale(): [TextScale, () => void] {
  const [scale, setScale] = useState<TextScale>(() => {
    if (typeof document === 'undefined') return 'base'
    const attr = document.documentElement.getAttribute('data-text-scale')
    return attr === 'plus' ? 'plus' : 'base'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-text-scale', scale)
    const rootStyle = document.documentElement.style
    if (scale === 'plus') {
      rootStyle.setProperty('--fs-16', '18px')
      rootStyle.setProperty('--fs-14', '16px')
    } else {
      rootStyle.removeProperty('--fs-16')
      rootStyle.removeProperty('--fs-14')
    }
  }, [scale])

  const toggle = useCallback(() => {
    setScale((prev) => (prev === 'base' ? 'plus' : 'base'))
  }, [])

  return [scale, toggle]
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [textScale, toggleTextScale] = useTextScale()

  const activeSection = useMemo(() => {
    const path = location.pathname
    return NAV_ITEMS.find((item) => {
      if (item.end) return path === item.to
      return path.startsWith(item.to)
    })
  }, [location.pathname])

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
            <div className='ax-actions' role='group' aria-label='Panel actions'>
              <button
                type='button'
                className='ax-chip ax-action'
                onClick={toggleTextScale}
                aria-pressed={textScale === 'plus'}
                aria-label={textScale === 'plus' ? 'Decrease text size' : 'Increase text size'}
              >
                <span aria-hidden='true'>{textScale === 'plus' ? 'A-' : 'A+'}</span>
              </button>
              <button type='button' className='ax-chip ax-action' aria-label='Help'>
                <span aria-hidden='true'>?</span>
              </button>
              <button type='button' className='ax-chip ax-action' aria-label='Notifications'>
                <span aria-hidden='true'>!</span>
              </button>
              <button type='button' className='ax-btn ghost ax-action-logout' onClick={handleLogout}>
                EXIT
              </button>
            </div>
          </div>
          <div className='ax-cover-bar' role='status' aria-live='polite'>
            <span className='ax-cover-main'>RED PROTOCOL / ONLINE</span>
            <span className='ax-chip' data-variant='level'>
              SECTION :: {activeSection?.label ?? 'HOME'}
            </span>
            <span className='ax-chip' data-variant='info'>
              ROUTE :: {location.pathname}
            </span>
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

