<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0007_DOCS_OPS_REBASE_MD
  title: "GLOBAL LOG — 0007_docs-ops-rebase"
  status: ACTIVE
  mode: Log
  goal: "Rebase docs/ops/agent/integrations to AXS format"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0007_docs-ops-rebase

- Старт: 2026-02-05T15:47:30+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Ребейз документации/ops/agent/integrations под формат AXS
- SPEC: —
- Статус: ACTIVE

---

## Step A — Discovery
- 2026-02-05T15:47:30+03:00 — Действие: Зафиксировать требования CREATOR (перенос AgentOps в ops, AXS_HEADER_META, архив кандидатов). → Результат: OK

## Step B — Implementation
- 2026-02-05T15:47:30+03:00 — Действие: Перенос `docs/agent_ops` → `ops/agent_ops`, обновление ссылок. → Результат: OK
- 2026-02-05T15:47:30+03:00 — Действие: Добавлены AXS_HEADER_META для markdown в проекте. → Результат: OK
- 2026-02-05T15:47:30+03:00 — Действие: Созданы порталы: `ops/README.md`, `docs/iterations/README.md`, `docs/integrations/README.md`, `docs/archive/*`, `docs/protocols/LANGUAGE_POLICY.md`. → Результат: OK

## Step C — Documentation
- 2026-02-05T15:47:30+03:00 — Действие: Обновлены `docs/README.md`, `AGENTS.md`. → Результат: OK

## Step D — QA
- 2026-02-05T15:47:30+03:00 — Действие: Быстрый чек ссылок/путей и наличие AXS_HEADER_META в основных документах. → Результат: OK

## Step E — Git
- 2026-02-05T15:47:30+03:00 — Commit: — — PENDING

---

## Заметки / Решения
- Архив: добавлен список кандидатов, перенос после подтверждения CREATOR.

## Риски / Открытые вопросы
- Нужна установка системных зависимостей для Playwright/Lighthouse (sudo). 

## Чеклист приёмки
- [ ] AgentOps перенесен в ops/
- [ ] AXS_HEADER_META добавлены
- [ ] Док-структура обновлена
- [ ] Архив кандидатов зафиксирован
