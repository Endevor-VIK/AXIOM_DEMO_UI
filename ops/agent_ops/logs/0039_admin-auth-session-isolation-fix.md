<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0039_ADMIN_AUTH_SESSION_ISOLATION_FIX_MD
  title: "GLOBAL LOG — 0039_admin-auth-session-isolation-fix"
  status: DONE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-17
  editable_by_agents: true
  change_policy: "Append-only"
-->

<!-- ops/agent_ops/logs/0039_admin-auth-session-isolation-fix.md -->

# GLOBAL LOG — 0039_admin-auth-session-isolation-fix

- Старт: 2026-02-17T19:49:53+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Исправить баг общей сессии между `/admin` и основным сайтом, чтобы admin login/logout не авторизовал `site auth`
- SPEC: —
- Статус: DONE

---

## Step A — Discovery

- 2026-02-17T19:34:40+03:00 — Действие: Проанализированы `server/src/auth/routes.ts`, `server/src/auth/guards.ts`, `server/src/admin/routes.ts`, `app/routes/admin/*`, `components/AdminGate.tsx`. → Результат: OK
- 2026-02-17T19:36:20+03:00 — Действие: Подтверждена причина бага: admin login использовал `/api/auth/login` и cookie `ax_session`, общий с сайтом. → Результат: OK

## Step B — Implementation

- 2026-02-17T19:41:30+03:00 — Действие: Добавлен отдельный backend-контур admin auth: `server/src/admin/authRoutes.ts` (`/api/admin-auth/login|me|logout`) + отдельный cookie `ax_admin_session` через `config.adminCookieName`. → Результат: OK
- 2026-02-17T19:42:20+03:00 — Действие: Добавлен `server/src/admin/guards.ts`; `server/src/admin/routes.ts` переведён на `requireAdminRole('creator')` (проверка admin-cookie вместо site-cookie). → Результат: OK
- 2026-02-17T19:43:05+03:00 — Действие: `server/src/app.ts` обновлён: зарегистрирован префикс `/api/admin-auth`. → Результат: OK
- 2026-02-17T19:44:12+03:00 — Действие: Добавлен frontend admin session слой: `lib/admin/authService.ts`, `lib/admin/useAdminSession.ts`. → Результат: OK
- 2026-02-17T19:45:06+03:00 — Действие: Переведены `components/AdminGate.tsx`, `app/routes/admin/login/page.tsx`, `app/routes/admin/page.tsx` на отдельный admin auth/logout. → Результат: OK
- 2026-02-17T19:46:50+03:00 — Действие: Добавлен регрессионный тест `tests/adminAuthIsolation.spec.ts` на изоляцию сессий и logout-границы между `/api/auth/*` и `/api/admin-auth/*`. → Результат: OK

## Step C — Documentation

- 2026-02-17T19:49:53+03:00 — Действие: Создан GLOBAL LOG 0039 и обновлён индекс `ops/agent_ops/logs/00_LOG_INDEX.md`. → Результат: OK

## Step D — QA

- 2026-02-17T19:48:26+03:00 — Действие: `npm run test:run -- tests/adminAuthIsolation.spec.ts`. → Результат: PASS (2/2).
- 2026-02-17T19:47:45+03:00 — Действие: `npm run typecheck`. → Результат: FAIL (есть предсуществующие ошибки в `components/login/orionLoginConfig.ts` и `server/src/axchat/*`, не связанные с фиксом admin/session isolation).

## Step E — Git

- 2026-02-17T19:53:20+03:00 — Commit: `9ab8d7c` — `fix(admin-auth): isolate admin session from site auth` — Файлы: `app/routes/admin/login/page.tsx`, `app/routes/admin/page.tsx`, `components/AdminGate.tsx`, `lib/admin/authService.ts`, `lib/admin/useAdminSession.ts`, `server/src/admin/authRoutes.ts`, `server/src/admin/guards.ts`, `server/src/admin/routes.ts`, `server/src/app.ts`, `server/src/config.ts`, `tests/adminAuthIsolation.spec.ts`, `ops/agent_ops/logs/0039_admin-auth-session-isolation-fix.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`.
