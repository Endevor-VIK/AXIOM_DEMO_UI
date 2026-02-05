<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_BUGS_ARCH_001_DUAL_CONTENT_PIPELINE_MD
  title: "docs/bugs/ARCH-001_dual-content-pipeline.md"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

id: ARCH-001
title: Две несогласованные пайплайны контента (legacy vs VFS) ломают UX
status: OPEN
severity: High
area: Architecture / Content
confidence: High

## Summary
В проекте одновременно живут два стека: легаси `src/features/content` + `public/content-html` и новый VFS (`public/data/content` + `lib/vfs`). Маршруты разделены (Content Hub — VFS, Reader — legacy). Это требует двойного авторинга, ведёт к рассинхрону манифестов и падающим переходам между модулями.

## Steps to reproduce
1) Добавить/собрать новую запись так, чтобы она появилась в `public/data/content/manifest.json`.  
2) Открыть Content Hub — запись есть.  
3) Нажать “Open source” → `/content/{id}` — Reader уходит в легаси и не находит запись (BUG-007).  
4) Видно, что markdown/html лежат в `public/data/content`, а легаси `/content-html` остаётся устаревшим.

## Expected vs Actual
- Ожидаемо: один источник правды для контента, все UI используют его.  
- Фактически: две параллельные схемы, данные расходятся, навигация ломается.

## Evidence
- Content Hub читает `vfs.readContentAggregate()` из `public/data/content`: `app/routes/dashboard/content/_layout.tsx:43-115`.  
- Reader работает через `content-index.json` и `/content-html`: `src/features/content/pages/ReaderPage.tsx:5-118`.  
- В репо одновременно `public/data/content/*` и `public/content-html/*`.

## Root cause hypothesis
- Миграция на VFS не доведена: просмотр/листинг перенесли, а Reader/экспорт оставили на старом пути для совместимости.

## Proposed fix
- Консолидировать на VFS: удалить/заменить легаси `content-index.json` и `/content-html/`, Reader перевести на тот же источник.  
- Согласовать скрипты (`scripts/build-content.ts`, `tools/export.ts`) под один артефакт и добавить проверку в CI на наличие легаси директорий.  
- Добавить регрессионный тест на переход из Content Hub в Reader для новых записей.

## Acceptance criteria
- Контент обслуживается из одного дерева артефактов; `/content/{id}` открывает любую запись из `public/data/content/manifest.json`.  
- CI валит сборку при появлении легаси путей.  
- Нет необходимости дублировать файлы под `/content-html/`.

## References
- app/routes/dashboard/content/_layout.tsx:43-115
- src/features/content/pages/ReaderPage.tsx:5-118
- public/data/content/manifest.json
- public/content-html/*
