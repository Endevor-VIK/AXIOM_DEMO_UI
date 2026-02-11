import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import RouteHoldBanner from '@/components/RouteHoldBanner'
import Modal from '@/components/Modal'
import { resolveDeployTarget } from '@/lib/auth/deploy'
import { resolvePrimaryRole } from '@/lib/identity/roles'
import { useSession } from '@/lib/identity/useSession'
import {
  fetchAxchatStatus,
  queryAxchat,
  searchAxchat,
  reindexAxchat,
  warmupAxchat,
  type AxchatChatTurn,
  type AxchatRef,
  type AxchatStatus,
} from '@/lib/axchat/api'
import '@/styles/axchat.css'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const QUICK_CHIPS = [
  'Виктор',
  'Лиза',
  'Nexus / Echelon / Erebus',
  'Nightmare',
  'Показать файл…',
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlights(text: string, tokens: string[]) {
  if (!text) return ''
  let safe = escapeHtml(text)
  for (const token of tokens) {
    if (!token) continue
    const pattern = new RegExp(`(${escapeRegExp(token)})`, 'gi')
    safe = safe.replace(pattern, '<mark>$1</mark>')
  }
  return safe
}

export default function AxchatRoute() {
  const session = useSession()
  const primaryRole = resolvePrimaryRole(session.user?.roles)
  const deployTarget = resolveDeployTarget()
  const hasAccess = primaryRole === 'creator' || primaryRole === 'test'

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      content:
        'Я — ECHO AXIOM (1/1000). Отвечаю только по базе. Если данных нет — сообщу и дам ближайшие источники.',
    },
  ])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'qa' | 'search'>('qa')
  const [refs, setRefs] = useState<AxchatRef[]>([])
  const [status, setStatus] = useState<AxchatStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [modalRef, setModalRef] = useState<AxchatRef | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [warming, setWarming] = useState(false)
  const messagesViewportRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const highlightTokens = useMemo(() => {
    return lastQuery
      .split(/[\s,.;:!?()\[\]{}]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .slice(0, 8)
  }, [lastQuery])

  const ollamaOnline = status?.model?.online ?? false
  const modelReady = status?.model?.ready ?? ollamaOnline
  const indexOnline = status?.index?.ok ?? false
  const canSearch = indexOnline
  const canQa = indexOnline && ollamaOnline && modelReady
  const canSend = mode === 'search' ? canSearch : canQa

  const llmLabel = !ollamaOnline ? 'OLLAMA OFFLINE' : !modelReady ? 'MODEL MISSING' : 'MODEL ONLINE'
  const modelName = status?.model?.name || 'qwen2.5:7b-instruct'
  const ollamaHost = status?.model?.host || 'http://127.0.0.1:11434'
  const legacyStatus = Boolean(status && status.model.ready === undefined)
  const allowedSources = status?.sources?.length ? status.sources : ['export', 'content-src', 'content']
  const allowedSourceSet = useMemo(() => new Set(allowedSources), [allowedSources.join('|')])

  const filterLoreRefs = useCallback(
    (next: AxchatRef[]) => {
      return next.filter((ref) => {
        const top = ref.path.split('/')[0] || ''
        return allowedSourceSet.has(top)
      })
    },
    [allowedSourceSet],
  )

  const statusNote = !indexOnline
    ? 'INDEX OFFLINE — запусти Reindex, чтобы открыть доступ.'
    : !ollamaOnline
      ? `OLLAMA OFFLINE — запусти локальный runtime модели (AXCHAT_HOST=${ollamaHost}).`
      : !modelReady
        ? `MODEL MISSING — установи: ollama pull ${modelName}.`
        : legacyStatus
          ? 'STATUS LEGACY — перезапусти AX API, чтобы включить проверки readiness модели.'
        : null

  const blockedReason = !canSend
    ? !indexOnline
      ? primaryRole === 'creator'
        ? 'INDEX OFFLINE — пересобери индекс, чтобы активировать запросы.'
        : 'INDEX OFFLINE — запросы недоступны. Попроси CREATOR запустить reindex.'
      : !ollamaOnline
        ? `OLLAMA OFFLINE — QA недоступен. Проверь AXCHAT_HOST=${ollamaHost}.`
        : !modelReady
          ? `MODEL MISSING — QA недоступен. Установи: ollama pull ${modelName}.`
          : 'MODEL OFFLINE — QA недоступен, включи локальную модель.'
    : null

  const formatApiError = useCallback(
    (err: any) => {
      const httpStatus = err?.status
      const code = err?.message || 'request_failed'
      const payload = err?.payload
      if (httpStatus === 404) {
        return 'AX API не обновлён или не перезапущен. Перезапусти backend (dev:api/dev:full).'
      }
      if (code === 'ollama_offline') return `LLM OFFLINE. Запусти Ollama локально (AXCHAT_HOST=${ollamaHost}).`
      if (code === 'model_missing') {
        const modelName = payload?.model || status?.model?.name || 'local-model'
        const available: string[] = Array.isArray(payload?.available) ? payload.available : []
        const hint = available.length ? ` Доступные модели: ${available.slice(0, 4).join(', ')}.` : ''
        return `Модель не установлена: ${modelName}. Установи: ollama pull ${modelName}.${hint}`
      }
      if (code === 'model_offline' || code === 'model_warmup_failed') {
        return 'Модель не отвечает. Проверь Ollama/модель и повтори.'
      }
      if (code === 'axchat_disabled') {
        return 'AXCHAT выключен для текущего deploy target.'
      }
      return `Ошибка запроса: ${code}.`
    },
    [status?.model?.name, ollamaHost],
  )

  useEffect(() => {
    if (!hasAccess || deployTarget !== 'local') return
    let alive = true

    const load = async () => {
      try {
        const next = await fetchAxchatStatus()
        if (!alive) return
        setStatus(next)
      } catch {
        if (!alive) return
        setStatus({ model: { name: 'local', online: false }, index: { ok: false } })
      }
    }

    load()
    const id = setInterval(load, 20000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [hasAccess, deployTarget])

  const handleMessagesScroll = useCallback(() => {
    const el = messagesViewportRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distance < 80
  }, [])

  useEffect(() => {
    const el = messagesViewportRef.current
    if (!el) return
    if (!stickToBottomRef.current) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const pushMessage = useCallback((next: ChatMessage) => {
    setMessages((prev) => [...prev, next])
  }, [])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || busy || !canSend) return

    setInput('')
    setError(null)
    setBusy(true)
    setLastQuery(trimmed)
    stickToBottomRef.current = true
    pushMessage({ id: `user-${Date.now()}`, role: 'user', content: trimmed })

    try {
      if (mode === 'search') {
        const res = await searchAxchat(trimmed)
        setRefs(filterLoreRefs(res.refs || []))
        pushMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Поиск завершен. Найдено источников: ${res.refs?.length ?? 0}.`,
        })
      } else {
        const pending: ChatMessage = { id: 'pending', role: 'user', content: trimmed }
        const history: AxchatChatTurn[] = [...messages, pending]
          .slice(-10)
          .map((msg): AxchatChatTurn => ({ role: msg.role, content: msg.content }))
        const res = await queryAxchat(trimmed, 'qa', history)
        setRefs(filterLoreRefs(res.refs || []))
        pushMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: res.answer_markdown || 'Ответ не получен.',
        })
      }
    } catch (err: any) {
      const msg = formatApiError(err)
      setError(msg)
      pushMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: msg,
      })
    } finally {
      setBusy(false)
    }
  }, [input, busy, canSend, filterLoreRefs, formatApiError, messages, mode, pushMessage])

  const handleChipClick = useCallback((label: string) => {
    setInput(label)
    inputRef.current?.focus()
  }, [])

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!canSend) {
        setError(blockedReason || 'Действие недоступно.')
        return
      }
      handleSend()
    }
  }

  const handleOpenModal = useCallback((ref: AxchatRef) => {
    setModalRef(ref)
    setModalOpen(true)
  }, [])

  const handleCopyPath = useCallback(async (ref: AxchatRef) => {
    try {
      await navigator.clipboard.writeText(ref.path)
    } catch {
      // ignore
    }
  }, [])

  const handleReindex = useCallback(async () => {
    if (reindexing) return
    setReindexing(true)
    try {
      await reindexAxchat()
      const next = await fetchAxchatStatus()
      setStatus(next)
    } catch {
      // ignore
    } finally {
      setReindexing(false)
    }
  }, [reindexing])

  const handleWarmup = useCallback(async () => {
    if (warming) return
    setWarming(true)
    setError(null)
    try {
      await warmupAxchat()
      const next = await fetchAxchatStatus()
      setStatus(next)
      pushMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'MODEL: OK. Можно выполнять QA.',
      })
    } catch (err: any) {
      const msg = formatApiError(err)
      setError(msg)
      pushMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: msg,
      })
    } finally {
      setWarming(false)
    }
  }, [warming, pushMessage, formatApiError])

  if (deployTarget !== 'local') {
    return (
      <RouteHoldBanner
        title='AXCHAT закрыт'
        message='GitHub Pages не поддерживает серверный инференс. Раздел доступен только локально.'
        note='Запусти локальный backend и установи VITE_AX_DEPLOY_TARGET=local.'
      />
    )
  }

  if (!hasAccess) {
    return (
      <RouteHoldBanner
        title='ERROR / ACCESS LOCKED'
        message='AXCHAT доступен только для ролей creator/test. Функционал отключён.'
        note='Запроси доступ у CREATOR.'
      />
    )
  }

  return (
    <section className='ax-card ax-axchat'>
      <header className='ax-axchat__head'>
        <div className='ax-axchat__title'>
          <div className='ax-axchat__kicker'>
            <p className='ax-axchat__eyebrow'>ECHO AXIOM · 1/1000</p>
            <div className='ax-axchat__kicker-chips'>
              <span className='ax-axchat__meta-chip'>LOCAL</span>
              <span className='ax-axchat__meta-chip'>BETA</span>
            </div>
          </div>
          <h2 className='ax-axchat__name'>AXCHAT</h2>
        </div>
      </header>

      <div className='ax-axchat__grid'>
        <div className='ax-axchat__chat'>
          <div className='ax-axchat__control' data-label='CONTROL STRIP'>
            <div className='ax-axchat__mode'>
              <button
                type='button'
                className={`ax-btn ax-btn--ghost ${mode === 'qa' ? 'is-active' : ''}`}
                onClick={() => setMode('qa')}
              >
                QA
              </button>
              <button
                type='button'
                className={`ax-btn ax-btn--ghost ${mode === 'search' ? 'is-active' : ''}`}
                onClick={() => setMode('search')}
              >
                SEARCH
              </button>
            </div>
            <div className='ax-axchat__control-status'>
              <span className='ax-axchat__status-item' data-online={ollamaOnline && modelReady ? 'true' : 'false'}>
                {llmLabel}
              </span>
              <span className='ax-axchat__status-item' data-online={indexOnline ? 'true' : 'false'}>
                INDEX {indexOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className='ax-axchat__control-actions'>
              {primaryRole === 'creator' && ollamaOnline && (legacyStatus || !modelReady) ? (
                <button
                  type='button'
                  className='ax-btn ax-btn--ghost'
                  onClick={handleWarmup}
                  disabled={warming}
                >
                  {warming ? 'Start…' : 'Start model'}
                </button>
              ) : null}
              {primaryRole === 'creator' && ollamaOnline && !modelReady ? (
                <button
                  type='button'
                  className='ax-btn ax-btn--ghost'
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`ollama pull ${modelName}`)
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Copy pull
                </button>
              ) : null}
              {primaryRole === 'creator' ? (
                <button
                  type='button'
                  className='ax-btn'
                  onClick={handleReindex}
                  disabled={reindexing}
                >
                  {reindexing ? 'Reindex…' : 'Reindex'}
                </button>
              ) : null}
            </div>
          </div>

          <div
            ref={messagesViewportRef}
            className='ax-axchat__messages'
            data-label='CHAT CONSOLE'
            onScroll={handleMessagesScroll}
          >
            {messages.map((msg) => (
              <div key={msg.id} className='ax-axchat__message' data-role={msg.role}>
                <div className='ax-axchat__message-role'>
                  {msg.role === 'user' ? 'USER' : 'ECHO AXIOM'}
                </div>
                <div className='ax-axchat__message-body'>{msg.content}</div>
              </div>
            ))}
          </div>

          <div className='ax-axchat__chips'>
            {QUICK_CHIPS.map((label) => (
              <button
                key={label}
                type='button'
                className='ax-chip ax-axchat__chip'
                onClick={() => handleChipClick(label)}
              >
                {label}
              </button>
            ))}
          </div>

          {error ? <div className='ax-axchat__error'>Ошибка: {error}</div> : null}

          {statusNote ? <div className='ax-axchat__status-note'>{statusNote}</div> : null}

          <div className='ax-axchat__composer'>
            <textarea
              ref={inputRef}
              className='ax-input ax-axchat__input'
              placeholder='Спроси по базе (RU)…'
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            {canSend ? (
              <button className='ax-btn ax-axchat__send' onClick={handleSend} disabled={busy}>
                {busy ? '...' : 'SEND'}
              </button>
            ) : null}
          </div>

          {blockedReason ? <div className='ax-axchat__composer-note'>{blockedReason}</div> : null}
        </div>

        <aside className='ax-axchat__sources' data-label='CONTEXT / SOURCES'>
          <header className='ax-axchat__sources-head'>
            <div>
              <h3 className='ax-blade-head'>Источники</h3>
            </div>
            <div className='ax-axchat__sources-meta'>
              {status?.index?.indexed_at ? (
                <span className='ax-muted'>Index: {status.index.indexed_at}</span>
              ) : (
                <span className='ax-muted'>Index: n/a</span>
              )}
            </div>
          </header>

          <div className='ax-axchat__sources-body'>
            {refs.length === 0 ? (
              <div className='ax-axchat__sources-empty'>
                Нет источников. Выполни запрос, чтобы увидеть контекст.
              </div>
            ) : (
              <div className='ax-axchat__sources-list'>
                {refs.map((ref, index) => {
                  const canOpen = Boolean(ref.route)
                  const canCopy = Boolean(ref.path)
                  const canModal = Boolean(ref.excerpt)

                  const handleCardOpen = () => {
                    if (!canOpen) return
                    window.open(ref.route, '_blank', 'noopener,noreferrer')
                  }

                  const handleCardKey: React.KeyboardEventHandler<HTMLElement> = (event) => {
                    if (!canOpen) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleCardOpen()
                    }
                  }

                  return (
                    <article
                      key={`${ref.path}-${index}`}
                      className='ax-axchat__source'
                      data-clickable={canOpen ? 'true' : 'false'}
                      tabIndex={canOpen ? 0 : undefined}
                      role={canOpen ? 'link' : undefined}
                      onClick={canOpen ? handleCardOpen : undefined}
                      onKeyDown={canOpen ? handleCardKey : undefined}
                    >
                      <div className='ax-axchat__source-head'>
                        <div>
                          <p className='ax-axchat__source-title'>{ref.title || 'Untitled'}</p>
                          <p className='ax-axchat__source-path'>{ref.path}</p>
                        </div>
                        {typeof ref.score === 'number' ? (
                          <span className='ax-axchat__source-score'>#{index + 1}</span>
                        ) : null}
                      </div>
                      {ref.excerpt ? <p className='ax-axchat__source-excerpt'>{ref.excerpt}</p> : null}
                      {(canOpen || canModal || canCopy) ? (
                        <div className='ax-axchat__source-actions'>
                          {canOpen ? (
                            <a
                              className='ax-btn ax-btn--ghost'
                              href={ref.route}
                              target='_blank'
                              rel='noopener noreferrer'
                              onClick={(event) => event.stopPropagation()}
                            >
                              Открыть
                            </a>
                          ) : null}
                          {canModal ? (
                            <button
                              className='ax-btn ax-btn--ghost'
                              onClick={(event) => {
                                event.stopPropagation()
                                handleOpenModal(ref)
                              }}
                            >
                              Открыть в модалке
                            </button>
                          ) : null}
                          {canCopy ? (
                            <button
                              className='ax-btn ax-btn--ghost'
                              onClick={(event) => {
                                event.stopPropagation()
                                handleCopyPath(ref)
                              }}
                            >
                              Скопировать путь
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={modalRef?.path || 'Источник'}>
        <div className='ax-axchat__modal'>
          {modalRef?.route ? (
            <a className='ax-btn ax-btn--ghost' href={modalRef.route} target='_blank' rel='noopener noreferrer'>
              Open full
            </a>
          ) : null}
          <div
            className='ax-axchat__modal-excerpt'
            dangerouslySetInnerHTML={{
              __html: buildHighlights(modalRef?.excerpt || 'Нет текста для отображения.', highlightTokens),
            }}
          />
        </div>
      </Modal>
    </section>
  )
}
