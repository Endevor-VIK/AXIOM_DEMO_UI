<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0021_RUN_LOCAL_FULL_DEFAULT_MD
  title: "GLOBAL LOG — 0021_run-local-full-default"
  status: DONE
  mode: Log
  goal: "Make run_local.py default to full (UI + API)"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0021_run-local-full-default

- Старт: 2026-02-09T21:07:10+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Сделать запуск backend стандартом в run_local.py
- SPEC: —
- Статус: DONE

---

## Step A — Discovery
- 2026-02-09T21:07:10+03:00 — Действие: Зафиксировать запрос CREATOR (default запуск с backend). → Результат: OK

## Step B — Implementation
- 2026-02-09T21:07:10+03:00 — Действие: Обновить run_local.py: DEV_MODE по умолчанию full + авто‑включение `AX_ALLOW_REGISTER=1`, `AX_SEED_TEST=1`. → Результат: OK

## Step C — Documentation
- 2026-02-09T21:07:10+03:00 — Действие: README (AXIOM WEB CORE UI) — описать seed‑аккаунты и правила хранения кредов. → Результат: OK

## Step D — QA
- 2026-02-09T21:07:10+03:00 — Действие: N/A (скрипт изменения). → Результат: SKIP

## Step E — Git
- 2026-02-09T21:07:10+03:00 — Commit: `<pending>` — `chore(devtools): default run_local to full` — Файлы: `scripts/devtools/run_local.py`, `README.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`, `ops/agent_ops/logs/0021_run-local-full-default.md`

---

## Заметки / Решения
- 

## Риски / Открытые вопросы
- 

## Чеклист приёмки
- [x] run_local.py по умолчанию поднимает UI + API
