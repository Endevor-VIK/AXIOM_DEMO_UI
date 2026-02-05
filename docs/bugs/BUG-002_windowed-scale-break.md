<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_BUGS_BUG_002_WINDOWED_SCALE_BREAK_MD
  title: "docs/bugs/BUG-002_windowed-scale-break.md"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

# docs/bugs/BUG-002_windowed-scale-break.md

---
id: BUG-002
title: При выходе в оконный режим ломается scale: элементы наезжают/теряют корректный форм-фактор
status: OPEN
severity: High
area: Responsive / Global Scale
created: 2025-12-19
updated: 2025-12-19
---

## Summary
При изменении режима отображения (переход в оконный режим / изменение размеров окна) **ломается scale-логика**: элементы интерфейса могут **наезжать друг на друга**, менять размеры не по правилам, ломать сетку и отступы.

## Environment
- Pages observed: `/dashboard`, `/dashboard/content/all?...`
- Trigger: resize окна / переход “оконный режим”

## Steps to Reproduce
1) Открыть сайт в обычном режиме
2) Перевести окно в “оконный режим” и менять размеры (ширина/высота)
3) Наблюдать, что scale/лейаут перестает быть консистентным: блоки сдвигаются/перекрываются/ломают форму

## Expected
- При любом resize адаптив корректно пересчитывается.
- UI сохраняет сетку, не допускает перекрытий, не “плывет”.

## Actual
- После resize появляются перекрытия / некорректный форм-фактор / неправильные позиции блоков.

## Notes / Hypothesis (draft)
Типовые причины:
- scale вычисляется один раз и **не обновляется** на `resize`/`orientationchange`
- используется `innerWidth/innerHeight`, но не учитываются scrollbar/devicePixelRatio
- `transform: scale()` + фиксированные px-позиции → накопление ошибок при ресайзе
- breakpoints конфликтуют с “ручным масштабированием”

## Proposed Fix (draft)
- Убедиться, что scale/metrics пересчитываются на:
  - `window.resize`
  - изменения `visualViewport` (если используется)
- Нормализовать источники размеров: `document.documentElement.clientWidth/clientHeight` vs `innerWidth/innerHeight`
- Минимизировать влияние `transform: scale` на layout:
  - вынести fixed-слои (overlay/footer) в отдельный слой без transform
  - ограничить scale только “контентному” контейнеру, не всему приложению

## Investigation References
- Branch commits: `feat/content-v2.3/content-hub-ui-redesign`
- Commit: `47e57dc7ff1cea8ffba12f07e5ec5767ffe8de47`
- Commit: `0c540a67a6e4181eb0d2909edf0d2291d8a33ceb`
- Commit: `efa9d1d8d9bb7433581395a4e403500a7531057b`

## Acceptance Criteria
- Resize окна не ломает сетку, нет перекрытий.
- После 10+ ресайзов подряд интерфейс остается стабильным.
- Состояние на скрине 4 достигается в тех же условиях, что и на 2–3.
