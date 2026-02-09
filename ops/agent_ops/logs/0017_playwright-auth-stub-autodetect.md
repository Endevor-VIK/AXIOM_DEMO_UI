<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0017_PLAYWRIGHT_AUTH_STUB_AUTODETECT_MD
  title: "GLOBAL LOG — 0017_playwright-auth-stub-autodetect"
  status: DONE
  mode: Log
  goal: "Stabilize Playwright runs on existing ports (auth stub + auto-detect)"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0017_playwright-auth-stub-autodetect

- Старт: 2026-02-09T19:51:24+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Стабилизировать e2e через активный dev‑порт (auth stub + auto‑детект).
- SPEC: —
- Статус: DONE

---

## Step A — Discovery
- 2026-02-09T19:51:24+03:00 — Действие: Зафиксировать проблему — при запуске через существующий dev‑сервер UI уходит на login из-за local auth. → Результат: OK

## Step B — Implementation
- 2026-02-09T19:51:24+03:00 — Действие: Добавить `stubAuthApi` для `/api/auth/*` и расширить bootstrap с `ax_demo_session_v1`. → Результат: OK
- 2026-02-09T19:51:24+03:00 — Действие: Обновить `storageState.json` и улучшить detect login в тестах. → Результат: OK
- 2026-02-09T19:51:24+03:00 — Действие: Добавить подсказку в `run_local.py` для auto‑детекта Playwright. → Результат: OK

## Step C — Documentation
- 2026-02-09T19:51:24+03:00 — Действие: Обновить индекс AgentOps. → Результат: OK

## Step D — QA
- 2026-02-09T19:51:24+03:00 — Действие: `PLAYWRIGHT_USE_EXISTING_SERVER=1 PLAYWRIGHT_PORT=5173 npm run test:e2e -- --project=chromium tests/e2e/content.spec.ts` → Результат: PASS
- 2026-02-09T19:51:24+03:00 — Действие: `PLAYWRIGHT_USE_EXISTING_SERVER=auto PLAYWRIGHT_PORT=5173 npm run test:e2e -- --project=chromium tests/e2e/content.spec.ts` → Результат: PASS (auto‑fallback, если сервер не поднят)

## Step E — Git
- 2026-02-09T19:51:24+03:00 — Commit: 63ebc06 — test(e2e): stub auth for local dev server — Файлы: `scripts/devtools/run_local.py`, `tests/e2e/utils.ts`, `tests/e2e/content.spec.ts`, `tests/e2e/accessibility.spec.ts`, `tests/e2e/storageState.json`, `ops/agent_ops/logs/0017_playwright-auth-stub-autodetect.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`

---

## Заметки / Решения
- Тесты теперь подхватывают local auth через stub `/api/auth/*`, поэтому работают с живым dev‑сервером без бэкенда.

## Риски / Открытые вопросы
- Нет.

## Чеклист приёмки
- [x] E2E работает с уже запущенным dev‑сервером
- [x] Auto‑fallback при отсутствии сервера
