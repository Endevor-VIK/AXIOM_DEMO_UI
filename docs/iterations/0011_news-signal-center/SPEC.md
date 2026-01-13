<!-- docs/iterations/0011_news-signal-center/SPEC.md -->
<!--
AXS_HEADER_META:
  id: AXS.ITER.0011.SPEC
  title: "SPEC — 0011_news-signal-center (News Dispatch UI Refactor + Signal Center)"
  status: ACTIVE
  deployment: PLANNED
  mode: Iteration Spec
  goal: "Пересобрать UI страницы NEWS: левый Dispatch Pillar + центральный Signal Center (киберпанк-окружение) + обновлённые карточки + регресс фильтров до минимума"
  lang: ru
  last_updated: 2026-01-13
  editable_by_agents: true
  spec_origin: "UI refactor initiative + RED PROTOCOL visual upgrade"
  change_policy: "Крупные изменения фиксировать в AgentOps logs и CHANGELOG.md; держать обратную совместимость данных новостей"
  links:
    log_link: ./SPEC_LOG_LINK.md
    ui_ref_image: ./REF_NEWS_SIGNAL_CENTER_v0.1.png
-->

# SPEC — 0011_news-signal-center (News Dispatch UI Refactor + Signal Center)

**Status:** ACTIVE  
**Version:** v0.2 (agent-ready + rails)  
**Deployment:** PLANNED  
**Theme:** RED PROTOCOL / black-graphite / toxic red + interference

---

## 0) Outcome

Агент должен внедрить новый UI-каркас страницы NEWS:

1) **LEFT PILLAR (News Dispatch)** — бывший hero-блок перенесён влево, сжат по ширине, оформлен как вертикальный модуль управления/телеметрии.  
2) **SIGNAL CENTER** — центральный “киберпанк-центр” (экраны/провода/сеть) с **мерцающим экраном последней новости** (title + type + date + short summary + Open).  
3) **NEWS GRID** — переработанные карточки (“Data-Slate”) + лёгкая визуальная иерархия.  
4) **FILTER BAR (regress)** — оставить только самое необходимое (Search, Kind, Sort, Prev/Next), остальное перенести/убрать.

---

## 1) Зачем это нужно AXS

- Увести NEWS из “списка карточек” в **операторский пульт**.
- Поднять визуальный стандарт панели до “AXIOM / cyberpunk console”.
- Сделать UI быстрее: меньше контролов, меньше шума, больше смысла.

---

## 2) Non-goals (не делаем в 0011)

- Не меняем API/формат данных новостей (только UI/UX слой).
- Не строим сложный full-text поиск.
- Не делаем тяжёлый canvas/3D (только CSS/SVG overlays).
- Не делаем новые страницы — только NEWS view + компоненты.

---

## 2.1 Invariants / Guardrails

- Источник данных — только `vfs.readNewsManifest()`; схема `NewsItem` без изменений.
- Без новых зависимостей; эффекты — CSS/SVG, без canvas/3D.
- Не ломать общие компоненты (`components/NewsCard`, `components/NewsFeed`, тикеры).
- Стили изолировать: новые классы с префиксом `ax-news-` и/или scope внутри страницы.

---

## 3) Layout Contract (обязательная структура)

### 3.1 Desktop
- Grid: **[LEFT_PILLAR | SIGNAL_CENTER]** сверху
- Ниже: **FILTER BAR**
- Ниже: **NEWS GRID**

### 3.2 Responsive
- На узких ширинах:
  - SIGNAL_CENTER → сверху
  - LEFT_PILLAR → ниже (в виде мини-модуля)
  - затем FILTER BAR + GRID

### 3.3 Размеры (desktop ориентир)
- LEFT_PILLAR: `minmax(260px, 360px)`; фикс по контенту
- SIGNAL_CENTER: `minmax(520px, 1fr)`; визуально доминирует
- Gap: 20–28px; top row align-start

---

## 4) Modules / Components (каркас)

### 4.1 LeftPillar (NewsDispatchPillar)
Содержит:
- Заголовок `NEWS DISPATCH`
- Кольцо/счётчик `TOTAL NEWS`
- Телеметрия: `VISIBLE`, `TOTAL`, `PAGE`
- (опционально) mini-status / mode label
Рекомендовано:
- `TOTAL` = items.length, `VISIBLE` = filtered.length, `PAGE` = page / totalPages
- Busy state: `LOADING...` вместо телеметрии

### 4.2 SignalCenter (LastPacketScreen)
Содержит:
- CRT/terminal экран “LAST PACKET / FRESH DISPATCH”
- Превью последней новости (сжатое)
- Тип (chip): UPDATE/RELEASE/AUDIT/...
- Date/Time
- CTA: `OPEN`
- Visual layers: scanlines/noise/glitch (RED PROTOCOL)
Рекомендовано:
- Latest берётся из полного списка (не зависит от фильтров)
- Если `link` нет — CTA disabled + метка `NO LINK`
- Empty state: `NO PACKETS` + приглушённый noise

### 4.3 FilterBar (minimal)
Оставить:
- Search (title/summary/tags)
- Kind (All / Update / Release / Audit / …)
- Sort (Newest / Oldest)
- Prev / Next (компактно)

Убрать/перенести:
- TOTAL/VISIBLE → в LeftPillar
- per-page → в скрытые настройки или фиксировать дефолтом
Рекомендовано:
- Page size фиксировать (по дефолту 8)
- Reset page → 1 при изменении q/kind/sort

### 4.4 NewsCard (DataSlate)
Карточка:
- Левый type-rail (тонкая шина по типу)
- Title + date
- Summary (truncate)
- Tags (chips)
- Button `OPEN`
- Variants: `featured | normal | minor` (лёгкая иерархия)
Рекомендовано:
- Type-rail/Chip по kind (update/release/heads-up/roadmap)
- `minor` — при отсутствии summary или link

### 4.5 Variants (rules)
- `featured`: самый свежий элемент общего списка (page=1, sort=Newest)
- `normal`: все остальные
- `minor`: без summary или link

---

## 5) Visual Rules (RED PROTOCOL)

### 5.1 Palette
- base: black / graphite / gray graphite
- accent: toxic red (несколько оттенков)
- white: только для ключевых цифр/заголовков

### 5.2 Layers
- Мягкие рамки + тонкий glow
- Лёгкий “industrial” шум (не в тексте)
- Сетевые линии/узлы: SVG overlay (тонко, дозировано)

---

## 6) Motion / Effects (must)

- Scanlines + noise (subtle)
- Glitch: только на hover или редкий “pulse”
- Respect `prefers-reduced-motion`:
  - анимации отключаются/упрощаются
  - интерфейс остаётся красивым и читаемым

---

## 7) Data Contract

**Latest News** для SignalCenter берётся из существующего источника данных:
- правило: “самая свежая по дате” (Newest)
- fallback: если пусто → “NO PACKETS” state (стилизованно)
Дополнительно:
- Источник: `public/data/news/manifest.json` через `vfs.readNewsManifest()`
- `vfs` уже сортирует по `date desc`; Sort влияет только на GRID
- Формат даты отображать как есть (YYYY-MM-DD)

---

## 8) Implementation Plan (agent steps A–E)

A) Развернуть ветку, активировать LOG через `SPEC_LOG_LINK.md`  
B) Обновить `app/routes/dashboard/news/page.tsx`: layout grid + LeftPillar  
C) Добавить SignalCenter (экран + overlays, latest item)  
D) Переработать FilterBar (regress) + NewsCard (DataSlate variants) + стили в `styles/red-protocol-overrides.css`  
E) QA + acceptance + обновить CHANGELOG.md + закрыть Step E в логе

---

## 9) QA / Checks (minimum)

- Desktop / Mobile layout OK
- Контраст/читабельность OK
- Reduced-motion OK
- Hover/focus states OK
- Последняя новость корректно подставляется в SignalCenter
- SignalCenter не зависит от фильтров GRID
- Ничего не ломает существующую навигацию / Open

---

## 10) Acceptance Criteria (DoD)

- [ ] LeftPillar реализован и заменяет текущий hero-блок
- [ ] SignalCenter отображает latest news и визуально доминирует
- [ ] Карточки новостей обновлены (DataSlate + variants)
- [ ] FilterBar упрощён до минимума
- [ ] Page size фиксирован, Sort работает
- [ ] RED PROTOCOL эффекты есть, но не мешают чтению
- [ ] prefers-reduced-motion поддержан
- [ ] CHANGELOG.md обновлён, AgentOps log заполнен

---

## 11) Roadmap (post v0.1)

v0.2:
- тонкая анимация “пульса сети”
- featured-slot логика (ручная/авто)
- compact settings (per-page) в popover

v0.3:
- режим “operator view” (больше телеметрии, меньше текста)
- связка с registry/graph (если потребуется)

---

## 12) Build Agent Rails (file map + guardrails)

- Entry: `app/routes/dashboard/news/page.tsx` (layout + state + фильтры)
- Компоненты:
  - `components/NewsCard.tsx` → DataSlate (или новый `components/news/DataSlate.tsx`)
  - (опционально) `components/news/NewsDispatchPillar.tsx`, `components/news/SignalCenter.tsx`
- Стили: `styles/red-protocol-overrides.css` (новые классы `ax-news-*`)
- Данные: `lib/vfs/index.ts` не менять; берём `readNewsManifest()`
- Не трогать `public/data/news/*` и маршрутизацию

---

<!-- AXIOM LINKED OBJECTS -->

## 🔗 LINKED OBJECTS

- `DOCS`
  - [docs/iterations/0011_news-signal-center/SPEC.md](./SPEC.md) —
  - [docs/iterations/0011_news-signal-center/REF_NEWS_SIGNAL_CENTER_v0.1.png](./REF_NEWS_SIGNAL_CENTER_v0.1.png) —


<!-- /AXIOM LINKED OBJECTS -->
