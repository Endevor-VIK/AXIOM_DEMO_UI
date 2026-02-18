import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
  createAdminStream,
  createAdminUser,
  deleteAdminUser,
  fetchAdminSnapshot,
  fetchAdminUserAxchat,
  fetchAdminHealth,
  fetchAdminUserHistory,
  fetchAdminUserTimeline,
  listAdminEvents,
  listAdminUsers,
  type AdminAxchatEntry,
  type AdminAuditEventRecord,
  type AdminLiveSnapshot,
  type AdminLiveUser,
  type AdminTimelineEvent,
  type AdminSessionSnapshot,
  type AdminUserHistory,
  type AdminUserRecord,
  updateAdminUserCredentials,
  updateAdminUserRoles,
} from '@/lib/admin/api'
import { adminLogout } from '@/lib/admin/authService'
import { ADMIN_URL_COMMANDS_REFERENCE } from '@/lib/admin/urlCommandReference'
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

type SectionKey =
  | 'users'
  | 'services'
  | 'console'
  | 'userHistory'
  | 'ops'
  | 'content'
  | 'commands'

type StreamTabKey = 'axchat' | 'telemetry' | 'api' | 'errors'
type StreamConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline'

type StreamLine = {
  id: number
  at: number
  text: string
}

type StreamState = Record<StreamTabKey, StreamLine[]>

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
  if (message === 'Not Found' || message === 'not_found') return 'Live API endpoint не найден (404).'
  return `Операция завершилась с ошибкой: ${message || 'unknown_error'}.`
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeStatus = Number((error as { status?: unknown }).status)
  if (Number.isFinite(maybeStatus) && maybeStatus === 404) return true
  const message = String((error as { message?: unknown }).message || '').trim().toLowerCase()
  return message === 'not found' || message === 'not_found'
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

function formatSince(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp)
  if (diff < 1000) return 'только что'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}с назад`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}м назад`
  return `${Math.floor(diff / 3_600_000)}ч назад`
}

function describeTimelineEvent(event: AdminTimelineEvent): string {
  const payload = event.payload || {}
  if (event.type === 'presence.heartbeat') {
    return `presence • ${String(payload.path || '/')} • visible=${String(payload.visible ?? true)}`
  }
  if (event.type === 'nav.route_change') {
    return `route: ${String(payload.from || '—')} → ${String(payload.to || '—')}`
  }
  if (event.type === 'content.open') {
    return `content.open • ${String(payload.contentType || 'content')}#${String(payload.contentId || '—')}`
  }
  if (event.type === 'content.read_progress') {
    return `read_progress • ${String(payload.contentId || '—')} • ${String(payload.progress ?? '—')}%`
  }
  if (event.type.startsWith('axchat.')) {
    return `${event.type} • ${String(payload.role || 'system')}`
  }
  return `${event.type} • ${JSON.stringify(payload)}`
}

function formatCredentialLabel(user: AdminUserRecord): string {
  const roles = user.roles.join(', ') || 'user'
  return `${user.email} (${roles})`
}

function describeStreamConnection(state: StreamConnectionState): string {
  if (state === 'connected') return 'CONNECTED'
  if (state === 'reconnecting') return 'RECONNECTING'
  if (state === 'connecting') return 'CONNECTING'
  return 'OFFLINE'
}

function AccountTable(props: {
  title: string
  users: AdminUserRecord[]
  sectionKey: SectionKey
  collapsed: boolean
  roleDrafts: Record<string, string>
  busyAction: boolean
  currentUserId: string | undefined
  emptyText: string
  onToggle: (key: SectionKey) => void
  onRoleDraftChange: (userId: string, value: string) => void
  onSaveRoles: (userId: string) => void
  onDeleteUser: (user: AdminUserRecord) => void
  onSelectUser: (userId: string) => void
}) {
  const {
    title,
    users,
    sectionKey,
    collapsed,
    roleDrafts,
    busyAction,
    currentUserId,
    emptyText,
    onToggle,
    onRoleDraftChange,
    onSaveRoles,
    onDeleteUser,
    onSelectUser,
  } = props

  return (
    <article className='ax-admin-card'>
      <div className='ax-admin-card__head'>
        <h2>{title}</h2>
        <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => onToggle(sectionKey)}>
          {collapsed ? 'Развернуть' : 'Свернуть'}
        </button>
      </div>
      {collapsed ? null : (
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
      )}
    </article>
  )
}

function CredentialsUserSelect(props: {
  options: AdminUserRecord[]
  selectedUserId: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  onSelect: (user: AdminUserRecord) => void
}) {
  const {
    options,
    selectedUserId,
    open,
    onToggle,
    onClose,
    onSelect,
  } = props

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const selected = options.find((user) => user.id === selectedUserId) || null

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(event.target as Node)) return
      onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open, onClose])

  return (
    <div className='ax-admin-user-select' ref={wrapperRef}>
      <button
        type='button'
        className={`ax-admin-user-select__trigger${selected ? '' : ' is-empty'}${open ? ' is-open' : ''}`}
        aria-haspopup='listbox'
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{selected ? formatCredentialLabel(selected) : 'Выберите аккаунт'}</span>
        <span aria-hidden='true'>▾</span>
      </button>
      {open ? (
        <div className='ax-admin-user-select__menu' role='listbox' aria-label='Список аккаунтов'>
          {options.length ? (
            options.map((user) => (
              <button
                key={user.id}
                type='button'
                className={`ax-admin-user-select__option${selectedUserId === user.id ? ' is-active' : ''}`}
                onClick={() => {
                  onSelect(user)
                  onClose()
                }}
              >
                <span>{formatCredentialLabel(user)}</span>
                <span className='ax-admin-user-select__meta'>Создан: {formatDateTime(user.createdAt)}</span>
              </button>
            ))
          ) : (
            <p className='ax-admin-user-select__empty'>По фильтру ничего не найдено.</p>
          )}
        </div>
      ) : null}
    </div>
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
  const [selectedLiveUserId, setSelectedLiveUserId] = useState<string>('')
  const [credentialsDraft, setCredentialsDraft] = useState<CredentialsDraft>({
    userId: '',
    email: '',
    password: '',
  })
  const [credentialsSearch, setCredentialsSearch] = useState('')
  const [credentialsSelectOpen, setCredentialsSelectOpen] = useState(false)
  const [liveSearch, setLiveSearch] = useState('')

  const [history, setHistory] = useState<AdminUserHistory>(EMPTY_HISTORY)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [events, setEvents] = useState<AdminAuditEventRecord[]>([])
  const [liveSnapshot, setLiveSnapshot] = useState<AdminLiveSnapshot | null>(null)
  const [liveEndpointsAvailable, setLiveEndpointsAvailable] = useState(true)
  const [liveWarning, setLiveWarning] = useState<string | null>(null)
  const [liveTimeline, setLiveTimeline] = useState<AdminTimelineEvent[]>([])
  const [liveAxchat, setLiveAxchat] = useState<AdminAxchatEntry[]>([])
  const [streamConnection, setStreamConnection] = useState<StreamConnectionState>('connecting')
  const [streamPaused, setStreamPaused] = useState(false)
  const [streamReconnectNonce, setStreamReconnectNonce] = useState(0)
  const [streamTab, setStreamTab] = useState<StreamTabKey>('axchat')
  const [streamState, setStreamState] = useState<StreamState>({
    axchat: [],
    telemetry: [],
    api: [],
    errors: [],
  })
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    users: false,
    services: true,
    console: true,
    userHistory: true,
    ops: true,
    content: true,
    commands: true,
  })

  const [health, setHealth] = useState<HealthState>({
    status: 'loading',
    checkedAt: null,
    message: 'Проверяем API...',
  })

  const [opsLog, setOpsLog] = useState<OperationLog[]>([])
  const streamViewportRef = useRef<HTMLDivElement | null>(null)
  const streamReconnectTimerRef = useRef<number | null>(null)
  const streamReconnectAttemptRef = useRef(0)

  const pushOperation = useCallback((text: string) => {
    setOpsLog((prev) => {
      const next = [{ id: Date.now(), at: Date.now(), text }, ...prev]
      return next.slice(0, 30)
    })
  }, [])

  const pushStreamLine = useCallback((tab: StreamTabKey, text: string) => {
    setStreamState((prev) => {
      const nextLine: StreamLine = { id: Date.now() + Math.floor(Math.random() * 1000), at: Date.now(), text }
      const lines = [...prev[tab], nextLine].slice(-400)
      return {
        ...prev,
        [tab]: lines,
      }
    })
  }, [])

  const toggleSection = useCallback((key: SectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }))
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

  const fallbackLiveUsers = useMemo<AdminLiveUser[]>(() => {
    const now = Date.now()
    return userAccounts.map((user) => ({
      userId: user.id,
      login: user.email,
      role: user.roles[0] || 'user',
      status: 'OFFLINE',
      lastSeen: now,
      path: '/',
      visible: false,
      idleMs: 0,
      ipMasked: null,
      ua: null,
      sessions: 0,
      currentContentId: null,
      currentContentType: null,
      readProgress: null,
      dwellMs: null,
    }))
  }, [userAccounts])

  const liveUsers = useMemo(() => {
    const rows = liveEndpointsAvailable
      ? (liveSnapshot?.usersOnline || [])
      : fallbackLiveUsers
    const q = liveSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((entry) => {
      const haystack = `${entry.login} ${entry.role} ${entry.path}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [fallbackLiveUsers, liveEndpointsAvailable, liveSearch, liveSnapshot?.usersOnline])

  const selectedLiveUser = useMemo<AdminLiveUser | null>(() => {
    if (!liveUsers.length) return null
    const current = liveUsers.find((row) => row.userId === selectedLiveUserId)
    return current || liveUsers[0] || null
  }, [liveUsers, selectedLiveUserId])

  useEffect(() => {
    if (!liveUsers.length) return
    setSelectedLiveUserId((prev) => {
      if (prev && liveUsers.some((row) => row.userId === prev)) return prev
      return liveUsers[0]?.userId || ''
    })
  }, [liveUsers])

  const credentialCandidates = useMemo(() => {
    const q = credentialsSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => {
      const haystack = `${user.email} ${user.roles.join(', ')}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [credentialsSearch, users])

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
      setSelectedLiveUserId((prev) => {
        if (prev && nextUsers.some((user) => user.id === prev)) return prev
        if (!liveEndpointsAvailable) {
          const fallback = nextUsers.find((user) => !isSystemAccount(user)) || nextUsers[0]
          return fallback?.id || ''
        }
        return ''
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
      setLiveWarning(null)
      pushOperation(`Обновлён список пользователей (${nextUsers.length})`)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setBusyUsers(false)
    }
  }, [liveEndpointsAvailable, pushOperation, session.user?.id])

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

  const refreshLiveSnapshot = useCallback(async () => {
    try {
      const snapshot = await fetchAdminSnapshot()
      setLiveSnapshot(snapshot)
      setLiveEndpointsAvailable(true)
      setLiveWarning(null)
      setSelectedLiveUserId((prev) => {
        if (prev && snapshot.usersOnline.some((user) => user.userId === prev)) return prev
        const preferred = snapshot.usersOnline[0]
        return preferred?.userId || prev || ''
      })
    } catch (err) {
      if (isNotFoundError(err)) {
        setLiveEndpointsAvailable(false)
        setLiveSnapshot(null)
        setLiveTimeline([])
        setLiveAxchat([])
        setStreamConnection('offline')
        setLiveWarning('Live endpoints недоступны в текущем backend (404). Показан fallback без realtime.')
        return
      }
      setLiveWarning(mapError(err))
    }
  }, [])

  const refreshLiveUserDetails = useCallback(async (userId: string) => {
    if (!liveEndpointsAvailable) {
      setLiveTimeline([])
      setLiveAxchat([])
      return
    }
    if (!userId) {
      setLiveTimeline([])
      setLiveAxchat([])
      return
    }

    try {
      const [timelinePayload, axchatPayload] = await Promise.all([
        fetchAdminUserTimeline({ userId, limit: 120 }),
        fetchAdminUserAxchat({ userId, limit: 120 }),
      ])
      setLiveTimeline(timelinePayload.items || [])
      setLiveAxchat(axchatPayload.items || [])
    } catch (err) {
      if (isNotFoundError(err)) {
        setLiveEndpointsAvailable(false)
        setLiveWarning('Live endpoints недоступны в текущем backend (404).')
        setLiveTimeline([])
        setLiveAxchat([])
        return
      }
      setLiveWarning(mapError(err))
    }
  }, [liveEndpointsAvailable])

  useEffect(() => {
    refreshUsers().catch(() => undefined)
    refreshHealth().catch(() => undefined)
    refreshEvents().catch(() => undefined)
    refreshLiveSnapshot().catch(() => undefined)
  }, [refreshEvents, refreshHealth, refreshLiveSnapshot, refreshUsers])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return
      refreshUsers().catch(() => undefined)
      refreshHealth().catch(() => undefined)
      refreshEvents().catch(() => undefined)
    }, 10_000)
    return () => window.clearInterval(timer)
  }, [refreshEvents, refreshHealth, refreshUsers])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return
      if (!liveEndpointsAvailable) return
      refreshLiveSnapshot().catch(() => undefined)
    }, 5_000)
    return () => window.clearInterval(timer)
  }, [liveEndpointsAvailable, refreshLiveSnapshot])

  useEffect(() => {
    if (!selectedUserId) return
    refreshHistory(selectedUserId).catch(() => undefined)
  }, [refreshHistory, selectedUserId])

  useEffect(() => {
    if (!selectedLiveUserId || !liveEndpointsAvailable) return
    refreshLiveUserDetails(selectedLiveUserId).catch(() => undefined)
  }, [liveEndpointsAvailable, refreshLiveUserDetails, selectedLiveUserId])

  useEffect(() => {
    if (!selectedLiveUserId || !liveEndpointsAvailable) return
    const timer = window.setInterval(() => {
      if (document.hidden) return
      refreshLiveUserDetails(selectedLiveUserId).catch(() => undefined)
    }, 5_000)
    return () => window.clearInterval(timer)
  }, [liveEndpointsAvailable, refreshLiveUserDetails, selectedLiveUserId])

  useEffect(() => {
    if (!liveEndpointsAvailable) {
      setStreamConnection('offline')
      return
    }

    let closed = false
    const stream = createAdminStream({
      ...(selectedLiveUserId ? { userId: selectedLiveUserId } : {}),
      types: ['presence.update', 'telemetry', 'api.log', 'axchat.log', 'error'],
    })

    setStreamConnection(streamReconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting')

    const parseData = (event: Event) => {
      try {
        return JSON.parse((event as MessageEvent<string>).data)
      } catch {
        return null
      }
    }

    const onReady = () => {
      streamReconnectAttemptRef.current = 0
      setStreamConnection('connected')
      pushStreamLine('api', 'SSE подключён')
    }
    const onError = () => {
      if (closed) return
      setStreamConnection('reconnecting')
      const attempt = streamReconnectAttemptRef.current + 1
      streamReconnectAttemptRef.current = attempt
      const retryDelays = [1_000, 2_000, 5_000, 10_000] as const
      const delayRaw = retryDelays[Math.min(attempt - 1, retryDelays.length - 1)]
      const delay = typeof delayRaw === 'number' ? delayRaw : 10_000
      pushStreamLine('errors', `SSE разорван. Повтор через ${Math.floor(delay / 1000)}с.`)
      stream.close()
      if (streamReconnectTimerRef.current) window.clearTimeout(streamReconnectTimerRef.current)
      streamReconnectTimerRef.current = window.setTimeout(() => {
        setStreamReconnectNonce((prev) => prev + 1)
      }, delay)
    }

    const onPresence = (event: Event) => {
      const payload = parseData(event)
      if (!payload) return
      const userId = String(payload.userId || '')
      const status = payload?.data?.status || 'UNKNOWN'
      const path = payload?.data?.path || '/'
      pushStreamLine('telemetry', `presence ${userId} • ${status} • ${path}`)
      refreshLiveSnapshot().catch(() => undefined)
    }
    const onTelemetry = (event: Event) => {
      const payload = parseData(event)
      if (!payload) return
      pushStreamLine(
        'telemetry',
        `${String(payload.type || 'event')} • user=${String(payload.userId || '—')} • ${String(payload.sessionId || '—')}`,
      )
    }
    const onApi = (event: Event) => {
      const payload = parseData(event)
      if (!payload) return
      pushStreamLine(
        'api',
        `${String(payload.method || 'GET')} ${String(payload.url || '')} [${String(payload.statusCode || payload.status || '')}]`,
      )
    }
    const onAxchat = (event: Event) => {
      const payload = parseData(event)
      if (!payload) return
      pushStreamLine(
        'axchat',
        `${String(payload.role || 'system')}: ${String(payload.text || '').slice(0, 180)}`,
      )
      if (!selectedLiveUserId || String(payload.userId || '') === selectedLiveUserId) {
        refreshLiveUserDetails(selectedLiveUserId || String(payload.userId || '')).catch(() => undefined)
      }
    }
    const onStreamError = (event: Event) => {
      const payload = parseData(event)
      if (!payload) return
      pushStreamLine(
        'errors',
        `${String(payload.source || 'stream')} • ${String(payload.message || 'error')}`,
      )
    }

    stream.addEventListener('ready', onReady)
    stream.addEventListener('presence.update', onPresence)
    stream.addEventListener('telemetry', onTelemetry)
    stream.addEventListener('api.log', onApi)
    stream.addEventListener('axchat.log', onAxchat)
    stream.addEventListener('error', onStreamError)
    stream.onerror = onError
    stream.onopen = onReady

    return () => {
      closed = true
      if (streamReconnectTimerRef.current) {
        window.clearTimeout(streamReconnectTimerRef.current)
        streamReconnectTimerRef.current = null
      }
      stream.close()
    }
  }, [
    liveEndpointsAvailable,
    pushStreamLine,
    refreshLiveSnapshot,
    refreshLiveUserDetails,
    selectedLiveUserId,
    streamReconnectNonce,
  ])

  useEffect(() => {
    const viewport = streamViewportRef.current
    if (!viewport || streamPaused) return
    viewport.scrollTop = viewport.scrollHeight
  }, [streamPaused, streamState, streamTab])

  useEffect(() => {
    if (!credentialsDraft.userId) return
    const target = users.find((user) => user.id === credentialsDraft.userId)
    if (!target) return
    setCredentialsDraft((prev) => ({
      ...prev,
      email: target.email,
    }))
    setCredentialsSearch(target.email)
  }, [credentialsDraft.userId, users])

  function onSelectCredentialsUser(user: AdminUserRecord) {
    setCredentialsDraft((prev) => ({
      ...prev,
      userId: user.id,
      email: user.email,
      password: '',
    }))
    setCredentialsSearch(user.email)
    setCredentialsSelectOpen(false)
  }

  function onReconnectLive() {
    if (streamReconnectTimerRef.current) {
      window.clearTimeout(streamReconnectTimerRef.current)
      streamReconnectTimerRef.current = null
    }
    if (!liveEndpointsAvailable) {
      setLiveEndpointsAvailable(true)
    }
    setLiveWarning(null)
    setStreamConnection('connecting')
    streamReconnectAttemptRef.current = 0
    setStreamReconnectNonce((prev) => prev + 1)
    refreshLiveSnapshot().catch(() => undefined)
  }

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
      setCredentialsSearch(result.user?.email || email)
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
    if (busyAction) return
    setBusyAction(true)
    try {
      await adminLogout()
    } finally {
      setBusyAction(false)
      navigate('/admin/login', { replace: true, state: { from: '/admin' } })
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
          <button type='button' className='ax-btn ghost' onClick={onReconnectLive} disabled={busyAction}>
            {liveEndpointsAvailable ? 'Reconnect live' : 'Включить live'}
          </button>
          <button type='button' className='ax-btn ghost' onClick={onLogout} disabled={busyAction}>
            Выйти
          </button>
        </div>
      </header>

      {error ? <div className='ax-admin__error'>{error}</div> : null}
      {liveWarning ? <div className='ax-admin__info'>{liveWarning}</div> : null}

      <section className='ax-admin-live'>
        <article className='ax-admin-card ax-admin-live__col'>
          <div className='ax-admin-card__head'>
            <h2>Users Live</h2>
          </div>
          <p className='ax-admin-card__hint'>
            {liveEndpointsAvailable
              ? (
                  <>
                    Snapshot: {formatDateTime(liveSnapshot?.serverTime || null)} • online: <b>{liveSnapshot?.counters.online || 0}</b> •
                    idle: <b>{liveSnapshot?.counters.idle || 0}</b> • offline: <b>{liveSnapshot?.counters.offline || 0}</b>
                  </>
                )
              : (
                  <>Fallback mode: realtime endpoint не обнаружен. Показан базовый список пользователей.</>
                )}
          </p>
          <input
            value={liveSearch}
            onChange={(event) => setLiveSearch(event.target.value)}
            placeholder='Поиск user/path/role'
            className='ax-admin-live__search'
          />
          <ul className='ax-admin-live-users'>
            {liveUsers.length ? (
              liveUsers.map((entry) => (
                <li key={entry.userId}>
                  <button
                    type='button'
                    className={`ax-admin-live-user${entry.userId === selectedLiveUserId ? ' is-active' : ''}`}
                    onClick={() => setSelectedLiveUserId(entry.userId)}
                  >
                    <span><b>{entry.login}</b> • {entry.role}</span>
                    <span>{entry.status} • {formatSince(entry.lastSeen)}</span>
                    <span>{entry.path}</span>
                  </button>
                </li>
              ))
            ) : (
              <li>Нет данных для текущего фильтра.</li>
            )}
          </ul>
        </article>

        <article className='ax-admin-card ax-admin-live__col'>
          <div className='ax-admin-card__head'>
            <h2>User Inspector</h2>
          </div>
          {selectedLiveUser ? (
            <>
              <p className='ax-admin-card__hint'>
                <b>{selectedLiveUser.login}</b> • {selectedLiveUser.role} • {selectedLiveUser.status}
              </p>
              <p className='ax-admin-card__hint'>
                path: <code>{selectedLiveUser.path || '/'}</code> • visible: <b>{String(selectedLiveUser.visible)}</b> •
                sessions: <b>{selectedLiveUser.sessions}</b>
              </p>
              <p className='ax-admin-card__hint'>
                content: <b>{selectedLiveUser.currentContentType || '—'}</b> / <b>{selectedLiveUser.currentContentId || '—'}</b> •
                progress: <b>{selectedLiveUser.readProgress ?? '—'}</b>%
              </p>
              <h3 className='ax-admin-card__sub'>Timeline</h3>
              <ul className='ax-admin-history ax-admin-history--compact'>
                {liveTimeline.length ? (
                  liveTimeline.slice(0, 80).map((entry) => (
                    <li key={entry.id} className='ax-admin-history__row'>
                      <span>{formatDateTime(entry.ts)}</span>
                      <span>{describeTimelineEvent(entry)}</span>
                    </li>
                  ))
                ) : (
                  <li>Событий пока нет.</li>
                )}
              </ul>
            </>
          ) : (
            <p className='ax-admin-card__hint'>Выбери пользователя из live списка.</p>
          )}
        </article>

        <article className='ax-admin-card ax-admin-live__col'>
          <div className='ax-admin-card__head'>
            <h2>Live Streams</h2>
            <span className='ax-admin-live__status'>{describeStreamConnection(streamConnection)}</span>
          </div>
          <div className='ax-admin-live-tabs'>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => setStreamTab('axchat')}>AXchat</button>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => setStreamTab('telemetry')}>Telemetry</button>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => setStreamTab('api')}>API</button>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => setStreamTab('errors')}>Errors</button>
          </div>
          <div className='ax-admin-live-stream-controls'>
            <button
              type='button'
              className='ax-btn ghost ax-btn--mini'
              onClick={() => setStreamPaused((prev) => !prev)}
              disabled={!liveEndpointsAvailable}
            >
              Pause scrolling: {streamPaused ? 'ON' : 'OFF'}
            </button>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={onReconnectLive}>
              Reconnect
            </button>
          </div>
          <div ref={streamViewportRef} className='ax-admin-live-stream'>
            {(streamState[streamTab] || []).length ? (
              <ul className='ax-admin-history ax-admin-history--console'>
                {streamState[streamTab].slice(-120).map((row) => (
                  <li key={row.id} className='ax-admin-history__row'>
                    <span>{formatDateTime(row.at)}</span>
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='ax-admin-card__hint'>
                {liveEndpointsAvailable ? 'Поток пока пуст.' : 'Realtime stream отключён (fallback mode).'}
              </p>
            )}
          </div>
          {streamTab === 'axchat' ? (
            <>
              <h3 className='ax-admin-card__sub'>AXchat Audit (selected user)</h3>
              <ul className='ax-admin-history ax-admin-history--compact'>
                {liveAxchat.length ? (
                  liveAxchat.slice(0, 60).map((entry) => (
                    <li key={`${entry.ts}-${entry.requestId || ''}-${entry.role}`} className='ax-admin-history__row'>
                      <span>{formatDateTime(entry.ts)} • {entry.role}</span>
                      <span>{entry.text.slice(0, 240)}</span>
                    </li>
                  ))
                ) : (
                  <li>Логов axchat пока нет.</li>
                )}
              </ul>
            </>
          ) : null}
        </article>
      </section>

      <section className='ax-admin__grid'>
        <article className='ax-admin-card'>
          <div className='ax-admin-card__head'>
            <h2>Новый аккаунт</h2>
          </div>
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
          <div className='ax-admin-card__head'>
            <h2>Смена логина/пароля</h2>
          </div>
          <>
            <form className='ax-admin-credentials' onSubmit={onUpdateCredentials}>
              <input
                value={credentialsSearch}
                onChange={(event) => {
                  setCredentialsSearch(event.target.value)
                  setCredentialsSelectOpen(true)
                }}
                onFocus={() => setCredentialsSelectOpen(true)}
                placeholder='Поиск аккаунта (login/role)'
              />
              <CredentialsUserSelect
                options={credentialCandidates}
                selectedUserId={credentialsDraft.userId}
                open={credentialsSelectOpen}
                onToggle={() => setCredentialsSelectOpen((prev) => !prev)}
                onClose={() => setCredentialsSelectOpen(false)}
                onSelect={onSelectCredentialsUser}
              />
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
          </>
        </article>

        <AccountTable
          title='Пользователи и роли'
          sectionKey='users'
          collapsed={collapsedSections.users}
          users={userAccounts}
          roleDrafts={roleDrafts}
          busyAction={busyAction}
          currentUserId={session.user?.id}
          emptyText={busyUsers ? 'Загрузка...' : 'Пользователей нет.'}
          onToggle={toggleSection}
          onRoleDraftChange={(userId, value) => setRoleDrafts((prev) => ({ ...prev, [userId]: value }))}
          onSaveRoles={onSaveRoles}
          onDeleteUser={onDeleteUser}
          onSelectUser={setSelectedUserId}
        />

        <AccountTable
          title='Системные службы / сервисные аккаунты'
          sectionKey='services'
          collapsed={collapsedSections.services}
          users={systemAccounts}
          roleDrafts={roleDrafts}
          busyAction={busyAction}
          currentUserId={session.user?.id}
          emptyText='Сервисных аккаунтов нет.'
          onToggle={toggleSection}
          onRoleDraftChange={(userId, value) => setRoleDrafts((prev) => ({ ...prev, [userId]: value }))}
          onSaveRoles={onSaveRoles}
          onDeleteUser={onDeleteUser}
          onSelectUser={setSelectedUserId}
        />

        <article className='ax-admin-card'>
          <div className='ax-admin-card__head'>
            <h2>Live Console (API)</h2>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => toggleSection('console')}>
              {collapsedSections.console ? 'Развернуть' : 'Свернуть'}
            </button>
          </div>
          {collapsedSections.console ? null : (
            <>
              <p>
                Статус API: <b data-state={health.status}>{health.message}</b>
              </p>
              <p>Последняя проверка: {formatDateTime(health.checkedAt)}</p>
              <p className='ax-admin-card__hint'>
                Live polling активен (каждые 10 сек). Для потоков используй блок Live Streams (Pause/Reconnect).
              </p>
              <ul className='ax-admin-history ax-admin-history--console'>
                {renderEvents(events)}
              </ul>
            </>
          )}
        </article>

        <article className='ax-admin-card'>
          <div className='ax-admin-card__head'>
            <h2>История пользователя</h2>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => toggleSection('userHistory')}>
              {collapsedSections.userHistory ? 'Развернуть' : 'Свернуть'}
            </button>
          </div>
          {collapsedSections.userHistory ? null : (
            <>
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
            </>
          )}
        </article>

        <article className='ax-admin-card'>
          <div className='ax-admin-card__head'>
            <h2>История операций (локально)</h2>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => toggleSection('ops')}>
              {collapsedSections.ops ? 'Развернуть' : 'Свернуть'}
            </button>
          </div>
          {collapsedSections.ops ? null : (
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
          )}
        </article>

        <article className='ax-admin-card'>
          <div className='ax-admin-card__head'>
            <h2>Контент и сайт</h2>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => toggleSection('content')}>
              {collapsedSections.content ? 'Развернуть' : 'Свернуть'}
            </button>
          </div>
          {collapsedSections.content ? null : (
            <div className='ax-admin-links'>
              <Link to='/dashboard/content'>Открыть Content Hub</Link>
              <Link to='/dashboard/news'>Открыть News</Link>
              <Link to='/settings'>Открыть Settings</Link>
            </div>
          )}
        </article>

        <article className='ax-admin-card'>
          <div className='ax-admin-card__head'>
            <h2>Командная панель (URL справочник)</h2>
            <button type='button' className='ax-btn ghost ax-btn--mini' onClick={() => toggleSection('commands')}>
              {collapsedSections.commands ? 'Развернуть' : 'Свернуть'}
            </button>
          </div>
          {collapsedSections.commands ? null : (
            <>
              <p className='ax-admin-card__hint'>
                Справочник параметров query string для UI. Формат: <code>?key=value</code> или
                <code>&amp;key=value</code> при комбинировании.
              </p>
              <div className='ax-admin-table-wrap'>
                <table className='ax-admin-table ax-admin-table--commands'>
                  <thead>
                    <tr>
                      <th>Команда</th>
                      <th>Где работает</th>
                      <th>Значения</th>
                      <th>Что делает</th>
                      <th>Пример</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ADMIN_URL_COMMANDS_REFERENCE.map((entry) => (
                      <tr key={entry.key}>
                        <td className='ax-admin-command__key'>
                          <code>?{entry.command}=...</code>
                          {entry.status === 'legacy' ? <span className='ax-admin-command__badge'>legacy</span> : null}
                        </td>
                        <td>{entry.pages}</td>
                        <td><code>{entry.values}</code></td>
                        <td>{entry.description}</td>
                        <td><code>{entry.example}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>
      </section>
    </main>
  )
}
