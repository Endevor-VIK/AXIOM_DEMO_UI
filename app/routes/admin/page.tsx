import React, { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminHealth,
  listAdminUsers,
  type AdminUserRecord,
  updateAdminUserRoles,
} from '@/lib/admin/api'
import { logout } from '@/lib/identity/authService'
import { useSession } from '@/lib/identity/useSession'

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

function parseRolesInput(value: string): string[] {
  const roles = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(roles))
}

function mapError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'missing_credentials') return 'Нужно указать логин и пароль.'
  if (message === 'missing_roles') return 'Нужно передать роли.'
  if (message === 'user_exists') return 'Пользователь уже существует.'
  if (message === 'user_not_found') return 'Пользователь не найден.'
  if (message === 'cannot_delete_self') return 'Нельзя удалить текущий аккаунт.'
  if (message === 'cannot_delete_creator') return 'Нельзя удалить пользователя с ролью creator.'
  if (message === 'forbidden') return 'Доступ запрещён.'
  if (message === 'unauthorized') return 'Сессия истекла. Перезайдите в админку.'
  return 'Операция завершилась с ошибкой.'
}

function formatDateTime(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('ru-RU')
}

export default function AdminPage() {
  const navigate = useNavigate()
  const session = useSession()

  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [busyUsers, setBusyUsers] = useState(false)
  const [busyAction, setBusyAction] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRoles, setCreateRoles] = useState('user')
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({})

  const [health, setHealth] = useState<HealthState>({
    status: 'loading',
    checkedAt: null,
    message: 'Проверяем API...',
  })

  const [opsLog, setOpsLog] = useState<OperationLog[]>([])

  const pushOperation = useCallback((text: string) => {
    setOpsLog((prev) => {
      const next = [{ id: Date.now(), at: Date.now(), text }, ...prev]
      return next.slice(0, 20)
    })
  }, [])

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
      setError(null)
      pushOperation(`Обновлён список пользователей (${nextUsers.length})`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusyUsers(false)
    }
  }, [pushOperation])

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

  useEffect(() => {
    refreshUsers().catch(() => undefined)
    refreshHealth().catch(() => undefined)
    const timer = window.setInterval(() => {
      refreshHealth().catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [refreshHealth, refreshUsers])

  const creatorCount = useMemo(
    () => users.filter((user) => user.roles.includes('creator')).length,
    [users],
  )

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
      setError(null)
      pushOperation(`Удалён пользователь ${user.email}`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusyAction(false)
    }
  }

  async function onLogout() {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <main className='ax-admin'>
      <header className='ax-admin__header'>
        <div>
          <p className='ax-admin__eyebrow'>AXIOM ADMIN CONSOLE</p>
          <h1>Управление системой</h1>
          <p className='ax-admin__note'>
            Вход выполнен как <b>{session.user?.displayName ?? 'CREATOR'}</b>. Всего пользователей: <b>{users.length}</b>,
            creator: <b>{creatorCount}</b>.
          </p>
        </div>
        <div className='ax-admin__header-actions'>
          <button type='button' className='ax-btn ghost' onClick={() => refreshUsers()} disabled={busyUsers || busyAction}>
            Обновить пользователей
          </button>
          <button type='button' className='ax-btn ghost' onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      {error ? <div className='ax-admin__error'>{error}</div> : null}

      <section className='ax-admin__grid'>
        <article className='ax-admin-card'>
          <h2>Пользователи и роли</h2>
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
                  const disableDelete = hasCreatorRole || user.id === session.user?.id
                  return (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <input
                          value={roleDrafts[user.id] ?? user.roles.join(', ')}
                          onChange={(event) => {
                            const value = event.target.value
                            setRoleDrafts((prev) => ({ ...prev, [user.id]: value }))
                          }}
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
                    <td colSpan={4}>{busyUsers ? 'Загрузка...' : 'Пользователей нет.'}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className='ax-admin-card'>
          <h2>Мониторинг терминала (MVP)</h2>
          <p>
            Статус API: <b data-state={health.status}>{health.message}</b>
          </p>
          <p>Последняя проверка: {formatDateTime(health.checkedAt)}</p>
          <p className='ax-admin-card__hint'>
            Дальше можно подключить websocket/stream логов Fastify и отдельный лог-канал для runtime.
          </p>
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
          <p className='ax-admin-card__hint'>
            Следующий этап: вынести сюда полный CRUD контента и редактор публикации.
          </p>
        </article>
      </section>
    </main>
  )
}
