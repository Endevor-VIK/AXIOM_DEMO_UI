<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_BUGS_BUG_007_READER_LEGACY_DATASET_MD
  title: "docs/bugs/BUG-007_reader-legacy-dataset.md"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

id: BUG-007
title: Reader использует legacy-индекс и не открывает новые VFS записи
status: OPEN
severity: High
area: Reader / Content Hub
confidence: High

## Summary
Маршрут `/content/:id` остаётся на старом стеке `content-index.json` + `/content-html/*.html`. Новые записи из актуального VFS-агрегата (`public/data/content/manifest.json`) туда не попадают, поэтому переход “Open source” из Content Hub ведёт на пустой ридер с ошибкой “Файл не найден”. Требуется двойное сопровождение данных.

## Steps to reproduce
1) Dashboard → Content → выбрать “Central Node Plaza” (`LOC-0001`).  
2) В превью нажать “Open source” (открывается `/content/LOC-0001`).  
3) Ридер показывает страницу ошибки.

## Expected vs Actual
- Ожидаемо: Reader открывает ту же запись, что и Content Hub.  
- Фактически: `LOC-0001` отсутствует в legacy-индексе, `resolveEntry` возвращает null, контент не грузится.

## Evidence
- Резолв из `content-index.json`: `src/features/content/pages/ReaderPage.tsx:5-18,26-64`.  
- Фетчит `/content-html/{id}.html`: `src/features/content/pages/ReaderPage.tsx:94-118`.  
- Актуальный манифест VFS содержит `LOC-0001`: `public/data/content/manifest.json`.

## Root cause hypothesis
- Миграция на VFS закончилась только для Content Hub; Reader остался на легаси-файлах и не видит новые данные.

## Proposed fix
- Переключить `ReaderPage` на `vfs.readContentAggregate` и общую резолюцию id, удалить/заменить легаси `content-index.json` и `/content-html/`.  
- Использовать тот же рендерер, что и PreviewPane, или переадресовывать `/content/:id` на новый стек.  
- Добавить тест, открывающий VFS-only запись и проверяющий успешный рендер.

## Acceptance criteria
- Любая запись из `public/data/content/manifest.json` открывается через `/content/{id}` без ошибок.  
- Легаси-данные не требуются для работы Reader.  
- Тесты закрывают кейс VFS-only.

## References
- src/features/content/pages/ReaderPage.tsx:5-118,240-283
- public/data/content/manifest.json
