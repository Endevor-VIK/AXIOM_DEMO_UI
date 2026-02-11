<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0033_NEWS_SIGNAL_CENTER_REWORK_V1
  title: "GLOBAL LOG — 0033_news-signal-center-rework-v1"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-11
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- ops/agent_ops/logs/0033_news-signal-center-rework-v1.md -->

# GLOBAL LOG — 0033_news-signal-center-rework-v1

- Старт: 2026-02-11T02:28:36+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: NEWS — Signal Center Rework v1 (autoplay + density + de-duplication)
- SPEC: docs/iterations/0013_news-signal-center-rework-v1/SPEC.md
- Статус: ACTIVE

---

## Step A — Discovery

- 2026-02-11T02:28:36+03:00 — Действие: старт по SPEC (inventory текущего NEWS v2) → Результат: IN_PROGRESS
  - Route: `app/routes/dashboard/news/page.tsx`
  - Data source: `lib/vfs/index.ts` -> `readNewsManifest()` -> `public/data/news/manifest.json`
  - Текущее UX: master-detail (Dispatch + Signal Center + Feed), есть tabs/collapse, presets сейчас в Dispatch, autoplay отсутствует, плотность завышена
  - Требуемые изменения:
    - убрать пресеты и Today из Dispatch (перенести в toolbar)
    - добавить Autoplay (interval 8-12s default), pause on hover/focus/modal, progress indicator
    - снизить typography/spacing, при необходимости добавить density toggle

## Step B — Implementation

- 2026-02-11T06:18:34+03:00 — Действие: устранён visual regression NEWS toolbar/Signal Center → Результат: OK
  - `app/routes/dashboard/news/page.tsx`
  - Dispatch очищен от дублирующих пресетов/Today; оставлены status + `MARK ALL READ` + `UNREAD ONLY` + `PINNED ONLY`
  - Signal Center: `AUTO` включён по умолчанию, интервал по query (`/dashboard/news?autoplay=12`, default 12s), pause на hover/focus/modal/interaction
  - Из header удалены лишние контролы (`10s`, `PIN`, `MARK READ`, `EXPAND`); Pin/Read оставлены в `LINKS`
  - Добавлена анимация смены packet (`ax-signal-center__packet`)
  - Плотность уменьшена (типографика/spacing), улучшен красный контраст в рамках NEWS route
  - Добавлен `manualSelectionSeq` для pause autoplay при ручном выборе карточки
- 2026-02-11T06:18:34+03:00 — Действие: адаптирован e2e smoke под новый UX NEWS → Результат: OK
  - `tests/e2e/news.spec.ts`
  - Убран сценарий presets (удалены из UI)
  - Добавлен autoplay smoke (`?autoplay=2` + проверка смены headline)
  - Сохранены проверки responsive matrix / no horizontal overflow / navigation / pin flow

## Step C — Documentation

- 2026-02-11T02:28:36+03:00 — Действие: добавлен DRAFT SPEC + LOG LINK → Результат: OK
  - Добавлено: `docs/iterations/0013_news-signal-center-rework-v1/SPEC.md`
  - Добавлено: `docs/iterations/0013_news-signal-center-rework-v1/SPEC_LOG_LINK.md`

## Step D — QA

- 2026-02-11T06:18:34+03:00 — Действие: выполнены проверки NEWS → Результат: PASS/KNOWN
  - `PLAYWRIGHT_USE_EXISTING_SERVER=1 PLAYWRIGHT_PORT=5173 npm run test:e2e -- tests/e2e/news.spec.ts --project=chromium` → PASS (2 passed)
  - `npm run typecheck` → KNOWN FAIL вне scope NEWS:
    - `app/routes/dashboard/page.tsx(76,43): TS2322: Type 'string' is not assignable to type 'number'.`

## Step E — Git

- 2026-02-11T06:18:34+03:00 — `5281940` `fix(news): resolve signal center regressions and autoplay UX`
  - Изменено: `app/routes/dashboard/news/page.tsx`, `styles/news-signal-center.css`
  - Суть: de-dup controls, autoplay default (12s), compact density/typography, packet transition, brighter route-local red accents
- 2026-02-11T06:18:34+03:00 — `dd1755e` `test(news): align e2e smoke with autoplay and compact controls`
  - Изменено: `tests/e2e/news.spec.ts`
  - Суть: updated NEWS smoke for autoplay + responsive control strip behavior
