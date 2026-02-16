import type { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAnyRole, requireAuth, type AuthedUser } from '../auth/guards'
import { config } from '../config'
import {
  buildAxchatIndex,
  readAxchatFile,
  readIndexStatus,
  searchAxchatIndex,
  type AxchatRef,
} from './indexer'

const SYSTEM_PROMPT = `YOU ARE: ECHO AXIOM (1/1000), the resident assistant inside AXCHAT.
LANGUAGE: Russian by default. If user writes in another language, mirror briefly, but prefer RU unless asked otherwise.
STYLE: calm, precise, minimal. Slight cyber tone is allowed. No theatrical roleplay.
MISSION: help users using ONLY retrieved sources from allowed scopes.

HARD RULES:
- Answer ONLY using CONTEXT.
- If CONTEXT has no answer: say "В текущем индексе нет данных."
- Never guess, never invent, never "probably".
- If request is ambiguous: ask one short clarifying question.
- Keep consistency with Sources panel.

ACCESS:
- You receive scope_role: PUBLIC | CREATOR | ADMIN.
- You receive allowed_scopes.
- Never reveal data outside allowed_scopes.
- PUBLIC: no internal paths/logs/infrastructure/private details.
- CREATOR/ADMIN: path-level details only if inside allowed_scopes.

OUTPUT:
- 3-10 short lines.
- If helpful, add "Следующий шаг: ...".
- Do not dump raw source data.

SAFETY:
- Refuse wrongdoing, hacking, weapons, personal data, secrets.
- Offer safe alternatives if request is out-of-scope.`

const RU_FALLBACK =
  'Ответ должен быть на русском языке. Переформулируй запрос на RU, если нужен ответ без ограничений.'

const HEARTBEAT_LINES = [
  'Сигнал чистый. Источники привязаны.',
  'По текущему индексу данных больше нет.',
  'Нужно расширить контекст: укажи, что проиндексировать.',
]

const REINDEX_SOURCE_DIRS = dedupeStrings([
  ...config.axchatSourceDirs,
  ...config.axchatPublicSourceDirs,
  ...config.axchatCreatorSourceDirs,
  ...config.axchatAdminSourceDirs,
])

type HistoryTurn = {
  role: 'user' | 'assistant'
  content: string
}

type AxchatScopeRole = 'PUBLIC' | 'CREATOR' | 'ADMIN'

type AxchatScope = {
  role: AxchatScopeRole
  allowedSources: string[]
  revealPaths: boolean
  canReindex: boolean
}

type AxchatCommand = '/help' | '/modes' | '/sources' | '/status' | '/reindex' | '/scope'

type OllamaTagsPayload = {
  models?: Array<{
    name?: string
  }>
}

function dedupeStrings(values: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const next = value.trim()
    if (!next || seen.has(next)) continue
    seen.add(next)
    out.push(next)
  }
  return out
}

function sanitizeMessage(input: unknown) {
  if (typeof input !== 'string') return null
  const trimmed = input.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  return trimmed.slice(0, 600)
}

function sanitizeHistory(input: unknown): HistoryTurn[] {
  if (!Array.isArray(input)) return []
  const turns: HistoryTurn[] = []
  for (const raw of input) {
    const role = (raw as any)?.role
    const content = sanitizeMessage((raw as any)?.content)
    if (!content) continue
    if (role !== 'user' && role !== 'assistant') continue
    turns.push({ role, content: content.slice(0, 240) })
    if (turns.length >= 12) break
  }
  return turns
}

function buildDialogue(turns: HistoryTurn[]) {
  if (!turns.length) return ''
  return turns
    .slice(-8)
    .map((turn) => `${turn.role === 'assistant' ? 'ECHO AXIOM' : 'USER'}: ${turn.content}`)
    .join('\n')
}

function buildContext(refs: AxchatRef[]) {
  return refs
    .map((ref, idx) => {
      const header = `[${idx + 1}] ${ref.path}${ref.anchor ? `#${ref.anchor}` : ''}`
      const excerpt = ref.excerpt ? `\n${ref.excerpt}` : ''
      return `${header}${excerpt}`
    })
    .join('\n\n')
}

function isLikelyRussian(text: string) {
  const cyr = (text.match(/[А-Яа-яЁё]/g) || []).length
  const lat = (text.match(/[A-Za-z]/g) || []).length
  if (cyr === 0) return false
  return cyr >= lat
}

function isSmallTalk(message: string) {
  const m = message.toLowerCase()
  if (m.length > 90) return false
  if (/^(привет|здравствуй|добрый\s+(день|вечер|утро)|hello|hi|hey)\b/i.test(m)) return true
  if (/(кто\s+ты|ты\s+кто|что\s+ты\s+такое|who\s+are\s+you)\b/i.test(m)) return true
  return false
}

function smallTalkReply() {
  return (
    'Я — ECHO AXIOM (1/1000). Работаю по текущему индексу базы.\n' +
    'Если данных нет — скажу прямо и покажу ближайшие источники или следующий шаг.\n\n' +
    'Хочешь краткий факт (QA) или обзор с материалами (SEARCH)?'
  )
}

function isBroadQuestion(message: string) {
  const m = message.toLowerCase()
  return /(расскажи|подробно|обзор|всё|все|что известно|поясни|объясни|глубже|шире)/i.test(m)
}

const RETRIEVAL_STOPWORDS = new Set([
  'кто',
  'что',
  'где',
  'когда',
  'как',
  'почему',
  'зачем',
  'какой',
  'какая',
  'какие',
  'такой',
  'такая',
  'такие',
  'это',
  'про',
  'о',
  'об',
  'для',
  'и',
  'или',
  'в',
  'во',
  'на',
  'по',
  'из',
  'от',
  'до',
  'ли',
  'расскажи',
  'подробно',
  'пожалуйста',
])

function tokenizeQuery(input: string) {
  return input
    .toLowerCase()
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function buildRetrievalCandidates(message: string, lastUser: string) {
  const seeds = dedupeStrings([lastUser && lastUser !== message ? `${lastUser} ${message}` : '', message])
  const out: string[] = []
  const add = (value: string) => {
    const next = value.trim()
    if (next.length >= 2) out.push(next)
  }

  for (const seed of seeds) {
    const tokens = tokenizeQuery(seed)
    if (!tokens.length) continue
    const core = tokens.filter((token) => token.length > 1 && !RETRIEVAL_STOPWORDS.has(token))
    add(seed)
    if (core.length) {
      add(core.join(' '))
      if (core.length >= 2) add(core.slice(-2).join(' '))
      if (core.length >= 3) add(core.slice(-3).join(' '))
    }
    if (tokens.length >= 2) add(tokens.slice(-2).join(' '))
  }

  return dedupeStrings(out)
}

function resolveMode(rawMode: unknown, message: string): 'qa' | 'search' {
  if (rawMode === 'qa' || rawMode === 'search') return rawMode
  const m = message.toLowerCase()
  if (/(обзор|подборк|источник|материал|найд|search|поиск)/i.test(m)) return 'search'
  if (message.length > 140) return 'search'
  return 'qa'
}

function parseCommand(message: string): AxchatCommand | null {
  const token = message.trim().split(/\s+/)[0]?.toLowerCase()
  if (!token) return null
  if (
    token === '/help' ||
    token === '/modes' ||
    token === '/sources' ||
    token === '/status' ||
    token === '/reindex' ||
    token === '/scope'
  ) {
    return token
  }
  return null
}

function getAuthUser(request: FastifyRequest) {
  return (request as any).authUser as AuthedUser | undefined
}

function resolveScope(authUser?: AuthedUser): AxchatScope {
  const roles = new Set(authUser?.roles || [])
  if (roles.has('creator') || roles.has('test')) {
    return {
      role: 'CREATOR',
      allowedSources: dedupeStrings(config.axchatCreatorSourceDirs),
      revealPaths: true,
      canReindex: true,
    }
  }
  if (roles.has('admin') || roles.has('dev')) {
    return {
      role: 'ADMIN',
      allowedSources: dedupeStrings(config.axchatAdminSourceDirs),
      revealPaths: true,
      canReindex: true,
    }
  }
  return {
    role: 'PUBLIC',
    allowedSources: dedupeStrings(config.axchatPublicSourceDirs),
    revealPaths: false,
    canReindex: false,
  }
}

function buildScopeReply(scope: AxchatScope) {
  if (scope.role === 'PUBLIC') {
    return (
      'Роль: PUBLIC.\n' +
      'Доступ: публичный контент-пак и справка по панели.\n' +
      'Ограничения: внутренние пути, логи и закрытые секции скрыты.\n' +
      'Следующий шаг: задай факт или включи SEARCH для обзора.'
    )
  }
  if (scope.role === 'ADMIN') {
    return (
      'Роль: ADMIN.\n' +
      `Разрешённые зоны: ${scope.allowedSources.join(', ') || 'n/a'}.\n` +
      'Доступна диагностика и системные операции (без раскрытия secrets).\n' +
      'Следующий шаг: используй /status и /sources для проверки пайплайна.'
    )
  }
  return (
    'Роль: CREATOR.\n' +
    `Разрешённые зоны: ${scope.allowedSources.join(', ') || 'n/a'}.\n` +
    'Доступны пути и расширенная навигация по базе в рамках policy.\n' +
    'Следующий шаг: используй SEARCH для широкого среза или QA для точного факта.'
  )
}

function buildHelpReply() {
  return [
    'Команды AXCHAT:',
    '/help — возможности и режимы',
    '/modes — разница QA и SEARCH',
    '/sources — как читать Sources',
    '/status — model/index состояние',
    '/reindex — что делает Reindex',
    '/scope — текущий уровень доступа',
  ].join('\n')
}

function buildModesReply() {
  return (
    'QA: короткий точный ответ по найденным источникам.\n' +
    'SEARCH: обзор и подборка материалов без длинного вывода.\n' +
    'Если запрос слишком широкий, я попрошу уточнить цель.'
  )
}

function buildSourcesReply(scope: AxchatScope) {
  if (scope.revealPaths) {
    return (
      'Sources показывают опору ответа: документ, фрагмент, релевантность.\n' +
      'В твоём уровне доступа доступны пути и карточки файлов.\n' +
      'Следующий шаг: открой карточку справа и уточни вопрос по конкретному фрагменту.'
    )
  }
  return (
    'Sources в PUBLIC режиме показывают только безопасные карточки.\n' +
    'Внутренние пути и закрытые файлы не раскрываются.\n' +
    'Следующий шаг: уточни сущность/локацию, чтобы сузить контекст.'
  )
}

function buildReindexReply(scope: AxchatScope) {
  if (!scope.canReindex) {
    return (
      'Reindex пересобирает индекс после добавления новых файлов.\n' +
      'В текущей роли операция недоступна.\n' +
      'Следующий шаг: попроси CREATOR запустить Reindex.'
    )
  }
  return (
    'Reindex пересобирает индекс и обновляет доступные материалы.\n' +
    'Используй его после импорта или редактирования контента.\n' +
    'Следующий шаг: нажми кнопку Reindex в Control Strip.'
  )
}

function mapRefsForScope(refs: AxchatRef[], scope: AxchatScope): AxchatRef[] {
  if (scope.revealPaths) return refs
  return refs.map((ref, index) => ({
    ...ref,
    path: `Публичная карточка #${index + 1}`,
    route: '',
    anchor: undefined,
  }))
}

function maybeHeartbeatLine() {
  if (!config.axchatHeartbeatLines) return null
  if (Math.random() > 0.32) return null
  return HEARTBEAT_LINES[Math.floor(Math.random() * HEARTBEAT_LINES.length)] || null
}

function appendHeartbeatLine(answer: string) {
  const heartbeat = maybeHeartbeatLine()
  if (!heartbeat) return answer
  return `${answer}\n${heartbeat}`
}

function withNextStep(answer: string, nextStep: string) {
  if (/следующий шаг:/i.test(answer)) return answer
  return `${answer}\nСледующий шаг: ${nextStep}`
}

async function callOllama(prompt: string) {
  const controller = new AbortController()
  const timeoutMs = Number.isFinite(config.axchatTimeoutMs) ? Math.max(10_000, config.axchatTimeoutMs) : 60_000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${config.axchatHost}/api/chat`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.axchatModel,
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 320,
        },
      }),
    })
    if (!res.ok) return null
    const payload = await res.json()
    return payload?.message?.content as string | undefined
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchOllamaTags(timeoutMs = 2500): Promise<OllamaTagsPayload | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${config.axchatHost}/api/tags`, { signal: controller.signal })
    if (!res.ok) return null
    return (await res.json()) as OllamaTagsPayload
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function extractModelNames(payload: OllamaTagsPayload | null): string[] {
  if (!payload?.models?.length) return []
  return payload.models
    .map((m) => (typeof m?.name === 'string' ? m.name : ''))
    .filter(Boolean)
}

async function buildStatusPayload(scope: AxchatScope) {
  const indexStatus = readIndexStatus(config.axchatIndexPath)
  const tags = await fetchOllamaTags()
  const available = extractModelNames(tags)
  const serviceOnline = Boolean(tags)
  const modelReady = serviceOnline && available.includes(config.axchatModel)

  return {
    model: {
      name: config.axchatModel,
      host: config.axchatHost,
      online: serviceOnline,
      ready: modelReady,
      available: serviceOnline ? available.slice(0, 12) : undefined,
    },
    index: indexStatus,
    sources: scope.revealPaths ? scope.allowedSources : undefined,
    scope: {
      role: scope.role,
      reveal_paths: scope.revealPaths,
      can_reindex: scope.canReindex,
    },
    heartbeat_lines: config.axchatHeartbeatLines,
  }
}

export async function registerAxchatRoutes(app: FastifyInstance) {
  const topK = Number.isFinite(config.axchatTopK) ? config.axchatTopK : 4
  const chunkSize = Number.isFinite(config.axchatChunkSize) ? config.axchatChunkSize : 1000
  const chunkOverlap = Number.isFinite(config.axchatChunkOverlap) ? config.axchatChunkOverlap : 120

  app.get(
    '/status',
    { preHandler: requireAuth },
    async (request, reply) => {
      if (config.deployTarget !== 'local') {
        reply.code(403).send({ error: 'axchat_disabled' })
        return
      }
      const scope = resolveScope(getAuthUser(request))
      reply.send(await buildStatusPayload(scope))
    },
  )

  app.post(
    '/warmup',
    { preHandler: requireAnyRole(['creator', 'test', 'admin', 'dev']) },
    async (_request, reply) => {
      if (config.deployTarget !== 'local') {
        reply.code(403).send({ error: 'axchat_disabled' })
        return
      }
      const start = Date.now()
      const response = await callOllama('WARMUP: ответь одним словом: OK')
      if (!response) {
        const tags = await fetchOllamaTags()
        const available = extractModelNames(tags)
        if (!tags) {
          reply.code(503).send({ error: 'ollama_offline' })
          return
        }
        if (!available.includes(config.axchatModel)) {
          reply.code(409).send({
            error: 'model_missing',
            model: config.axchatModel,
            available: available.slice(0, 12),
          })
          return
        }
        reply.code(503).send({ error: 'model_warmup_failed' })
        return
      }
      reply.send({ ok: true, latency_ms: Date.now() - start })
    },
  )

  app.get(
    '/search',
    { preHandler: requireAuth },
    async (request, reply) => {
      if (config.deployTarget !== 'local') {
        reply.code(403).send({ error: 'axchat_disabled' })
        return
      }
      const query = (request.query as any)?.q
      const q = sanitizeMessage(query)
      if (!q) {
        reply.code(400).send({ error: 'invalid_query' })
        return
      }
      const scope = resolveScope(getAuthUser(request))
      const refs = searchAxchatIndex(config.axchatIndexPath, q, topK, {
        allowedSources: scope.allowedSources,
      })
      reply.send({ refs: mapRefsForScope(refs, scope) })
    },
  )

  app.post(
    '/query',
    { preHandler: requireAuth },
    async (request, reply) => {
      if (config.deployTarget !== 'local') {
        reply.code(403).send({ error: 'axchat_disabled' })
        return
      }
      const body = request.body as {
        message?: string
        mode?: 'qa' | 'search'
        history?: Array<{ role?: string; content?: string }>
      }
      const message = sanitizeMessage(body?.message)
      if (!message) {
        reply.code(400).send({ error: 'invalid_message' })
        return
      }

      const start = Date.now()
      const scope = resolveScope(getAuthUser(request))

      const command = parseCommand(message)
      if (command) {
        const status = command === '/status' ? await buildStatusPayload(scope) : null
        const answer =
          command === '/help'
            ? buildHelpReply()
            : command === '/modes'
              ? buildModesReply()
              : command === '/sources'
                ? buildSourcesReply(scope)
                : command === '/status'
                  ? [
                      `Model: ${status?.model?.ready ? 'ONLINE' : 'OFFLINE'}`,
                      `Index: ${status?.index?.ok ? 'ONLINE' : 'OFFLINE'}`,
                      status?.index?.indexed_at ? `Index timestamp: ${status.index.indexed_at}` : 'Index timestamp: n/a',
                      `Scope: ${scope.role}`,
                    ].join('\n')
                  : command === '/reindex'
                    ? buildReindexReply(scope)
                    : buildScopeReply(scope)
        reply.send({
          answer_markdown: answer,
          refs: [],
          notes: { latency_ms: Date.now() - start, model: config.axchatModel, scope: scope.role },
        })
        return
      }

      if (isSmallTalk(message)) {
        reply.send({
          answer_markdown: appendHeartbeatLine(smallTalkReply()),
          refs: [],
          notes: { latency_ms: Date.now() - start, model: config.axchatModel, scope: scope.role },
        })
        return
      }

      const mode = resolveMode(body?.mode, message)
      if (mode === 'qa' && isBroadQuestion(message)) {
        reply.send({
          answer_markdown:
            'Уточни цель: тебе нужен краткий факт (QA) или обзор с подборкой материалов (SEARCH)?',
          refs: [],
          notes: { latency_ms: Date.now() - start, model: config.axchatModel, scope: scope.role, mode },
        })
        return
      }

      const history = sanitizeHistory(body?.history)
      const dialogue = buildDialogue(history)
      const lastUser = [...history].reverse().find((turn) => turn.role === 'user')?.content || ''
      const retrievalCandidates = buildRetrievalCandidates(message, lastUser)
      let retrievalQuery = retrievalCandidates[0] || message
      let refs: AxchatRef[] = []
      for (const candidate of retrievalCandidates) {
        const next = searchAxchatIndex(config.axchatIndexPath, candidate, topK, {
          allowedSources: scope.allowedSources,
        })
        if (!next.length) continue
        refs = next
        retrievalQuery = candidate
        break
      }
      const safeRefs = mapRefsForScope(refs, scope)

      if (mode === 'search') {
        reply.send({
          answer_markdown: withNextStep(
            'Поиск завершён. Отобраны источники из текущего индекса.',
            'открой нужную карточку в Sources или уточни формулировку запроса',
          ),
          refs: safeRefs,
          notes: {
            latency_ms: Date.now() - start,
            model: config.axchatModel,
            scope: scope.role,
            mode,
            retrieval_query: retrievalQuery,
          },
        })
        return
      }

      if (refs.length === 0) {
        const fallbackQuery = message.split(/[\s,.;:!?()\[\]{}]+/).slice(0, 3).join(' ')
        const nearby =
          fallbackQuery && fallbackQuery !== retrievalQuery
            ? searchAxchatIndex(config.axchatIndexPath, fallbackQuery, Math.min(topK, 3), {
                allowedSources: scope.allowedSources,
              })
            : []
        reply.send({
          answer_markdown: withNextStep(
            'В текущем индексе нет данных по этому запросу.\nМогу: (1) уточнить формулировку, (2) показать близкие материалы, (3) предложить Reindex, если ты добавлял файлы.',
            scope.canReindex
              ? 'уточни сущность или запусти Reindex после обновления базы'
              : 'уточни сущность или попроси CREATOR обновить индекс',
          ),
          refs: mapRefsForScope(nearby, scope),
          notes: {
            latency_ms: Date.now() - start,
            model: config.axchatModel,
            scope: scope.role,
            mode,
            retrieval_query: retrievalQuery,
          },
        })
        return
      }

      const context = buildContext(refs)
      const prompt =
        `scope_role: ${scope.role}\nallowed_scopes: ${scope.allowedSources.join(', ') || 'n/a'}\n\n` +
        `CONTEXT:\n${context}\n\n` +
        `${dialogue ? `DIALOGUE (recent):\n${dialogue}\n\n` : ''}` +
        `QUESTION:\n${message}\n\nANSWER:`
      const response = await callOllama(prompt)
      let answer = response?.trim() || ''
      if (!answer) {
        const tags = await fetchOllamaTags()
        const available = extractModelNames(tags)
        if (!tags) {
          reply.code(503).send({ error: 'ollama_offline' })
          return
        }
        if (!available.includes(config.axchatModel)) {
          reply.code(409).send({
            error: 'model_missing',
            model: config.axchatModel,
            available: available.slice(0, 12),
          })
          return
        }
        reply.code(503).send({ error: 'model_offline' })
        return
      }
      if (!isLikelyRussian(answer)) {
        answer = RU_FALLBACK
      }

      answer = withNextStep(answer, 'если нужен широкий срез, переключи режим на SEARCH')
      answer = appendHeartbeatLine(answer)

      reply.send({
        answer_markdown: answer,
        refs: safeRefs,
        notes: {
          latency_ms: Date.now() - start,
          model: config.axchatModel,
          scope: scope.role,
          mode,
          retrieval_query: retrievalQuery,
        },
      })
    },
  )

  app.post(
    '/reindex',
    { preHandler: requireAnyRole(['creator', 'admin', 'dev']) },
    async (request, reply) => {
      if (config.deployTarget !== 'local') {
        reply.code(403).send({ error: 'axchat_disabled' })
        return
      }
      const scope = resolveScope(getAuthUser(request))
      if (!scope.canReindex) {
        reply.code(403).send({ error: 'forbidden' })
        return
      }
      try {
        const result = buildAxchatIndex({
          root: process.cwd(),
          indexPath: config.axchatIndexPath,
          sourceDirs: REINDEX_SOURCE_DIRS.length ? REINDEX_SOURCE_DIRS : config.axchatSourceDirs,
          chunkSize,
          chunkOverlap,
        })
        reply.send({ ok: true, indexed_at: result.indexedAt })
      } catch {
        reply.code(500).send({ error: 'reindex_failed' })
      }
    },
  )

  app.get(
    '/file',
    { preHandler: requireAnyRole(['creator', 'test', 'admin', 'dev']) },
    async (request, reply) => {
      if (config.deployTarget !== 'local') {
        reply.code(403).send({ error: 'axchat_disabled' })
        return
      }
      const scope = resolveScope(getAuthUser(request))
      if (!scope.revealPaths) {
        reply.code(403).send({ error: 'forbidden' })
        return
      }
      const relPath = (request.query as any)?.path
      const safe = sanitizeMessage(relPath)
      if (!safe) {
        reply.code(400).send({ error: 'invalid_path' })
        return
      }
      if (safe.includes('..') || safe.startsWith('/') || safe.startsWith('\\\\')) {
        reply.code(403).send({ error: 'forbidden' })
        return
      }
      const topLevel = safe.split('/')[0]
      if (!scope.allowedSources.includes(topLevel)) {
        reply.code(403).send({ error: 'forbidden' })
        return
      }
      const file = readAxchatFile(process.cwd(), safe)
      if (!file) {
        reply.code(404).send({ error: 'not_found' })
        return
      }
      reply.header('Content-Type', 'text/plain; charset=utf-8').send(file)
    },
  )
}
