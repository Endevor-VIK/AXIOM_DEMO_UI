<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0042_ADMIN_LOGOUT_FORCE_REAUTH_SECTIONS_MD
  title: "GLOBAL LOG — 0042_admin-logout-force-reauth-sections"
  status: DONE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-17
  editable_by_agents: true
  change_policy: "Append-only"
-->

<!-- ops/agent_ops/logs/0042_admin-logout-force-reauth-sections.md -->

# GLOBAL LOG — 0042_admin-logout-force-reauth-sections

- Старт: 2026-02-17T21:43:57+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Зафиксировать обязательный повторный вход в админку после logout, скорректировать секции UI и вернуть читаемые dev-логи API
- SPEC: —
- Статус: DONE

---

## Step A — Discovery

- 2026-02-17T21:45:00+03:00 — Действие: Получен баг-репорт CREATOR: после logout возможен прямой вход на `/admin` без повторного ввода данных; верхние блоки админки должны быть без сворачивания; в `run_local.py` пропали видимые API-логи. → Результат: OK
- 2026-02-17T21:47:00+03:00 — Действие: Проверены `AdminGate`, `admin authService`, `admin login page`, `run_local.py`; подтверждены причины:
  - default `AX_API_LOG_LEVEL=warn` скрывает request-логи,
  - logout-поток не гарантировал принудительный re-auth между сессиями,
  - в UI у блоков `Новый аккаунт`/`Смена логина/пароля` оставались кнопки сворачивания.
  → Результат: OK

## Step B — Implementation

- 2026-02-17T21:55:00+03:00 — Действие: Добавлен механизм принудительного re-auth админки через `sessionStorage`-флаг:
  - новый модуль `lib/admin/reauth.ts`,
  - интеграция в `lib/admin/authService.ts` (`refresh/login/logout`),
  - учёт флага в `components/AdminGate.tsx`,
  - корректировка `app/routes/admin/login/page.tsx` (нет авто-перехода при force reauth, локальный logout best-effort).
  → Результат: OK
- 2026-02-17T22:02:00+03:00 — Действие: Исправлен logout-flow в `app/routes/admin/page.tsx`: убран timeout race, навигация на `/admin/login` после завершения logout, исключён быстрый повторный доступ. → Результат: OK
- 2026-02-17T22:08:00+03:00 — Действие: Обновлён UI секций `app/routes/admin/page.tsx`:
  - `Новый аккаунт` и `Смена логина/пароля` всегда развернуты,
  - кнопки сворачивания для этих двух секций удалены,
  - остальные секции стартуют свёрнутыми.
  → Результат: OK
- 2026-02-17T22:12:00+03:00 — Действие: `scripts/devtools/run_local.py` возвращён на `AX_API_LOG_LEVEL=info` по умолчанию (с подсказкой про `warn`). → Результат: OK
- 2026-02-17T22:14:00+03:00 — Действие: `lib/auth/serverAuth.ts` расширен: при site logout выполняется best-effort `/api/admin-auth/logout` и ставится флаг force reauth для админки. → Результат: OK

## Step C — Documentation

- 2026-02-17T22:16:00+03:00 — Действие: Создан GLOBAL LOG 0042, добавлена запись в индекс `ops/agent_ops/logs/00_LOG_INDEX.md`. → Результат: OK

## Step D — QA

- 2026-02-17T21:56:42+03:00 — Действие: `npm run test:run -- tests/adminAuthIsolation.spec.ts`. → Результат: PASS (3/3).
- 2026-02-17T22:09:31+03:00 — Действие: `npm run build -- --emptyOutDir`. → Результат: PASS.
- 2026-02-17T22:10:20+03:00 — Действие: Локальный `tsc` по отдельным файлам без project-конфига. → Результат: SKIP/INVALID (команда нерелевантна для alias/JSX в проекте, не использовалась как gate).

## Step E — Git

- 2026-02-17T22:18:28+03:00 — Commit: `0f9696c` — `fix(admin): enforce forced re-login and harden auth/logout flow` — Файлы: `app/routes/admin/login/page.tsx`, `app/routes/admin/page.tsx`, `components/AdminGate.tsx`, `lib/admin/api.ts`, `lib/admin/authService.ts`, `lib/admin/reauth.ts`, `lib/auth/serverAuth.ts`, `scripts/devtools/run_local.py`, `server/src/admin/authRoutes.ts`, `server/src/app.ts`, `server/src/auth/routes.ts`, `server/src/config.ts`, `styles/admin-console.css`.
