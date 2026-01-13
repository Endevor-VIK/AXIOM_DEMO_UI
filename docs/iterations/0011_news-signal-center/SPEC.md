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
**Version:** v0.3 (agent-rails extended)  
**Deployment:** PLANNED  
**Theme:** RED PROTOCOL / black-graphite / toxic red + interference  
**Reference:** `REF_NEWS_SIGNAL_CENTER_v0.1.png`

---

## 0) Outcome

Агент должен внедрить новый UI-каркас страницы NEWS:

1) **LEFT PILLAR (News Dispatch)** — бывший hero-блок перенесён влево, сжат по ширине, оформлен как вертикальный модуль управления/телеметрии.  
2) **SIGNAL CENTER** — центральный “киберпанк-центр” (экраны/провода/сеть) с **мерцающим экраном последней новости** (title + type + date + short summary + Open).  
3) **NEWS GRID** — переработанные карточки (“Data-Slate”) + лёгкая визуальная иерархия.  
4) **FILTER BAR (regress)** — оставить только самое необходимое (Search, Kind, Sort, Prev/Next), остальное перенести/убрать.

---

## 0.1 Reference Cues (из рефа)

- Левый столбец — тяжёлая панель с заголовком `NEWS DISPATCH`, кольцевым счётчиком и двумя блоками телеметрии.
- Центральный блок — титул `SIGNAL CENTER`, внутри заголовок `LAST PACKET / FRESH DISPATCH`, крупная строка title, row чипов, дата справа, строка summary и кнопка `OPEN` справа.
- Фильтр-бар — единая полоса с `Search`, `Kind`, `Sort`, справа `Prev / Next`; компактно и технологично.
- Карточки — 2‑колоночный grid; слева тонкий type-rail, справа контент с summary и `OPEN`/`COMING SOON`.
- Визуально: индустриальные рамки, скан-линии, красные индикаторы, мягкий glow и шумовые текстуры.

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
- Один источник истины для фильтров (не плодить отдельные состояния).

---

## 2.2 Optional (если дешево и без риска)

- Быстрые ссылки в LeftPillar на `/dashboard/audit` и `/dashboard/roadmap` (без новой логики).
- Декоративные микро-индикаторы (без JS).

---

## 3) Layout Contract (обязательная структура)

### 3.1 Desktop
- Grid: **[LEFT_PILLAR | SIGNAL_CENTER]** сверху
- Ниже: **FILTER BAR** (на всю ширину)
- Ниже: **NEWS GRID**

### 3.2 Responsive
- На узких ширинах:
  - SIGNAL_CENTER → сверху
  - LEFT_PILLAR → ниже (в виде мини-модуля)
  - затем FILTER BAR + GRID

### 3.3 Grid areas (предпочтительно)

```
.ax-news-layout {
  display: grid;
  grid-template-areas:
    "pillar signal"
    "filters filters"
    "grid grid";
  grid-template-columns: minmax(260px, 360px) minmax(520px, 1fr);
  gap: clamp(16px, 2vw, 28px);
}
@media (max-width: 1024px) {
  .ax-news-layout { grid-template-columns: minmax(240px, 320px) minmax(0, 1fr); }
}
@media (max-width: 900px) {
  .ax-news-layout {
    grid-template-areas:
      "signal"
      "pillar"
      "filters"
      "grid";
    grid-template-columns: 1fr;
  }
}
```

### 3.4 Размеры и пропорции
- LEFT_PILLAR: `minmax(260px, 360px)`; визуально плотный столбец
- SIGNAL_CENTER: `minmax(520px, 1fr)`; главный фокус
- Signal screen min-height: 220–280px
- Filter bar height: 44–52px (контролы в одну строку)

---

## 4) Modules / Components (expanded)

### 4.1 LeftPillar (NewsDispatchPillar)
Содержит:
- Заголовок `NEWS DISPATCH`
- Кольцо/счётчик `TOTAL NEWS`
- Телеметрия: `VISIBLE`, `TOTAL`, `PAGE`
- (опционально) mini-status / mode label

Рекомендовано:
- Ринг через `CounterWreath` (из `components/counters/CounterWreath`) или `RouteWreath`.
- `TOTAL` = items.length, `VISIBLE` = filtered.length, `PAGE` = page / totalPages.
- Busy state: `LOADING...` вместо телеметрии.
- Если нужен поиск внутри pillar — **тот же state** (`q`), не отдельный.

### 4.2 SignalCenter (LastPacketScreen)
Содержит:
- Заголовок `SIGNAL CENTER`
- Подзаголовок `LAST PACKET / FRESH DISPATCH`
- Превью последней новости (title + summary)
- Тип (chip): UPDATE/RELEASE/AUDIT/...
- Date/Time справа
- CTA: `OPEN`
- Visual layers: scanlines/noise/glitch (RED PROTOCOL)

Рекомендовано:
- Latest берётся из полного списка (не зависит от фильтров).
- Если `link` нет — CTA disabled + метка `NO LINK`.
- Empty state: `NO PACKETS` + приглушённый noise.

### 4.2.1 SignalCenter Screen Layout
Пример структуры:

```
<section class="ax-news-signal" aria-label="Signal center">
  <header class="ax-news-signal__head">
    <h2 class="ax-blade-head">SIGNAL CENTER</h2>
  </header>
  <div class="ax-news-signal__screen" data-anim="scanlines">
    <div class="ax-news-signal__label">LAST PACKET / FRESH DISPATCH</div>
    <h3 class="ax-news-signal__title">{latest.title}</h3>
    <div class="ax-news-signal__meta">
      <span class="ax-chip" data-variant="info">{kind}</span>
      <span class="ax-news-signal__date">{date}</span>
    </div>
    <p class="ax-news-signal__summary">{summary}</p>
    <div class="ax-news-signal__actions">
      <a class="ax-btn ghost" ...>OPEN</a>
    </div>
  </div>
</section>
```

### 4.2.2 SignalCenter Visual Layers
- Внешняя рамка + внутренние инсет‑линии.
- Scanlines: `repeating-linear-gradient` с низкой прозрачностью.
- Noise: `linear-gradient` + `opacity` 0.08–0.12 (без мешания тексту).
- Glow: `box-shadow` + `drop-shadow`, тонко.

### 4.3 FilterBar (minimal)
Оставить:
- Search (title/summary/tags)
- Kind (All / Update / Release / Audit / …)
- Sort (Newest / Oldest)
- Prev / Next (компактно)

Убрать/перенести:
- TOTAL/VISIBLE → в LeftPillar
- per-page → фиксировать дефолтом

Рекомендовано:
- Page size фиксировать (по дефолту 8)
- Reset page → 1 при изменении q/kind/sort
- Визуально — единый “console bar” с иконкой поиска и стрелками в select

### 4.4 NewsCard (DataSlate)
Карточка:
- Левый type-rail (2–4px, цвет по kind)
- Title + date
- Summary (truncate 2–3 строки)
- Tags (chips)
- Button `OPEN`
- Variants: `featured | normal | minor`

Рекомендовано:
- `featured` = самый свежий элемент (page=1, sort=Newest)
- `minor` = без summary или link
- `data-variant` и `data-kind` для CSS

### 4.5 Empty / Busy States
- Pillar: `LOADING...` или `NO DATA`
- SignalCenter: `NO PACKETS` + disabled CTA
- Grid: карточка-заглушка `No items found` + подсказка

---

## 5) Visual Rules (RED PROTOCOL)

### 5.1 Palette
- base: black / graphite / gray graphite
- accent: toxic red (несколько оттенков)
- white: только для ключевых цифр/заголовков

### 5.2 Frame & Texture
- Индустриальные рамки, “слоёные” бордеры (внешний + внутренний)
- Лёгкий “industrial” шум (не в тексте)
- Сетевые линии/узлы: SVG overlay (тонко, дозировано)

### 5.3 Typography
- Заголовки: `ax-blade-head` или аналог (uppercase, tracking +)
- Метки: uppercase, `font-size: 11–12px`, `letter-spacing: 0.12em`
- Summary: нормальный регистр, `opacity: 0.85–0.9`

### 5.4 UI Copy (строки)
- `NEWS DISPATCH`
- `SIGNAL CENTER`
- `LAST PACKET / FRESH DISPATCH`
- `OPEN`
- `NO PACKETS`
- `COMING SOON`

### 5.5 Interaction States
- Hover: лёгкий red glow и усиление rail
- Focus-visible: чёткая рамка (неон-акцент)
- Disabled: `opacity` 0.4–0.6, без glow

---

## 6) Motion / Effects (must)

- Scanlines + noise (subtle, 6–10s loop).
- Glitch: только на hover или редкий “pulse”.
- Respect `prefers-reduced-motion`:
  - анимации отключаются/упрощаются
  - интерфейс остаётся красивым и читаемым

---

## 7) Data & State Contract

### 7.1 Source
- `vfs.readNewsManifest()` → массив `NewsItem` (уже отсортирован по дате desc).

### 7.2 Sorting / Filtering
- Pipeline:
  1) `items` (raw)
  2) `latestItem = items[0]` (для SignalCenter)
  3) `filtered = items.filter(matchesQuery && kind)`
  4) `sorted = filtered` (sort by date asc/desc)
  5) `pageItems = sorted.slice(...)`
- Sort влияет только на GRID.

### 7.3 Pagination
- `PAGE_SIZE = 8`
- `totalPages = ceil(sorted.length / PAGE_SIZE)`, минимум 1
- `page` clamp при Prev/Next

### 7.4 Telemetry
- `TOTAL` = items.length
- `VISIBLE` = filtered.length
- `PAGE` = `${page} / ${totalPages}`

### 7.5 Kind mapping (chips)
- `release` → `good`
- `update` → `info`
- `heads-up` → `warn`
- `roadmap` → `info`

### 7.6 Links
- Если `link` отсутствует: CTA disabled + label `COMING SOON`
- Поведение ссылки — как в текущем `NewsCard` (target `_blank` оставляем)

---

## 8) Implementation Plan (agent steps A–E)

A) Развернуть ветку, активировать LOG через `SPEC_LOG_LINK.md`  
B) Обновить `app/routes/dashboard/news/page.tsx`: layout grid + LeftPillar + SignalCenter  
C) Переработать FilterBar (regress) + NewsCard (DataSlate variants)  
D) Обновить стили в `styles/red-protocol-overrides.css` (news-signal слой)  
E) QA + acceptance + обновить CHANGELOG.md + закрыть Step E в логе

---

## 9) QA / Checks (minimum)

- Desktop / Mobile layout OK (1440, 1280, 1024, 768)
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

### 12.1 File map
- Entry: `app/routes/dashboard/news/page.tsx`
- Компоненты:
  - `components/NewsCard.tsx` → DataSlate (или новый `components/news/DataSlate.tsx`)
  - (опционально) `components/news/NewsDispatchPillar.tsx`
  - (опционально) `components/news/SignalCenter.tsx`
- Стили: `styles/red-protocol-overrides.css` (классы `ax-news-*`)
- Данные: `lib/vfs/index.ts` не менять; берём `readNewsManifest()`
- Не трогать `public/data/news/*` и маршрутизацию

### 12.2 JSX skeleton (рельсы)

```
<section className="ax-container ax-section ax-news-page" aria-busy={busy}>
  <div className="ax-news-layout">
    <aside className="ax-card ax-news-pillar" aria-label="News dispatch" />
    <section className="ax-card ax-news-signal" aria-label="Signal center" />
    <div className="ax-card ax-news-filter" aria-label="Filters" />
    <div className="ax-news-grid" aria-live="polite" />
  </div>
</section>
```

### 12.3 CSS классы (минимум)
- `ax-news-page`, `ax-news-layout`
- `ax-news-pillar`, `ax-news-pillar__telemetry`, `ax-news-pillar__search`
- `ax-news-signal`, `ax-news-signal__screen`, `ax-news-signal__title`, `ax-news-signal__summary`
- `ax-news-filter`, `ax-news-filter__row`, `ax-news-filter__pagination`
- `ax-news-card`, `ax-news-card__rail`, `ax-news-card__head`, `ax-news-card__summary`

### 12.4 Data pipeline (рекомендация)
- `latestItem = items[0]`
- `filtered = items.filter(...)`
- `sorted = sortByDate(filtered, sortDir)`
- `pageItems = slice(sorted, page, PAGE_SIZE)`
- `featuredId = sortDir === 'newest' && page === 1 ? pageItems[0]?.id : null`

---

<!-- AXIOM LINKED OBJECTS -->

## 🔗 LINKED OBJECTS

- `DOCS`
  - [docs/iterations/0011_news-signal-center/SPEC.md](./SPEC.md) —
  - [docs/iterations/0011_news-signal-center/REF_NEWS_SIGNAL_CENTER_v0.1.png](./REF_NEWS_SIGNAL_CENTER_v0.1.png) —


<!-- /AXIOM LINKED OBJECTS -->
