// AXIOM_DEMO_UI - WEB CORE
// Canvas: C11 - app/routes/login/page.tsx
// Purpose: Red Protocol login with animated emblem and dual mode (login/register).

import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hashPassword, verifyPassword, loadUsers, saveUser, type AuthUser } from '@/lib/auth'

type Mode = 'login' | 'register'

const TITLES: Record<Mode, string> = {
  login: 'WELCOME TO AXIOM PANEL',
  register: 'REGISTER NEW OPERATIVE',
}

const SUBTITLES: Record<Mode, string> = {
  login: 'RED PROTOCOL ACCESS GATEWAY',
  register: 'PROVISION ACCESS KEY',
}

export default function LoginPage() {
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const title = useMemo(() => TITLES[mode], [mode])
  const subtitle = useMemo(() => SUBTITLES[mode], [mode])
  const chipLabel = mode === 'login' ? 'MODE :: ACCESS' : 'MODE :: REGISTER'
  const chipVariant = mode === 'login' ? 'online' : 'info'
  const hasError = Boolean(err)

  const handleToggleMode = useCallback(() => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'))
    setErr(null)
    setPassword('')
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (busy) return
      setBusy(true)
      setErr(null)
      try {
        if (mode === 'register') {
          const exists = (await loadUsers()).find((u) => u.login === login)
          if (exists) throw new Error('User already exists')
          const hashed = await hashPassword(password)
          const user: AuthUser = { login, password: hashed, createdAt: new Date().toISOString() }
          await saveUser(user)
        } else {
          const users = await loadUsers()
          const user = users.find((u) => u.login === login)
          if (!user) throw new Error('Invalid credentials')
          const ok = await verifyPassword(password, user.password)
          if (!ok) throw new Error('Invalid credentials')
        }
        localStorage.setItem('axiom.auth', JSON.stringify({ login, ts: Date.now() }))
        nav('/dashboard', { replace: true })
      } catch (error: any) {
        const message = (error && error.message) || 'Unable to authenticate'
        setErr(message)
      } finally {
        setBusy(false)
      }
    },
    [busy, login, password, mode, nav]
  )

  const cardClasses = ['ax-card', 'low', 'ax-login-card']
  if (hasError) cardClasses.push('is-error')

  return (
    <section className='ax-login ax-section'>
      <div className='ax-container'>
        <form
          className={cardClasses.join(' ')}
          onSubmit={handleSubmit}
          aria-busy={busy}
          aria-labelledby='login-title'
          aria-describedby={hasError ? 'login-error' : undefined}
        >
          <h1 id='login-title' className='ax-blade-head'>
            {title}
          </h1>
          <p className='ax-login-sub'>{subtitle}</p>
          <div className='ax-login-meta'>
            <span className='ax-chip' data-variant={chipVariant}>
              {chipLabel}
            </span>
            <span className='ax-chip' data-variant='level'>RED PROTOCOL</span>
          </div>
          <div aria-hidden='true' className='ax-login-emblem' />
          <label className='ax-visually-hidden' htmlFor='login'>User ID</label>
          <input
            id='login'
            className={`ax-input${hasError ? ' is-invalid' : ''}`}
            name='user'
            placeholder='USER ID'
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            autoComplete='username'
            required
            aria-invalid={hasError ? 'true' : undefined}
            disabled={busy}
          />
          <label className='ax-visually-hidden' htmlFor='key'>Access Key</label>
          <input
            id='key'
            className={`ax-input${hasError ? ' is-invalid' : ''}`}
            name='key'
            placeholder='ACCESS KEY'
            type='password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            aria-invalid={hasError ? 'true' : undefined}
            disabled={busy}
          />
          {err && (
            <div id='login-error' role='alert' aria-live='assertive' className='ax-login-error'>
              {err}
            </div>
          )}
          <div className='ax-row ax-login-actions'>
            <button type='button' className='ax-btn ghost' onClick={handleToggleMode} disabled={busy}>
              {mode === 'login' ? 'REQUEST ACCESS' : 'BACK TO LOGIN'}
            </button>
            <button type='submit' className='ax-btn primary' disabled={busy}>
              {mode === 'login' ? 'ENTRANCE' : 'REGISTER'}
            </button>
          </div>
          <div className='ax-hr-blade' aria-hidden='true' />
          <small className='ax-login-foot'>AXIOM DESIGN (C) 2025 - RED PROTOCOL</small>
        </form>
      </div>
    </section>
  )
}
