<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0041_ADMIN_HISTORY_LOGOUT_HARDENING_MD
  title: "GLOBAL LOG — 0041_admin-history-logout-hardening"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-17
  editable_by_agents: true
  change_policy: "Append-only"
-->

<!-- ops/agent_ops/logs/0041_admin-history-logout-hardening.md -->

# GLOBAL LOG — 0041_admin-history-logout-hardening

- Старт: 2026-02-17T20:31:36+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Доработать стабильность админ logout и заполнение истории/консоли при ошибках audit backend
- SPEC: —
- Статус: ACTIVE

---

## Step A — Discovery

- 2026-02-17T20:23:10+03:00 — Действие: Получен баг-репорт CREATOR: logout из админки не срабатывает, live console и user history пустые, UI показывает общую ошибку. → Результат: OK
- 2026-02-17T20:24:40+03:00 — Действие: Проверена логика `app/routes/admin/page.tsx`, `server/src/app.ts`, `server/src/db/audit.ts`; определён риск блокировки основных действий ошибками audit-пайплайна. → Результат: OK

## Step B — Implementation

- 2026-02-17T20:27:05+03:00 — Действие: `server/src/db/audit.ts` усилен:
  - lazy ensure schema `audit_events`,
  - безопасные `try/catch` в insert/list/cleanup,
  - fallback `[]` на чтение при ошибках.
  → Результат: OK
- 2026-02-17T20:27:44+03:00 — Действие: `server/src/app.ts` onResponse hook обёрнут в безопасный `try/catch`, чтобы audit ошибки не влияли на API/logout. → Результат: OK
- 2026-02-17T20:28:52+03:00 — Действие: `app/routes/admin/page.tsx` улучшен:
  - авто-выбор текущего admin-пользователя для блока истории,
  - детализирован текст backend ошибок в UI,
  - logout с защитой по таймауту (`Promise.race`) + жёсткий redirect.
  → Результат: OK

## Step C — Documentation

- 2026-02-17T20:31:36+03:00 — Действие: Создан GLOBAL LOG 0041 и обновлён индекс `ops/agent_ops/logs/00_LOG_INDEX.md`. → Результат: OK

## Step D — QA

- 2026-02-17T20:28:29+03:00 — Действие: `npm run test:run -- tests/adminAuthIsolation.spec.ts`. → Результат: PASS (3/3).
- 2026-02-17T20:28:10+03:00 — Действие: Интеграционная smoke-проверка на реальной `runtime/auth.sqlite` через `app.inject`: login/users/events/history/logout/me-after-logout. → Результат: PASS (`eventsCount>0`, `historyEvents>0`, `meAfter=401`).

## Step E — Git

- 2026-02-17T20:31:36+03:00 — Действие: Коммит не выполнен на момент записи; изменения подготовлены в рабочем дереве. → Результат: PENDING
