// AXIOM_DEMO_UI - WEB CORE
// Canvas: C07 - components/StatusLine.tsx
// Purpose: Compact status footer using Red Protocol chips for route, env and uptime metadata.

import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

export type StatusMeta = {
  id?: string
  zone?: string
  status?: string
  version?: string
}

export interface StatusLineProps {
  meta?: StatusMeta
  showHotkeys?: boolean
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
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const STATUS_VARIANT: Record<string, 'info' | 'warn' | 'good' | 'error' | 'online'> = {
  draft: 'warn',
  active: 'online',
  complete: 'good',
  success: 'good',
  failed: 'error',
  error: 'error',
}

function resolveStatusVariant(status?: string): 'info' | 'warn' | 'good' | 'error' | 'online' {
  if (!status) return 'info'
  const key = status.toLowerCase()
  return STATUS_VARIANT[key] || 'info'
}

export default function StatusLine({ meta, showHotkeys = false }: StatusLineProps) {
  const loc = useLocation()
  const online = useOnlineStatus()

  const mode = import.meta.env.MODE
  const envTag = (import.meta as any).env?.VITE_ENV || (mode === 'production' ? 'PUBLIC' : 'DEV')
  const buildTs = (import.meta as any).env?.VITE_BUILD_TIME as string | undefined

  const [now, setNow] = useState<string>(timeStr())
  useEffect(() => {
    const t = setInterval(() => setNow(timeStr()), 1000)
    return () => clearInterval(t)
  }, [])

  const route = useMemo(() => loc.pathname || '/', [loc.pathname])

  return (
    <div className='ax-status-line' role='status' aria-live='polite' aria-atomic='true'>
      <div className='ax-status-line__group'>
        <span className='ax-status-line__route'>{route}</span>
        {meta?.id && (
          <span className='ax-chip' data-variant='level'>ID :: {meta.id}</span>
        )}
        {meta?.status && (
          <span className='ax-chip' data-variant={resolveStatusVariant(meta.status)}>
            STATUS :: {meta.status.toUpperCase()}
          </span>
        )}
        {showHotkeys && <span className='ax-chip' data-variant='info'>HOTKEY :: F11</span>}
      </div>

      <div className='ax-status-line__group ax-status-line__group--right'>
        {meta?.zone && (
          <span className='ax-chip' data-variant='info'>ZONE :: {meta.zone}</span>
        )}
        <span className='ax-chip' data-variant='level'>VER :: {meta?.version || 'N/A'}</span>
        <span className='ax-chip' data-variant='info'>ENV :: {envTag}</span>
        {buildTs && <span className='ax-chip' data-variant='info'>BUILD :: {buildTs}</span>}
        <span className='ax-chip' data-variant={online ? 'online' : 'error'} aria-live='off'>
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
        <span className='ax-status-line__time'>{now}</span>
      </div>
    </div>
  )
}
