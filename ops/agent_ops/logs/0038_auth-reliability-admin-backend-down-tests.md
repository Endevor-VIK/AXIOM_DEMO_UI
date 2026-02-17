<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0038_AUTH_RELIABILITY_ADMIN_BACKEND_DOWN_TESTS_MD
  title: "GLOBAL LOG — 0038_auth-reliability-admin-backend-down-tests"
  status: DONE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-17
  editable_by_agents: true
  change_policy: "Append-only"
-->

<!-- ops/agent_ops/logs/0038_auth-reliability-admin-backend-down-tests.md -->

# GLOBAL LOG — 0038_auth-reliability-admin-backend-down-tests

- Старт: 2026-02-17T18:06:25+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Стабилизировать вход (`creator/axiom`), убрать автоподстановку в admin login, добавить e2e-проверки login/admin-login при недоступном backend
- SPEC: —
- Статус: DONE

---

## Step A — Discovery

- 2026-02-17T17:29:40+03:00 — Действие: Проанализированы `server/src/config.ts`, `server/src/db/seed.ts`, `server/src/db/users.ts`, `app/routes/admin/login/page.tsx`, `scripts/devtools/run_local.py`, текущие e2e тесты. → Результат: OK
- 2026-02-17T17:31:00+03:00 — Действие: Подтверждена причина `invalid_credentials`: существующий `creator` не переустанавливал пароль при seed, поэтому `creator/axiom` не гарантировался. → Результат: OK

## Step B — Implementation

- 2026-02-17T17:33:40+03:00 — Действие: Добавлен `creatorForceReset` в `server/src/config.ts` (`AX_CREATOR_FORCE_RESET`). → Результат: OK
- 2026-02-17T17:34:20+03:00 — Действие: Добавлен `updateUserPassword` в `server/src/db/users.ts`; seed creator теперь обновляет пароль существующего пользователя при `creatorForceReset=1`. → Результат: OK
- 2026-02-17T17:36:10+03:00 — Действие: `run_local.py` обновлён: `AX_CREATOR_FORCE_RESET=1` по умолчанию в full/api/admin; ссылки `/admin/login` и `/admin` печатаются сразу при старте. → Результат: OK
- 2026-02-17T17:37:55+03:00 — Действие: `app/routes/admin/login/page.tsx`: убрана автоподстановка `creator/axiom` (поля стартуют пустыми), отключён autocomplete. → Результат: OK
- 2026-02-17T17:40:20+03:00 — Действие: Добавлен e2e `tests/e2e/auth-backend-down.spec.ts` для `/login` и `/admin/login` в режиме недоступного backend. → Результат: OK
- 2026-02-17T18:09:50+03:00 — Действие: `run_local.py`: добавлен явный warning для `DEV_MODE=ui`, что backend auth/API не поднят и login/admin auth может падать. → Результат: OK
- 2026-02-17T19:04:30+03:00 — Действие: `app/routes/admin/login/page.tsx` переведён на EN; удалены отображения `creator/axiom` (подсказка и placeholders), поля входа оставлены пустыми по умолчанию. → Результат: OK
- 2026-02-17T19:04:55+03:00 — Действие: Обновлён `tests/e2e/auth-backend-down.spec.ts` под EN-лейблы админ-login и проверки пустых полей. → Результат: OK

## Step C — Documentation

- 2026-02-17T18:03:12+03:00 — Действие: `README.md` дополнен ENV `AX_CREATOR_FORCE_RESET` и командами проверки сценария `backend down`. → Результат: OK
- 2026-02-17T18:06:25+03:00 — Действие: Обновлён индекс логов `ops/agent_ops/logs/00_LOG_INDEX.md` (добавлена задача 0038). → Результат: OK

## Step D — QA

- 2026-02-17T18:01:10+03:00 — Действие: `npm run typecheck`. → Результат: PASS.
- 2026-02-17T18:01:58+03:00 — Действие: real API login-check: запуск `dev:api` на `8791` с `AX_CREATOR_FORCE_RESET=1` + `POST /api/auth/login` (`creator/axiom`). → Результат: PASS (`HTTP 200`, роль `creator`).
- 2026-02-17T18:02:40+03:00 — Действие: smoke `PORT=5193 AX_API_PORT=8793 DEV_MODE=admin timeout 20s python3 scripts/devtools/run_local.py`. → Результат: PASS (ссылки на админку печатаются сразу, UI+API поднимаются).
- 2026-02-17T18:05:40+03:00 — Действие: e2e backend-down: `PLAYWRIGHT_USE_EXISTING_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5192 npm run test:e2e -- --project=chromium tests/e2e/auth-backend-down.spec.ts` (UI поднят отдельно с `AX_API_PORT=65530`). → Результат: PASS (2/2).
- 2026-02-17T18:10:56+03:00 — Действие: smoke `PORT=5194 DEV_MODE=ui timeout 12s python3 scripts/devtools/run_local.py` + финальный `npm run typecheck`. → Результат: PASS (warning в UI-only выводится, typecheck OK).
- 2026-02-17T19:08:20+03:00 — Действие: повторный прогон `PLAYWRIGHT_USE_EXISTING_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5195 npm run test:e2e -- --project=chromium tests/e2e/auth-backend-down.spec.ts` (после EN-перевода admin login). → Результат: PASS (2/2).
- 2026-02-17T19:09:26+03:00 — Действие: повторный `npm run typecheck` после финального текста ошибки access-role. → Результат: PASS.

## Step E — Git

- 2026-02-17T19:14:21+03:00 — Commit: `8e05222` — `feat(admin): add custom console, auth hardening, and backend-down e2e` — Файлы: `app/routes/admin/login/page.tsx`, `tests/e2e/auth-backend-down.spec.ts`, `server/src/config.ts`, `server/src/db/seed.ts`, `server/src/db/users.ts`, `scripts/devtools/run_local.py`, `README.md`, `ops/agent_ops/logs/0038_auth-reliability-admin-backend-down-tests.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`.
