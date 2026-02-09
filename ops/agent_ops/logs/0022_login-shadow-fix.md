<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0022_LOGIN_SHADOW_FIX_MD
  title: "GLOBAL LOG — 0022_login-shadow-fix"
  status: DONE
  mode: Log
  goal: "Fix login handler shadowing (login2 is not a function)"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0022_login-shadow-fix

- Старт: 2026-02-09T21:40:10+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Исправить баг логина (затенение функции login переменной).
- SPEC: —
- Статус: DONE

---

## Step A — Discovery
- 2026-02-09T21:40:10+03:00 — Действие: Зафиксировать ошибку `login2 is not a function` при входе. → Результат: OK

## Step B — Implementation
- 2026-02-09T21:40:10+03:00 — Действие: Переименовать state `login` → `userId` в login page. → Результат: OK

## Step C — Documentation
- 2026-02-09T21:40:10+03:00 — Действие: N/A. → Результат: SKIP

## Step D — QA
- 2026-02-09T21:40:10+03:00 — Действие: Проверка через Playwright (login -> /dashboard). → Результат: OK

## Step E — Git
- 2026-02-09T21:40:10+03:00 — Commit: `<pending>` — `fix(auth): resolve login shadowing` — Файлы: `app/routes/login/page.tsx`, `ops/agent_ops/logs/00_LOG_INDEX.md`, `ops/agent_ops/logs/0022_login-shadow-fix.md`

---

## Заметки / Решения
- 

## Риски / Открытые вопросы
- 

## Чеклист приёмки
- [x] Вход работает (login -> /dashboard)
