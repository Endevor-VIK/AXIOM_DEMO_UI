import React, { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { adminLogin, adminLogout } from '@/lib/admin/authService'
import { useAdminSession } from '@/lib/admin/useAdminSession'

import '@/styles/admin-console.css'

type AdminLoginState = {
  from?: string
}

function resolveAdminRedirect(state: unknown): string {
  const from = (state as AdminLoginState | null)?.from
  if (typeof from === 'string' && from.startsWith('/admin')) {
    return from
  }
  return '/admin'
}

function mapError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'invalid_credentials') return 'Invalid username or password.'
  if (message === 'rate_limited') return 'Too many attempts. Try again in a minute.'
  if (message === 'forbidden') return 'Insufficient permissions for admin access.'
  return 'Login failed. Please try again.'
}

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAdminSession()

  const redirectTo = useMemo(() => resolveAdminRedirect(location.state), [location.state])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session.isLoading) return
    if (!session.isAuthenticated) return

    const roles = session.user?.roles ?? []
    if (roles.includes('creator')) {
      navigate(redirectTo, { replace: true })
      return
    }

    setError('Current session does not include required admin role. Access denied.')
  }, [navigate, redirectTo, session.isAuthenticated, session.isLoading, session.user?.roles])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const email = username.trim().toLowerCase()
    if (!email || !password) {
      setError('Enter username and password.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const nextSession = await adminLogin({ email, password })
      const roles = nextSession.user?.roles ?? []
      if (!roles.includes('creator')) {
        await adminLogout()
        throw new Error('forbidden')
      }
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className='ax-admin-login'>
      <section className='ax-admin-login__card'>
        <p className='ax-admin-login__eyebrow'>AXIOM ADMIN</p>
        <h1>Admin Sign In</h1>
        <p className='ax-admin-login__note'>
          Enter your admin credentials to continue.
        </p>

        <form className='ax-admin-login__form' onSubmit={onSubmit} autoComplete='off'>
          <label>
            Username
            <input
              autoComplete='off'
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder='Username'
            />
          </label>
          <label>
            Password
            <input
              type='password'
              autoComplete='new-password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder='Password'
            />
          </label>
          {error ? <div className='ax-admin-login__error'>{error}</div> : null}
          <button className='ax-btn ax-btn--danger' type='submit' disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className='ax-admin-login__links'>
          <Link to='/login'>Main Login</Link>
          <Link to='/dashboard'>Open Dashboard</Link>
        </div>
      </section>
    </main>
  )
}
