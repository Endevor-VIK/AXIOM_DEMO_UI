<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_README_MD
  title: "AXIOM_DEMO_UI — Docs Overview"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/README.md -->

# AXIOM WEB CORE UI — Docs Overview

Гид по каталогу `docs` после реорганизации. Описывает, где лежат спеки, итерации, релизы, интеграции и логи агентов.

## Быстрые ссылки
- AgentOps (логи/шаблоны): `ops/agent_ops/` (см. README внутри)
- Devtools (SPEC/README/лог туннеля): `docs/devtools/`
- Итерации: `docs/iterations/`
- Релизы: `docs/releases/`
- Интеграции: `docs/integrations/`
- Спеки: `docs/specs/`
- Контент-гайд: `docs/content/`
- Гайды: `docs/guides/`
- Планы: `docs/plans/`

## Структура
- `ops/agent_ops/` — система логов агентов (GLOBAL LOGи, индекс, шаблоны, README).
- `devtools/` — спеки/логи для тулов разработки (например, туннель caddy+cloudflared).
- `iterations/` — рабочие документы по итерациям. Пример: `content-v2.1-fix/` (SOP + PROMPT).
- `releases/` — чеклисты и артефакты релизов. Пример: `content-v2.1-fix/release-checklist.md`.
- `integrations/` — внешние интеграции (ax-openai-api-v0.1, ax-counter-wreath).
- `specs/` — отдельные продуктовые/тех. спеки (например, binary-background).
- `content/` — гайды по контенту (content-authoring-v2.1).
- `guides/` — общие инструкции (например, `getting-started.md`).
- `plans/` — планы итераций/проекта (iteration-plan-axiom-demo-ui-v1.0).
- `identity_profile_auth/` — спека/лог по профилю аутентификации.
- `bugs/` — реестр инцидентов и багов.
- `content_hub_v2/` — спека, идеи, лог по контент-хабу.
- `protocols/` — базовые протоколы (например, Language Policy).
- `archive/` — архив неактуальных документов.

## Навигация по задачам
- Для работы агента: старт с `ops/agent_ops/README.md`, заведи GLOBAL LOG и LINK к SPEC (если есть).
- Для content-v2.1-fix: читай `docs/iterations/content-v2.1-fix/content-v2.1-fix.md` и сопутствующий `content-v2.1-fix-prompt-tz.md`; релизный чеклист — `docs/releases/content-v2.1-fix/release-checklist.md`.
- Для туннеля dev: `docs/devtools/TUNNEL_DEV_IMPLEMENTATION_SPEC.md` + LINK → `ops/agent_ops/logs/0002_tunnel-dev-implementation.md`.
- Для контент-авторинга: `docs/content/content-authoring-v2.1/content-authoring-v2.1.md`.
- Интеграции: смотри подпапки `docs/integrations/`.

## Правила поддержки
- Новые задачи/итерации — создавай подпапку в соответствующей категории и добавляй ссылки в связанные документы.
- При переносе файлов обновляй все относительные ссылки и фиксируй это в AgentOps логе текущей сессии.
- Именование файлов/папок: ASCII, kebab-case, без пробелов.

## Связанные логи
- Текущие сессии: см. `ops/agent_ops/logs/` (индекс `00_LOG_INDEX.md`).
- Пример лога по docs-реорганизации: `ops/agent_ops/logs/0003_docs-structure-cleanup.md`.
- Пример лога по туннелю dev: `ops/agent_ops/logs/0002_tunnel-dev-implementation.md`.
