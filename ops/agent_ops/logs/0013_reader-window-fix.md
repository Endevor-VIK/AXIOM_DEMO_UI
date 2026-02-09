<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0013_READER_WINDOW_FIX_MD
  title: "GLOBAL LOG — 0013_reader-window-fix"
  status: DONE
  mode: Log
  goal: "Restore reader window layout (legacy vs ReadRoute style clash)"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0013_reader-window-fix

- Старт: 2026-02-09T16:27:40+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Починить окно reader (конфликт стилей legacy reader vs ReadRoute)
- SPEC: —
- Статус: DONE

---

## Step A — Discovery
- 2026-02-09T16:27:40+03:00 — Действие: Зафиксировать запрос CREATOR и проверить логи/историю; выявлен конфликт стилей `.ax-reader` из `content-hub-v2.css`, который переопределяет стили ReadRoute. → Результат: OK

## Step B — Implementation
- 2026-02-09T16:27:40+03:00 — Действие: Ограничить legacy‑стили `.ax-reader` в `content-hub-v2.css` через класс `axr-legacy`; добавить `axr-legacy` в ReaderPage. → Результат: OK

## Step C — Documentation
- 2026-02-09T16:27:40+03:00 — Действие: Обновить AgentOps лог и индекс. → Результат: OK

## Step D — QA
- 2026-02-09T16:27:40+03:00 — Действие: Ручной UI‑smoke не запускался (нужен прогон reader `/dashboard/content/read/:id` и legacy `/content/:id`). → Результат: SKIP

## Step E — Git
- 2026-02-09T16:27:40+03:00 — Commit: <pending> — fix(reader): isolate legacy reader styles — Файлы: `styles/content-hub-v2.css`, `src/features/content/pages/ReaderPage.tsx`, `ops/agent_ops/logs/0013_reader-window-fix.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`

---

## Заметки / Решения
- Legacy reader теперь помечается `axr-legacy`, чтобы не ломать ReadRoute (full reader).

## Риски / Открытые вопросы
- Нужна проверка в UI: /dashboard/content/read/:id и /content/:id.

## Чеклист приёмки
- [x] Legacy reader стили не переопределяют ReadRoute
- [ ] Проверить скролл/overlay меню в legacy reader
- [ ] Проверить full reader layout в Content Hub
