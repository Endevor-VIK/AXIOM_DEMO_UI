<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0034_CONTENT_HUB_VIEWMODES_STABILIZATION_V2
  title: "GLOBAL LOG — 0034_content-hub-viewmodes-stabilization-v2"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-11
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- ops/agent_ops/logs/0034_content-hub-viewmodes-stabilization-v2.md -->

# GLOBAL LOG — 0034_content-hub-viewmodes-stabilization-v2

- Старт: 2026-02-11T04:12:44+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Content Hub View Modes Stabilization v2 (Browse/Cards/Orbit/Inspect)
- SPEC: docs/iterations/0034_content-hub-viewmodes-stabilization-v2/SPEC.md
- Статус: ACTIVE

---

## Step A — Discovery

- 2026-02-11T04:12:44+03:00 — Действие: инвентаризация текущего Content Hub (режимы/selection/details) → Результат: IN_PROGRESS
  - Route: `/dashboard/content/*`
  - Текущая модель: `layout=browse|inspect` + `view=list|cards|orbit`, selection = query param `item`
  - Проблема: `ContentDetailsPanel` (tabs Summary/Meta/Source/Links) показывается и в `browse` (через drawer), что загрязняет user UI
  - Риск: изменения пересекаются со SPEC `0031_content-orbit-view-ui-demix` (нужна аккуратная миграция без регрессий)

## Step B — Implementation

- 2026-02-11T05:14:20+03:00 — Действие: введён единый `mode` (`browse|cards|orbit|inspect`) + миграция с legacy `layout/view` → Результат: OK
  - Добавлено: query param `mode`, legacy `layout/view` продолжают читаться (backward compatible)
  - UI-переключатель теперь 4 режима вместо `LayoutMode + ViewMode`
  - Файлы:
    - `app/routes/dashboard/content/context.tsx`
    - `app/routes/dashboard/content/_layout.tsx`
    - `components/ContentFilters.tsx`

- 2026-02-11T05:14:20+03:00 — Действие: Browse стал selection-driven (список слева + превью справа) → Результат: OK
  - Убрано: drawer-поведение в Browse (на desktop)
  - Клик по строке обновляет `item` и превью синхронно
  - Файл: `app/routes/dashboard/content/ContentCategoryView.tsx`

- 2026-02-11T05:14:20+03:00 — Действие: Progressive disclosure (tabs только в Inspect) → Результат: OK
  - `ContentDetailsPanel` получил `variant=preview|inspect`
  - В preview-режимах скрыты `Summary/Meta/Source/Links` tabs
  - `ContentPreview` скрывает кнопку `View meta`, если callback не задан
  - Файлы:
    - `app/routes/dashboard/content/ContentDetailsPanel.tsx`
    - `src/features/content/components/ContentPreview.tsx`

- 2026-02-11T05:14:20+03:00 — Действие: Cards batch (3–6) + Prev/Next batch → Результат: OK
  - Одновременно рендерится не более `cardsPerPage` (<= 6)
  - Логика размера: desktop wide=6, desktop=4, tablet=3, mobile=1–2
  - Файлы:
    - `app/routes/dashboard/content/ContentCategoryView.tsx`
    - `styles/content-library.css`

- 2026-02-11T05:14:20+03:00 — Действие: Orbit стал витриной (без постоянной правой панели) + кнопка Open Inspect → Результат: OK
  - Orbit mode больше не рендерит DetailsPanel параллельно
  - Добавлено: `Open Inspect` (переключает в Inspect с текущим selection)
  - Файл: `app/routes/dashboard/content/ContentCategoryView.tsx`
  - CSS: `styles/content-library.css`

## Step C — Documentation

- 2026-02-11T04:12:44+03:00 — Действие: добавлен DRAFT SPEC + LOG LINK → Результат: OK
  - Добавлено: `docs/iterations/0034_content-hub-viewmodes-stabilization-v2/SPEC.md`
  - Добавлено: `docs/iterations/0034_content-hub-viewmodes-stabilization-v2/SPEC_LOG_LINK.md`

## Step D — QA

- 2026-02-11T05:15:05+03:00 — Действие: `npm run test:run` → Результат: PASS (32 tests)
- 2026-02-11T05:15:10+03:00 — Действие: targeted tsc (Content Hub subset) → Результат: PASS
  - Команда: `npx tsc -p tsconfig.__tmp_0034_content_hub__.json --noEmit` (temp file удалён)
- 2026-02-11T05:15:15+03:00 — Действие: full `npm run typecheck` → Результат: FAIL (не связано с 0034)
  - Ошибки в текущем `main` (даже на чистом дереве): `app/routes/dashboard/axchat/index.tsx`, `app/routes/dashboard/news/page.tsx`, `app/routes/dashboard/page.tsx`

## Step E — Git

- _pending_
