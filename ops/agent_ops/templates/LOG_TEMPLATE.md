<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_TEMPLATES_LOG_TEMPLATE_MD
  title: "GLOBAL LOG — {NNNN}_{task_slug}"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- ops/agent_ops/templates/LOG_TEMPLATE.md -->

# GLOBAL LOG — {NNNN}_{task_slug}

- Старт: {ISO_TIMESTAMP}
- Агент: {AGENT_NAME_OR_MODEL}
- Репозиторий: {REPO_NAME}
- Ветка: {BRANCH_NAME}
- Задача: {TASK_TITLE}
- SPEC: {SPEC_PATH_OR_NONE}
- Статус: {ACTIVE|PAUSED|DONE|BLOCKED}

---

## Step A — Discovery
- {ISO_TIMESTAMP} — Действие:  → Результат: 

## Step B — Implementation
- {ISO_TIMESTAMP} — Действие:  → Результат: 

## Step C — Documentation
- {ISO_TIMESTAMP} — Действие:  → Результат: 

## Step D — QA
- {ISO_TIMESTAMP} — Действие:  → Результат: 

## Step E — Git
- {ISO_TIMESTAMP} — Commit: `<hash>` — `<message>` — Файлы: `...`

---

## Заметки / Решения
- 

## Риски / Открытые вопросы
- 

## Чеклист приёмки
- [ ] 
