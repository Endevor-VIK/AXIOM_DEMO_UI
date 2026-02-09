<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0014_READER_RESTORE_LEGACY_MD
  title: "GLOBAL LOG — 0014_reader-restore-legacy"
  status: ACTIVE
  mode: Log
  goal: "Restore legacy reader behavior after AXS restructure"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0014_reader-restore-legacy

- Старт: 2026-02-09T16:45:00+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Вернуть legacy reader к состоянию до переноса (навигация + fallback на локальные данные)
- SPEC: —
- Статус: ACTIVE

---

## Step A — Discovery
- 2026-02-09T16:45:00+03:00 — Действие: Зафиксировать запрос CREATOR (reader работал до переноса; восстановить вид/поведение из старой базы). → Результат: OK

## Step B — Implementation
- 2026-02-09T16:45:00+03:00 — Действие: Восстановить переходы Content Hub на `/content/:id` (legacy reader) и добавить fallback для `content-index`/`content-html` при отсутствии export snapshot. → Результат: OK

## Step C — Documentation
- 2026-02-09T16:45:00+03:00 — Действие: Обновить AgentOps лог и индекс. → Результат: OK

## Step D — QA
- 2026-02-09T16:45:00+03:00 — Действие: Ручной UI‑smoke не запускался (нужны проверки `/content/:id` и переходов из Content Hub). → Результат: SKIP

## Step E — Git
- 2026-02-09T16:45:00+03:00 — Commit: <pending> — fix(reader): restore legacy reader routing + fallback data — Файлы: `app/routes/dashboard/content/ContentCategoryView.tsx`, `src/features/content/data/useContentIndex.ts`, `src/features/content/pages/ReaderPage.tsx`, `ops/agent_ops/logs/0014_reader-restore-legacy.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`

---

## Заметки / Решения
- Legacy reader остаётся источником “эталонного” вида как в старой базе.

## Риски / Открытые вопросы
- Нужен подтверждённый фидбэк по тому, что именно считалось “поломкой” (маршрут или рендер/данные).

## Чеклист приёмки
- [ ] Переход “Open source” ведёт на `/content/:id`
- [ ] Reader открывает файл без export snapshot
- [ ] Визуально совпадает с референс‑скриншотами
