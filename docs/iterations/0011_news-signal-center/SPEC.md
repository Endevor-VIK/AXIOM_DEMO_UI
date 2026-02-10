<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_0011_NEWS_SIGNAL_CENTER_SPEC_MD
  title: "SPEC · 0011_news-signal-center"
  status: ACTIVE
  mode: Doc
  goal: "SPEC"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-10
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/0011_news-signal-center/SPEC.md -->

# SPEC · 0011_news-signal-center

**Title:** NEWS Dispatch UI Refactor + Signal Center (RED PROTOCOL)
**Scope:** `apps/axiom-web-core-ui`
**Route:** `/dashboard/news` (или текущий роут NEWS)
**Work mode:** `main` + AgentOps logs

## 0) Reference assets (обязательные)

Положить в проект рядом со SPEC:

```
apps/axiom-web-core-ui/docs/iterations/0011_news-signal-center/
  SPEC.md
  REF_NEWS_SIGNAL_CENTER_v0.1.png      # твой референс (панель/пульт)
```

**Источник визуала:** `REF_NEWS_SIGNAL_CENTER_v0.1.png` — главный эталон компоновки/ритма/“пульта”.
**Сравнение:** `REF_NEWS_CURRENT_STATE.png` — фикс текущего состояния до редизайна.

---

## 1) Goals

1. Привести NEWS к компоновке “пульт”:

   * **LEFT PILLAR / NEWS DISPATCH** (телеметрия + кольцо Total)
   * **SIGNAL CENTER** (витрина последнего/featured пакета)
   * **FILTER BAR** (search/kind/sort/page + prev/next)
   * **NEWS GRID** (карточки data-slate, чипы тегов, open)
2. Сделать **визуальную иерархию** новостей:

   * `featured` (верхний “Last Packet”)
   * `normal` (основные карточки)
   * `minor` (менее важные / coming soon)
3. Сохранить текущую функциональность:

   * поиск по title/summary/tags
   * фильтр типа (release/update/…)
   * сортировка (newest/oldest)
   * пагинация
4. Обеспечить стабильность UI на viewport: **1920×1080, 1600×900, 1440×900** (как у вас в `ui:walk`).

---

## 2) Non-goals

* Не менять контент-пак, формат данных новостей и их источники (только UI/UX).
* Не “утяжелять” страницу огромными изображениями: референс = ориентир, но реализация должна быть преимущественно **CSS/SVG**.
* Не добавлять новый backend для NEWS (если уже есть — используем).

---

## 3) Layout blueprint (как должно выглядеть)

### 3.1 Desktop (>= 1280px)

**Row 1 (Hero band):**

* Слева: `NewsDispatchPillar` шириной **320–380px**
* Справа: `SignalCenterHero` занимает остальное, высота ~ **260–340px**

**Row 2 (Controls band):**

* `NewsFilterBar` на всю ширину контентной зоны (под Hero)

**Row 3 (Grid):**

* `NewsGrid` 2 колонки (на больших экранах), gap умеренный
* Карточки = “data-slate” панели с чипами тегов и кнопкой `OPEN`

### 3.2 Tablet (900–1279px)

* `SignalCenterHero` сверху на всю ширину
* `NewsDispatchPillar` превращается в **compact** (горизонтальная телеметрия) и уходит под hero
* Grid остаётся 2 колонки, но компактнее

### 3.3 Mobile (< 900px)

* `SignalCenterHero` → первый блок
* `Pillar` → компакт-виджет
* `FilterBar` → перенос строк/stacked
* `Grid` → 1 колонка

---

## 4) Components (что внедрить)

### 4.1 `NewsDispatchPillar`

**Назначение:** левый “операторский столб” как на референсе.

Состав:

* Header: `NEWS DISPATCH`
* Блок “Control Status”
* Кольцо `TOTAL NEWS` (цифра в центре, подпись)
* Телеметрия:

  * `VISIBLE :: X`
  * `TOTAL :: Y`
  * `PAGE :: a / b`
* Мини-поиск (опционально): `Search title, summary, tags`
* Нижняя панель быстрых переходов (как на референсе):

  * вместо “AUDIT / REVMAP” — **две кнопки-ссылки**:

    * `ROADMAP` → `/dashboard/roadmap` (если есть)
    * `CONTENT` или `AUDIT` (по текущей IA)
  * если этих роутов нет — оставить декоративно выключенными.

Состояния:

* `default`
* `loading` (скелетон/пульс)
* `empty` (total=0)

### 4.2 `SignalCenterHero`

**Назначение:** “экран последнего пакета” (featured news).

Показываем:

* `SIGNAL CENTER`
* `LAST PACKET / FRESH DISPATCH`
* Заголовок (title)
* Чипы типа: `RELEASE | UPDATE | AUDIT | ...`
* Дата/время справа
* Summary (1–2 строки, truncate)
* Кнопка `OPEN`

Визуальные слои (без тяжёлых картинок):

* scanlines overlay (CSS)
* subtle noise overlay (CSS)
* редкий glitch только на hover/фокус
* обязательно `prefers-reduced-motion`

Если featured нет — берём самый новый item.

### 4.3 `NewsFilterBar`

Минимизируем, как в референсе:

* `Search` (input)
* `Kind` (dropdown: all / update / release / audit / …)
* `Sort` (newest/oldest)
* `Page size` (опционально)
* Кнопки `Prev / Next`
* Индикатор: `PAGE :: a/b`, `TOTAL :: N` (часть телеметрии можно оставить в Pillar, но небольшая дубликация допустима)

### 4.4 `NewsCard` (“Data-Slate”)

Варианты:

* `featured` (используется только в hero, в grid не надо)
* `normal`
* `minor` (например, пометка “COMING SOON” как на текущем UI)

Состав карточки:

* Title (1–2 строки)
* Date (top-right)
* Tags chips (1 строка, overflow → fade/scroll)
* Summary (truncate, 2–3 строки)
* `OPEN` кнопка

Фишка “шины”:

* тонкая вертикальная подсветка слева (тип новости задаёт стиль: update/release/audit — оттенки красного/серого).

---

## 5) Data contract (ничего не ломаем)

Агент **не меняет** источник данных новостей, только потребление.

Нужно обеспечить на уровне UI:

* `visibleCount` (после фильтра/поиска)
* `totalCount` (общий)
* `page` / `pageCount`
* `items[]` текущей страницы
* `featuredItem` (items[0] после сортировки newest, либо явно)

Если данных мало/нет:

* Hero и grid переходят в `empty state` (текст + подсказка).

---

## 6) Styling (RED PROTOCOL)

Создать отдельный стиль-слой именно для этой вкладки, чтобы не ломать другие:

* `news-signal-center.css` (или рядом с текущим `news` css)
* подключить его только на route NEWS

Стиль-правила:

* фон: графит/черный, мягкий градиент
* рамки: тонкие, красный контур + лёгкий glow
* типографика: крупный заголовок + мелкая телеметрия моношрифтом
* шум/scanlines — **subtle**, не “сжигать” читаемость
* hover эффекты: только на интерактивных элементах (кнопки/chips/cards)
* `prefers-reduced-motion`: отключить glitch/scanlines animation (оставить статичный слой)

---

## 7) Integration steps (A–E)

### Step A — Inventory

* Найти текущий route NEWS и текущие компоненты:

  * где рендерится hero
  * где filter bar
  * где карточки
* Зафиксировать текущий data flow (откуда берутся items/filters/pagination).

### Step B — Skeleton layout

* Внедрить новую компоновку (Pillar + SignalCenter + FilterBar + Grid)
* Подключить базовые стили и проверить, что ничего не “плывёт” на 1920/1600/1440.

### Step C — Live telemetry + featured hero

* Подключить real counts: visible/total/page/pageCount
* Сделать `featuredItem` и показать его в SignalCenterHero

### Step D — Cards refactor

* Перерисовать карточки под “data-slate”
* Реализовать `minor` (coming soon) как отдельный стиль

### Step E — QA + ui:walk snapshots

* Прогнать `ui:walk` на 1920/1600/1440 (debug=1)
* Проверить:

  * нет overflow по ширине/высоте
  * кнопки Prev/Next/OPEN кликабельны
  * читабельность текста на всех DPI
* (Если есть e2e) добавить проверку габаритов ключевых блоков:

  * Pillar width в допустимых пределах
  * Hero не превышает max-height
  * Grid не уезжает

---

## 8) Acceptance criteria (готовность)

1. UI визуально соответствует референсу по компоновке:

   * LEFT PILLAR присутствует
   * SIGNAL CENTER hero присутствует
   * FilterBar компактный, как “шина”
   * Карточки выглядят “data-slate”
2. Функциональность NEWS сохранена:

   * поиск/фильтр/сорт/пагинация работают
3. Стабильность:

   * корректно на 1920/1600/1440 (без “раздувания” и без клиппинга)
4. Доступность:

   * фокус-стили на кнопках/инпутах
   * reduced-motion поддержан

---

## 9) AgentOps (обязательное, main)

Создать новый лог:

`apps/axiom-web-core-ui/ops/agent_ops/logs/NNNN_news-signal-center.md`

Обновить индекс:

`apps/axiom-web-core-ui/ops/agent_ops/logs/00_LOG_INDEX.md`

Вести шаги A–E внутри лога.

---

## 10) Notes / Future hooks

* В перспективе можно добавить “операторскую” микротелеметрию:

  * last update timestamp
  * статус контент-пакета
* Можно добавить “featured rotation” (не сейчас): несколько последних пакетов в hero, но beta достаточно одного.

---
