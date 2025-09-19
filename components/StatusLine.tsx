// AXIOM_DEMO_UI - WEB CORE
// Canvas: C07 - components/StatusLine.tsx
// Purpose: Compact status footer with environment/time indicators for Red Protocol shell.

import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

export type StatusMeta = {
  version?: string
  zone?: string
}

export interface StatusLineProps {
  meta?: StatusMeta
}

function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function timeStr(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export default function StatusLine({ meta }: StatusLineProps) {
  const location = useLocation()
  const route = useMemo(() => location.pathname || '/', [location.pathname])
  const online = useOnlineStatus()
  const [now, setNow] = useState<string>(timeStr())

  useEffect(() => {
    const handle = setInterval(() => setNow(timeStr()), 1000)
    return () => clearInterval(handle)
  }, [])

  const mode = import.meta.env.MODE
  const envTag = (import.meta as any).env?.VITE_ENV || (mode === 'production' ? 'PUBLIC' : 'DEV')
  const buildTs = (import.meta as any).env?.VITE_BUILD_TIME as string | undefined

  return (
    <div className='ax-status-line' role='status' aria-live='polite' aria-atomic='true'>
      <div className='ax-status-line__group'>
        <span className='ax-chip' data-variant='info'>ENV :: {envTag}</span>
        {meta?.zone && <span className='ax-chip' data-variant='info'>ZONE :: {meta.zone}</span>}
        {meta?.version && <span className='ax-chip' data-variant='level'>VER :: {meta.version}</span>}
        {buildTs && <span className='ax-chip' data-variant='info'>BUILD :: {buildTs}</span>}
        <span className='ax-chip' data-variant={online ? 'online' : 'error'} aria-live='off'>
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
        <span className='ax-status-line__time'>{now}</span>
        <span className='ax-status-line__route'>{route}</span>
      </div>
    </div>
  )
}
