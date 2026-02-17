import React, { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminHealth,
  fetchAdminUserHistory,
  listAdminEvents,
  listAdminUsers,
  type AdminAuditEventRecord,
  type AdminSessionSnapshot,
  type AdminUserHistory,
  type AdminUserRecord,
  updateAdminUserCredentials,
  updateAdminUserRoles,
} from '@/lib/admin/api'
import { adminLogout } from '@/lib/admin/authService'
import { useAdminSession } from '@/lib/admin/useAdminSession'

import '@/styles/admin-console.css'

type HealthState = {
  status: 'loading' | 'ok' | 'error'
  checkedAt: number | null
  message: string
}

type OperationLog = {
  id: number
  at: number
  text: string
}

type CredentialsDraft = {
  userId: string
  email: string
  password: string
}

const EMPTY_HISTORY: AdminUserHistory = {
  sessions: [],
  events: [],
}

const SYSTEM_ROLES = new Set(['service', 'system', 'bot', 'scanner', 'agent'])

function parseRolesInput(value: string): string[] {
  const roles = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(roles))
}

function isSystemAccount(user: AdminUserRecord): boolean {
  if (user.roles.some((role) => SYSTEM_ROLES.has(role.toLowerCase()))) return true
  const email = user.email.toLowerCase()
  return (
    email.startsWith('ui_scan_')
    || email.startsWith('svc_')
    || email.startsWith('system_')
    || email.endsWith('.svc')
  )
}

function mapError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'missing_credentials') return 'Нужно указать логин и пароль.'
  if (message === 'missing_roles') return 'Нужно передать роли.'
  if (message === 'user_exists') return 'Пользователь уже существует.'
  if (message === 'user_not_found') return 'Пользователь не найден.'
  if (message === 'cannot_delete_self') return 'Нельзя удалить текущий аккаунт.'
  if (message === 'cannot_delete_creator') return 'Нельзя удалить пользователя с ролью creator.'
  if (message === 'missing_update_fields') return 'Укажите новый логин и/или новый пароль.'
  if (message === 'email_in_use') return 'Этот логин уже занят другим аккаунтом.'
  if (message === 'forbidden') return 'Доступ запрещён.'
  if (message === 'unauthorized') return 'Сессия истекла. Перезайдите в админку.'
  return `Операция завершилась с ошибкой: ${message || 'unknown_error'}.`
}

function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('ru-RU')
}

function shortUserAgent(value: string | null): string {
  if (!value) return '—'
  if (value.length <= 96) return value
  return `${value.slice(0, 96)}...`
}

function describeEvent(event: AdminAuditEventRecord): string {
  const status = event.status ? ` [${event.status}]` : ''
  const suffix = event.ip ? ` • ${event.ip}` : ''
  return `${event.eventType}${status} • ${event.message || event.scope}${suffix}`
}

function AccountTable(props: {
  title: string
  users: AdminUserRecord[]
  roleDrafts: Record<string, string>
  busyAction: boolean
  currentUserId: string | undefined
  emptyText: string
  onRoleDraftChange: (userId: string, value: string) => void
  onSaveRoles: (userId: string) => void
  onDeleteUser: (user: AdminUserRecord) => void
  onSelectUser: (userId: string) => void
}) {
  const {
    title,
    users,
    roleDrafts,
    busyAction,
    currentUserId,
    emptyText,
    onRoleDraftChange,
    onSaveRoles,
    onDeleteUser,
    onSelectUser,
  } = props

  return (
    <article className='ax-admin-card'>
      <h2>{title}</h2>
      <div className='ax-admin-table-wrap'>
        <table className='ax-admin-table'>
          <thead>
            <tr>
              <th>Логин</th>
              <th>Роли</th>
              <th>Создан</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const hasCreatorRole = user.roles.includes('creator')
              const disableDelete = hasCreatorRole || user.id === currentUserId
              return (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    <input
                      value={roleDrafts[user.id] ?? user.roles.join(', ')}
                      onChange={(event) => onRoleDraftChange(user.id, event.target.value)}
                    />
                  </td>
                  <td>{formatDateTime(user.createdAt)}</td>
                  <td className='ax-admin-table__actions'>
                    <button
                      type='button'
                      className='ax-btn ghost'
                      onClick={() => onSaveRoles(user.id)}
                      disabled={busyAction}
                    >
                      Сохранить роли
                    </button>
                    <button
                      type='button'
                      className='ax-btn ghost'
                      onClick={() => onSelectUser(user.id)}
                    >
                      История
                    </button>
                    <button
                      type='button'
                      className='ax-btn ghost'
                      onClick={() => onDeleteUser(user)}
                      disabled={busyAction || disableDelete}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              )
            })}
            {!users.length ? (
              <tr>
                <td colSpan={4}>{emptyText}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const session = useAdminSession()

  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [busyUsers, setBusyUsers] = useState(false)
  const [busyAction, setBusyAction] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRoles, setCreateRoles] = useState('user')
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({})

  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [credentialsDraft, setCredentialsDraft] = useState<CredentialsDraft>({
    userId: '',
    email: '',
    password: '',
  })

  const [history, setHistory] = useState<AdminUserHistory>(EMPTY_HISTORY)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [events, setEvents] = useState<AdminAuditEventRecord[]>([])

  const [health, setHealth] = useState<HealthState>({
    status: 'loading',
    checkedAt: null,
    message: 'Проверяем API...',
  })

  const [opsLog, setOpsLog] = useState<OperationLog[]>([])

  const pushOperation = useCallback((text: string) => {
    setOpsLog((prev) => {
      const next = [{ id: Date.now(), at: Date.now(), text }, ...prev]
      return next.slice(0, 30)
    })
  }, [])

  const userAccounts = useMemo(
    () => users.filter((user) => !isSystemAccount(user)),
    [users],
  )
  const systemAccounts = useMemo(
    () => users.filter((user) => isSystemAccount(user)),
    [users],
  )

  const creatorCount = useMemo(
    () => users.filter((user) => user.roles.includes('creator')).length,
    [users],
  )

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  )

  const refreshUsers = useCallback(async () => {
    setBusyUsers(true)
    try {
      const nextUsers = await listAdminUsers()
      setUsers(nextUsers)
      setRoleDrafts((prev) => {
        const draft = { ...prev }
        for (const user of nextUsers) {
          draft[user.id] = prev[user.id] ?? user.roles.join(', ')
        }
        return draft
      })
      setSelectedUserId((prev) => {
        if (prev && nextUsers.some((user) => user.id === prev)) return prev
        const currentId = session.user?.id
        if (currentId && nextUsers.some((user) => user.id === currentId)) return currentId
        const first = nextUsers.find((user) => !isSystemAccount(user)) || nextUsers[0]
        return first?.id || ''
      })
      setCredentialsDraft((prev) => {
        if (prev.userId && nextUsers.some((user) => user.id === prev.userId)) return prev
        const currentId = session.user?.id
        const current = currentId ? nextUsers.find((user) => user.id === currentId) : null
        const first = current || nextUsers.find((user) => !isSystemAccount(user)) || nextUsers[0]
        return {
          userId: first?.id || '',
          email: first?.email || '',
          password: '',
        }
      })
      setError(null)
      pushOperation(`Обновлён список пользователей (${nextUsers.length})`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusyUsers(false)
    }
  }, [pushOperation, session.user?.id])

  const refreshHealth = useCallback(async () => {
    try {
      const result = await fetchAdminHealth()
      setHealth({
        status: result.ok ? 'ok' : 'error',
        checkedAt: Date.now(),
        message: result.ok ? 'API online' : 'API unhealthy',
      })
    } catch (err) {
      setHealth({
        status: 'error',
        checkedAt: Date.now(),
        message: mapError(err),
      })
    }
  }, [])

  const refreshEvents = useCallback(async () => {
    try {
      const nextEvents = await listAdminEvents(120)
      setEvents(nextEvents)
    } catch (err) {
      setError(mapError(err))
    }
  }, [])

  const refreshHistory = useCallback(async (userId: string) => {
    if (!userId) {
      setHistory(EMPTY_HISTORY)
      return
    }
    setHistoryLoading(true)
    try {
      const nextHistory = await fetchAdminUserHistory(userId, 160)
      setHistory(nextHistory)
    } catch (err) {
      setHistory(EMPTY_HISTORY)
      setError(mapError(err))
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUsers().catch(() => undefined)
    refreshHealth().catch(() => undefined)
    refreshEvents().catch(() => undefined)
    const timer = window.setInterval(() => {
      refreshHealth().catch(() => undefined)
      refreshEvents().catch(() => undefined)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [refreshEvents, refreshHealth, refreshUsers])

  useEffect(() => {
    if (!selectedUserId) return
    refreshHistory(selectedUserId).catch(() => undefined)
  }, [refreshHistory, selectedUserId])

  useEffect(() => {
    if (!credentialsDraft.userId) return
    const target = users.find((user) => user.id === credentialsDraft.userId)
    if (!target) return
    setCredentialsDraft((prev) => ({
      ...prev,
      email: target.email,
    }))
  }, [credentialsDraft.userId, users])

  async function onCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyAction) return

    const email = createEmail.trim().toLowerCase()
    const password = createPassword.trim()
    const roles = parseRolesInput(createRoles)

    if (!email || !password) {
      setError('Укажите логин и пароль для нового пользователя.')
      return
    }

    if (!roles.length) {
      setError('Укажите хотя бы одну роль.')
      return
    }

    setBusyAction(true)
    try {
      await createAdminUser({ email, password, roles })
      setCreateEmail('')
      setCreatePassword('')
      setCreateRoles('user')
      await refreshUsers()
      await refreshEvents()
      setError(null)
      pushOperation(`Создан пользователь ${email} (roles: ${roles.join(', ')})`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusyAction(false)
    }
  }

  async function onSaveRoles(userId: string) {
    if (busyAction) return

    const rolesInput = roleDrafts[userId] ?? ''
    const roles = parseRolesInput(rolesInput)
    if (!roles.length) {
      setError('Роли не могут быть пустыми.')
      return
    }

    setBusyAction(true)
    try {
      await updateAdminUserRoles(userId, roles)
      await refreshUsers()
      await refreshEvents()
      setError(null)
      pushOperation(`Обновлены роли для ${userId}: ${roles.join(', ')}`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusyAction(false)
    }
  }

  async function onDeleteUser(user: AdminUserRecord) {
    if (busyAction) return

    const confirmed = window.confirm(`Удалить пользователя ${user.email}?`)
    if (!confirmed) return

    setBusyAction(true)
    try {
      await deleteAdminUser(user.id)
      await refreshUsers()
      await refreshEvents()
      setError(null)
      pushOperation(`Удалён пользователь ${user.email}`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusyAction(false)
    }
  }

  async function onUpdateCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyAction) return

    const userId = credentialsDraft.userId
    const email = credentialsDraft.email.trim().toLowerCase()
    const password = credentialsDraft.password.trim()
    if (!userId) {
      setError('Выберите пользователя для изменения логина/пароля.')
      return
    }
    if (!email && !password) {
      setError('Укажите новый логин и/или новый пароль.')
      return
    }

    setBusyAction(true)
    try {
      const result = await updateAdminUserCredentials({
        userId,
        ...(email ? { email } : {}),
        ...(password ? { password } : {}),
      })
      setCredentialsDraft((prev) => ({ ...prev, password: '', email: result.user?.email || email }))
      await refreshUsers()
      await refreshHistory(userId)
      await refreshEvents()
      setError(null)
      pushOperation(
        `Обновлены credentials для ${result.user?.email || userId}: `
        + `login=${result.emailChanged ? 'yes' : 'no'}, password=${result.passwordChanged ? 'yes' : 'no'}`,
      )
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusyAction(false)
    }
  }

  async function onLogout() {
    setBusyAction(true)
    try {
      await Promise.race([
        adminLogout(),
        new Promise((resolve) => window.setTimeout(resolve, 1200)),
      ])
    } finally {
      navigate('/admin/login', { replace: true })
      window.location.replace('/admin/login')
    }
  }

  function renderSessions(sessions: AdminSessionSnapshot[]) {
    if (!sessions.length) {
      return <li>Сессий пока нет.</li>
    }
    return sessions.slice(0, 40).map((sessionRow) => (
      <li key={sessionRow.id} className='ax-admin-history__row'>
        <span>{formatDateTime(sessionRow.createdAt)}</span>
        <span>{sessionRow.ip || 'no-ip'} • {sessionRow.device} • {sessionRow.network} • {sessionRow.region}</span>
        <span>{sessionRow.revokedAt ? `revoked ${formatDateTime(sessionRow.revokedAt)}` : 'active/valid'}</span>
      </li>
    ))
  }

  function renderEvents(items: AdminAuditEventRecord[]) {
    if (!items.length) return <li>Событий пока нет.</li>
    return items.slice(0, 60).map((entry) => (
      <li key={entry.id} className='ax-admin-history__row'>
        <span>{formatDateTime(entry.createdAt)}</span>
        <span>{describeEvent(entry)}</span>
        <span>{shortUserAgent(entry.ua)}</span>
      </li>
    ))
  }

  return (
    <main className='ax-admin'>
      <header className='ax-admin__header'>
        <div>
          <p className='ax-admin__eyebrow'>AXIOM ADMIN CONSOLE</p>
          <h1>Управление системой</h1>
          <p className='ax-admin__note'>
            Вход выполнен как <b>{session.user?.displayName ?? 'CREATOR'}</b>. Пользователи: <b>{users.length}</b>,
            creator: <b>{creatorCount}</b>, сервисы: <b>{systemAccounts.length}</b>.
          </p>
        </div>
        <div className='ax-admin__header-actions'>
          <button type='button' className='ax-btn ghost' onClick={() => refreshUsers()} disabled={busyUsers || busyAction}>
            Обновить пользователей
          </button>
          <button type='button' className='ax-btn ghost' onClick={() => refreshEvents()} disabled={busyAction}>
            Обновить консоль
          </button>
          <button type='button' className='ax-btn ghost' onClick={onLogout} disabled={busyAction}>
            Выйти
          </button>
        </div>
      </header>

      {error ? <div className='ax-admin__error'>{error}</div> : null}

      <section className='ax-admin__grid'>
        <article className='ax-admin-card'>
          <h2>Новый аккаунт</h2>
          <form className='ax-admin-create' onSubmit={onCreateUser}>
            <input
              value={createEmail}
              onChange={(event) => setCreateEmail(event.target.value)}
              placeholder='Логин (пример: operator_01)'
            />
            <input
              type='password'
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
              placeholder='Пароль'
            />
            <input
              value={createRoles}
              onChange={(event) => setCreateRoles(event.target.value)}
              placeholder='Роли через запятую: user,admin'
            />
            <button type='submit' className='ax-btn ax-btn--danger' disabled={busyAction}>
              Добавить аккаунт
            </button>
          </form>
        </article>

        <article className='ax-admin-card'>
          <h2>Смена логина/пароля</h2>
          <form className='ax-admin-credentials' onSubmit={onUpdateCredentials}>
            <select
              value={credentialsDraft.userId}
              onChange={(event) => setCredentialsDraft((prev) => ({ ...prev, userId: event.target.value, password: '' }))}
            >
              <option value=''>Выберите аккаунт</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
            <input
              value={credentialsDraft.email}
              onChange={(event) => setCredentialsDraft((prev) => ({ ...prev, email: event.target.value }))}
              placeholder='Новый логин'
            />
            <input
              type='password'
              value={credentialsDraft.password}
              onChange={(event) => setCredentialsDraft((prev) => ({ ...prev, password: event.target.value }))}
              placeholder='Новый пароль (опционально)'
            />
            <button type='submit' className='ax-btn ax-btn--danger' disabled={busyAction}>
              Применить
            </button>
          </form>
          <p className='ax-admin-card__hint'>
            После смены логина/пароля сессии пользователя будут принудительно завершены.
          </p>
        </article>

        <AccountTable
          title='Пользователи и роли'
          users={userAccounts}
          roleDrafts={roleDrafts}
          busyAction={busyAction}
          currentUserId={session.user?.id}
          emptyText={busyUsers ? 'Загрузка...' : 'Пользователей нет.'}
          onRoleDraftChange={(userId, value) => setRoleDrafts((prev) => ({ ...prev, [userId]: value }))}
          onSaveRoles={onSaveRoles}
          onDeleteUser={onDeleteUser}
          onSelectUser={setSelectedUserId}
        />

        <AccountTable
          title='Системные службы / сервисные аккаунты'
          users={systemAccounts}
          roleDrafts={roleDrafts}
          busyAction={busyAction}
          currentUserId={session.user?.id}
          emptyText='Сервисных аккаунтов нет.'
          onRoleDraftChange={(userId, value) => setRoleDrafts((prev) => ({ ...prev, [userId]: value }))}
          onSaveRoles={onSaveRoles}
          onDeleteUser={onDeleteUser}
          onSelectUser={setSelectedUserId}
        />

        <article className='ax-admin-card'>
          <h2>Live Console (API)</h2>
          <p>
            Статус API: <b data-state={health.status}>{health.message}</b>
          </p>
          <p>Последняя проверка: {formatDateTime(health.checkedAt)}</p>
          <ul className='ax-admin-history ax-admin-history--console'>
            {renderEvents(events)}
          </ul>
        </article>

        <article className='ax-admin-card'>
          <h2>История пользователя</h2>
          <p className='ax-admin-card__hint'>
            Пользователь: <b>{selectedUser?.email || 'не выбран'}</b>
          </p>
          {historyLoading ? <p>Загрузка истории...</p> : null}
          <h3 className='ax-admin-card__sub'>Сессии и подключения</h3>
          <ul className='ax-admin-history'>
            {renderSessions(history.sessions)}
          </ul>
          <h3 className='ax-admin-card__sub'>Действия</h3>
          <ul className='ax-admin-history'>
            {renderEvents(history.events)}
          </ul>
        </article>

        <article className='ax-admin-card'>
          <h2>История операций (локально)</h2>
          <ul className='ax-admin-history'>
            {opsLog.length ? (
              opsLog.map((entry) => (
                <li key={entry.id}>
                  <span>{formatDateTime(entry.at)}</span>
                  <span>{entry.text}</span>
                </li>
              ))
            ) : (
              <li>Операций пока нет.</li>
            )}
          </ul>
        </article>

        <article className='ax-admin-card'>
          <h2>Контент и сайт</h2>
          <div className='ax-admin-links'>
            <Link to='/dashboard/content'>Открыть Content Hub</Link>
            <Link to='/dashboard/news'>Открыть News</Link>
            <Link to='/settings'>Открыть Settings</Link>
          </div>
        </article>
      </section>
    </main>
  )
}
