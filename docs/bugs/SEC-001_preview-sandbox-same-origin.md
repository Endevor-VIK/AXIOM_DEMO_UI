<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_BUGS_SEC_001_PREVIEW_SANDBOX_SAME_ORIGIN_MD
  title: "docs/bugs/SEC-001_preview-sandbox-same-origin.md"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

id: SEC-001
title: Sandbox preview запускает скрипты с правами same-origin (XSS)
status: OPEN
severity: Critical
area: Reader / Content Preview
confidence: High

## Summary
Режим Sandbox в PreviewPane встраивает сырой контент в `<iframe sandbox="allow-scripts allow-same-origin" srcDoc=...>`. Скрипты из файлов контента исполняются с полными правами текущего origin (чтение `localStorage`/сессии), т.к. изоляция снимается флагом `allow-same-origin`. Контент авторский, поэтому это прямой stored-XSS канал.

## Steps to reproduce
1) Добавить HTML-контент с `<script>localStorage.setItem('pwned','1'); alert('XSS');</script>` в `public/data/content/...`.  
2) Открыть его в Content Hub → переключить режим превью на “Sandbox”.  
3) Скрипт выполняется, имеет доступ к хранилищу и может эксфильтровать данные.

## Expected vs Actual
- Ожидаемо: sandbox должен изолировать недоверенный контент; скрипты либо не исполняются, либо работают в opaque origin.  
- Фактически: `allow-scripts allow-same-origin` даёт полный доступ origin, XSS выполняется в основном контексте.

## Evidence
- Iframe в sandbox-режиме: `components/PreviewPane.tsx:625-633` (`sandbox='allow-scripts allow-same-origin'`).  
- Документ строится из сырого контента без вырезания `<script>` в HTML/Markdown: `components/PreviewPane.tsx:216-310`.

## Root cause hypothesis
- Sandbox добавлялся для интерактивного контента, но сочетание `allow-scripts` + `allow-same-origin` убирает изоляцию и превращает `srcDoc` в тот же origin, что и приложение.

## Proposed fix
- Убрать `allow-same-origin` (оставить opaque origin) или вовсе запретить `allow-scripts`; предпочтительно рендерить через DOMPurify/iframe без скриптов.  
- Если скрипты нужны — проксировать через отдельный origin (blob/worker) с жёстким CSP и шлюзом сообщений.  
- Добавить тест, который пытается прочитать `localStorage` из sandbox и должен провалиться.

## Acceptance criteria
- Скрипты из контента не имеют доступа к хранилищу/parent и не выполняются в origin приложения.  
- Автотест воспроизводит попытку XSS и блокирует её.  
- Валидный несценарный контент продолжает отображаться.

## References
- components/PreviewPane.tsx:216-310,625-633
