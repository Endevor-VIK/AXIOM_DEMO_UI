<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_AXCHAT_ECHO_AXIOM_SPEC_MD
  title: "AXCHAT (ECHO AXIOM) — замена вкладки AUDIT"
  status: DONE
  mode: Doc
  goal: "SPEC"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-16
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/axchat-echo-axiom/spec.md -->

# AXCHAT (ECHO AXIOM) — замена вкладки AUDIT

## 0) Цель
Заменить вкладку AUDIT на AXCHAT и закрепить профиль ECHO AXIOM как RAG-интерфейс с RBAC (PUBLIC/CREATOR/ADMIN), анти-галлюцинацией и прозрачной работой через Sources.

## 1) Нейминг
- Вкладка: AXCHAT (в навбаре допускается AI CHAT).
- Сущность: ECHO AXIOM.
- Статус: "ECHO AXIOM · 1/1000" и "BETA / LOCAL ONLY".

## 2) Доступ и деплой
- Роль user работает в режиме PUBLIC (без внутренних путей и закрытых файлов).
- Роли creator/test работают в режиме CREATOR (расширенный доступ в allowlist).
- Роли admin/dev работают в режиме ADMIN (диагностика/операции, без раскрытия secrets).
- Deploy target: local или ghpages через VITE_AX_DEPLOY_TARGET и AX_DEPLOY_TARGET.
- ghpages: фича отключена, отображается оболочка "AXCHAT закрыт".

## 3) Язык и правила ответа
- Ответы только на RU, ENG-вставки только как термины.
- Любая попытка сменить язык приводит к отказу и возврату в RU.
- Запрещено создавать новый лор или придумывать факты.
- Ответы только по базе; при отсутствии данных вернуть "в базе не найдено" и refs.

## 4) Локальная модель
- Default: Qwen2.5 7B Instruct (4bit).
- Альтернативы: Llama 3.1 8B Instruct, Mistral 7B Instruct.
- Только локальный доступ, порт LLM слушает 127.0.0.1.
- Клиент не знает адрес LLM; backend не проксирует сырой чат.

## 5) RAG и индекс
- Источники: docs/**, content-src/**, content/**.
- При наличии export/ индексируется в приоритетном порядке.
- Индекс: SQLite FTS5.
- Хранилище: runtime/axchat/index.sqlite (gitignore).

## 6) Backend API
- POST /api/axchat/query
- GET /api/axchat/search?q=...
- POST /api/axchat/reindex
- GET /api/axchat/status
- RBAC: `requireAuth` + scope-resolution по user roles.
- Scope payload: `scope.role`, `scope.reveal_paths`, `scope.can_reindex`, `heartbeat_lines`.
- Защита: sanitize + retrieve topK + prompt + validate RU/no-invention + no out-of-scope leakage.
- Команды в query: `/help`, `/modes`, `/sources`, `/status`, `/reindex`, `/scope`.

## 7) UI/UX
- /dashboard/axchat — новая страница.
- /dashboard/audit — редирект на /dashboard/axchat.
- Лэйаут 2 колонки: слева чат, справа CONTEXT/SOURCES.
- Чипы: быстрые запросы + системные команды (`/help`, `/status`, `/scope`, ...).
- Источники: карточки с path + excerpt + кнопки Open/Modal/Copy.
- PUBLIC режим: карточки без внутренних путей и без открытия закрытых файлов.
- Верхняя панель: статус ECHO AXIOM + бейджи LOCAL/BETA + model/index ONLINE/OFFLINE.

## 8) Acceptance Criteria
- user имеет доступ к PUBLIC режиму и не видит внутренние пути/файлы.
- creator/test/admin/dev получают расширенные операции в рамках scope.
- /api/axchat/status сообщает состояние модели и индекса.
- Запрос "Кто такая Лиза?" возвращает RU ответ с refs.
- Попытка "придумай новую сцену" возвращает отказ.
- ghpages: вкладка скрыта или LOCKED, вызов модели не происходит.

## 9) Future-ready (не делать сейчас)
- Streaming (SSE), embeddings, command palette, pinned sources, журнал диалогов.

## 10) План вывода на новый уровень (S0-S5)
- S0 (30-60 мин): зафиксировать baseline и блокеры в логах; синхронизировать критерии готовности между SPEC и AgentOps.
- S1 (2-4 часа): убрать блокирующие ошибки CI/QA (typecheck + e2e AXCHAT), устранить дрейф между UI и тестами.
- S2 (0.5-1 день): закрыть open acceptance-пункты по AXCHAT (`/dashboard/audit` редирект, ghpages-ограничения, реальный LLM smoke c refs).
- S3 (0.5-1 день): усилить тестовый контур scope/RBAC (PUBLIC/CREATOR/ADMIN), добавить проверки no-path-leakage.
- S4 (0.5-1 день): стабилизировать наблюдаемость и DX (прозрачные статусы, детерминированные сообщения ошибок, rollback-профиль конфигурации).
- S5 (1-2 часа): финальный QA + закрытие задачи (Step D/Step E, статус DONE в индексе).

## 11) Исторические блокеры (закрыты 2026-02-16)
- `npm run typecheck` стабилизирован, PASS.
- e2e AXCHAT синхронизирован с UI (`tests/e2e/axchat.spec.ts`), PASS.
- ghpages guard + real-LLM smoke закрыты и зафиксированы в AgentOps.

## 12) Quality Gates для закрытия 0028
- Gate 1: `npm run typecheck` = PASS.
- Gate 2: `npm run build` = PASS.
- Gate 3: `PLAYWRIGHT_USE_EXISTING_SERVER=1 PLAYWRIGHT_PORT=5173 npm run test:e2e -- --project=chromium tests/e2e/axchat.spec.ts` = PASS.
- Gate 4: ручной smoke `/dashboard/audit` подтверждает редирект на `/dashboard/axchat`.
- Gate 5: ghpages-профиль подтверждает отключение AXCHAT backend-вызовов.
- Gate 6: real-LLM smoke подтверждает RU-ответ + refs без галлюцинаций.
