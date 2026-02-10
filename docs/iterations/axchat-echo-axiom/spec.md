<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_AXCHAT_ECHO_AXIOM_SPEC_MD
  title: "AXCHAT (ECHO AXIOM) — замена вкладки AUDIT"
  status: ACTIVE
  mode: Doc
  goal: "SPEC"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-10
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/axchat-echo-axiom/spec.md -->

# AXCHAT (ECHO AXIOM) — замена вкладки AUDIT

## 0) Цель
Заменить вкладку AUDIT на AXCHAT и включить локальный RAG-чат (ECHO AXIOM) только для ролей creator/test.

## 1) Нейминг
- Вкладка: AXCHAT (в навбаре допускается AI CHAT).
- Сущность: ECHO AXIOM.
- Статус: "ECHO AXIOM · 1/1000" и "BETA / LOCAL ONLY".

## 2) Доступ и деплой
- Доступ только для ролей creator и test.
- Роль user вкладку не видит или видит экран блокировки без функционала.
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
- RBAC: requireAuth + requireRole(creator/test).
- Защита: sanitize + retrieve topK + prompt + validate RU/no-invention.

## 7) UI/UX
- /dashboard/axchat — новая страница.
- /dashboard/audit — редирект на /dashboard/axchat.
- Лэйаут 2 колонки: слева чат, справа CONTEXT/SOURCES.
- Чипы быстрых запросов: Виктор, Лиза, Nexus/Echelon/Erebus, Nightmare, Показать файл.
- Источники: карточки с path + excerpt + кнопки Open/Modal/Copy.
- Верхняя панель: статус ECHO AXIOM + бейджи LOCAL/BETA + model/index ONLINE/OFFLINE.

## 8) Acceptance Criteria
- creator/test видят AXCHAT, user не имеет доступа.
- /api/axchat/status сообщает состояние модели и индекса.
- Запрос "Кто такая Лиза?" возвращает RU ответ с refs.
- Попытка "придумай новую сцену" возвращает отказ.
- ghpages: вкладка скрыта или LOCKED, вызов модели не происходит.

## 9) Future-ready (не делать сейчас)
- Streaming (SSE), embeddings, command palette, pinned sources, журнал диалогов.
