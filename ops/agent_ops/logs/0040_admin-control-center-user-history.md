<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0040_ADMIN_CONTROL_CENTER_USER_HISTORY_MD
  title: "GLOBAL LOG — 0040_admin-control-center-user-history"
  status: DONE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-17
  editable_by_agents: true
  change_policy: "Append-only"
-->

<!-- ops/agent_ops/logs/0040_admin-control-center-user-history.md -->

# GLOBAL LOG — 0040_admin-control-center-user-history

- Старт: 2026-02-17T20:19:12+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Улучшить админку: разделить user/system аккаунты, добавить смену логина/пароля, историю пользователя (сессии/действия/источник), live console API и стабилизировать logout из админки
- SPEC: —
- Статус: DONE

---

## Step A — Discovery

- 2026-02-17T20:03:20+03:00 — Действие: Проанализированы текущие `app/routes/admin/page.tsx`, `lib/admin/api.ts`, `server/src/admin/routes.ts`, auth/session слой. → Результат: OK
- 2026-02-17T20:05:00+03:00 — Действие: Подтверждена причина «много аккаунтов»: `ui_scan_*` сервисные записи отображались в общей пользовательской таблице без разделения. → Результат: OK

## Step B — Implementation

- 2026-02-17T20:09:10+03:00 — Действие: Добавлен backend audit trail (`server/src/db/audit.ts`) + контекст запроса (`server/src/audit/context.ts`) и таблица `audit_events` в `server/src/db/db.ts`. → Результат: OK
- 2026-02-17T20:10:34+03:00 — Действие: Расширены auth маршруты (`server/src/auth/routes.ts`, `server/src/admin/authRoutes.ts`) логированием login/logout/register событий с IP/UA/device/region/network. → Результат: OK
- 2026-02-17T20:11:40+03:00 — Действие: Добавлены session helpers (`listSessionsByUserId`, `revokeSessionsByUserId`) и update email helper (`updateUserEmail`). → Результат: OK
- 2026-02-17T20:13:25+03:00 — Действие: `server/src/admin/routes.ts` расширен: `GET /api/admin/events`, `GET /api/admin/users/:id/history`, `PATCH /api/admin/users/:id/credentials` + аудит admin операций. → Результат: OK
- 2026-02-17T20:14:22+03:00 — Действие: Добавлен API request capture hook в `server/src/app.ts` для live console (с фильтрами, чтобы убрать self-noise). → Результат: OK
- 2026-02-17T20:16:32+03:00 — Действие: Полностью обновлён frontend admin control center (`app/routes/admin/page.tsx`, `lib/admin/api.ts`, `styles/admin-console.css`) с модулями:
  - user/system accounts split,
  - credential update form,
  - per-user history (sessions + actions),
  - live API console,
  - локальная история операций.
  → Результат: OK
- 2026-02-17T20:17:18+03:00 — Действие: Усилен logout flow (`app/routes/admin/page.tsx`, `lib/admin/authService.ts`) с гарантированным redirect на `/admin/login`. → Результат: OK
- 2026-02-17T20:18:05+03:00 — Действие: Обновлён интеграционный тест `tests/adminAuthIsolation.spec.ts` (credentials update/history/events coverage). → Результат: OK

## Step C — Documentation

- 2026-02-17T20:19:12+03:00 — Действие: Создан GLOBAL LOG 0040 и обновлён индекс `ops/agent_ops/logs/00_LOG_INDEX.md`. → Результат: OK

## Step D — QA

- 2026-02-17T20:17:36+03:00 — Действие: `npm run test:run -- tests/adminAuthIsolation.spec.ts`. → Результат: PASS (3/3).
- 2026-02-17T20:17:42+03:00 — Действие: `npm run typecheck`. → Результат: FAIL (предсуществующие ошибки в `components/login/orionLoginConfig.ts` и `server/src/axchat/*`, не связаны с текущим пакетом правок).

## Step E — Git

- 2026-02-17T20:20:11+03:00 — Commit: `935e66b` — `feat(admin): add control center with user history and live console` — Файлы: `app/routes/admin/page.tsx`, `lib/admin/api.ts`, `lib/admin/authService.ts`, `server/src/admin/authRoutes.ts`, `server/src/admin/routes.ts`, `server/src/app.ts`, `server/src/auth/routes.ts`, `server/src/auth/sessions.ts`, `server/src/db/db.ts`, `server/src/db/users.ts`, `server/src/audit/context.ts`, `server/src/db/audit.ts`, `styles/admin-console.css`, `tests/adminAuthIsolation.spec.ts`, `ops/agent_ops/logs/0040_admin-control-center-user-history.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`.
