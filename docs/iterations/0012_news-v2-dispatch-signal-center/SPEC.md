<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_0012_NEWS_V2_DISPATCH_SIGNAL_CENTER_SPEC_MD
  title: "SPEC: NEWS v2 — Dispatch + Signal Center Preserved, Feed Reworked"
  status: DRAFT
  owner: CREATOR
  editable_by_agents: true
  scope: axiom_web_core_ui
  lang: ru
  last_updated: 2026-02-10
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/0012_news-v2-dispatch-signal-center/SPEC.md -->

# SPEC: NEWS v2 — Dispatch + Signal Center Preserved, Feed Reworked

## 0) Контекст

Текущая вкладка NEWS выглядит как сильная панель, но как лента чтения/сканирования неудобна: слишком много равнозначных блоков, лента уезжает вниз, мета-информация постоянно занимает место, быстрый просмотр 10–50 новостей сложнее, чем должен быть.

Канон: сохраняем и улучшаем:

- **NEWS DISPATCH** (левый блок)
- **SIGNAL CENTER** (центральный блок)

Остальное можно реворкать полностью ради UX.

---

## 1) Цели

### 1.1 Основные

1. Сделать NEWS удобной для сценариев:

   - быстрый скан ленты,
   - быстрый выбор новости,
   - удобное чтение выбранной новости,
   - возврат в ленту без потери контекста.

2. Сохранить DNA панели: Red Protocol, Signal Center как командный ридер, Dispatch как статус-центр.
3. Убрать мешанину через чёткую иерархию: верх = управление и чтение, низ = лента.

### 1.2 UX-результат

- Пользователь видит ленту быстрее (больше записей в зоне видимости).
- Выбранная запись читается в Signal Center без лишних блоков вокруг.
- Dispatch реально помогает (unread/new/пресеты), а не только декор.

---

## 2) Не цели (Non-Goals)

- Не меняем стилистику проекта (палитра/вайб сохраняются).
- Не переписываем data-pipeline и источники новостей (используем существующую модель, добавляя только UI-state).
- Не внедряем WebGL/сложные 3D эффекты.
- Не ломаем существующую навигацию/роуты (если не требуется).

---

## 3) Ограничения разработки

### 3.1 Работа с исходником UI (обязательно)

- Нельзя редактировать текущий живой исходник UI по пути:
  `\\wsl.localhost\Ubuntu-MIG\home\axiom\ENDEAVOR\AXIOM WEB CORE\ui`
- Работа ведётся только в локальном клоне/копии UI (внутри AXS workspace или отдельной рабочей директории), так чтобы CREATOR мог открывать AXS и UI как два раздельных проекта в Visual Studio Code.

---

## 4) Термины

- **Dispatch**: левый статус-центр NEWS DISPATCH.
- **Signal Center**: центральный ридер выбранной/последней/закреплённой новости.
- **Feed**: список новостей (сканируемый).
- **Pinned**: закреплённая запись (избранная).
- **Unread / New since last visit**: статусы, считающиеся на клиенте (UI-state).

---

## 5) Канонические блоки и их усиление

### 5.1 NEWS DISPATCH (сохраняем, усиливаем)

Роль: status panel + быстрые режимы + контроль ленты.

Добавить в Dispatch (минимум):

- `UNREAD` количество непрочитанных (UI-state)
- `NEW` новых с момента последнего посещения (local last_seen_at)
- `VISIBLE / TOTAL / PAGE` (как сейчас, но компактнее)
- Presets (1 клик): `All`, `Updates`, `Releases`, `Audit`, `Fixes`
- Actions:

  - `Mark all as read`
  - `Show pinned only` (toggle)
  - `Today` (быстрый фильтр по дате)

Поведение:

- Любой preset меняет feed и синхронизирует Signal Center (см. event flow).

### 5.2 SIGNAL CENTER (сохраняем, усиливаем)

Роль: главный ридер (selected/latest/pinned), не декоративный hero.

Новые обязательные механики:

1. Collapse / Expand

   - default: компактная высота (примерно 25–35% viewport)
   - expanded: режим чтения (до 60–70%)

2. Режимы отображения

   - `Selected` (если пользователь выбрал запись из feed)
   - `Pinned` (если закреплена и включён режим pinned)
   - `Latest` (по умолчанию, если ничего не выбрано)

3. Tabs внутри Signal Center

   - `Summary` (основной текст)
   - `Meta` (то, что сейчас справа отдельным блоком)
   - `Links` (быстрые ссылки, Open modal тоже сюда)

4. Навигация чтения

   - `Prev / Next` (по текущей сортировке и фильтрам)
   - `Pin/Unpin`
   - `Mark read/unread`

Важно: текущий правый Pack Meta блок переносим в таб `Meta` внутри Signal Center. Отдельный постоянный блок справа больше не нужен.

---

## 6) Новый Layout NEWS (что реворкаем вокруг)

### 6.1 Smart Header (верх)

Состав (в одной шапке):

- слева: Dispatch
- справа/по центру: Signal Center

Свойства:

- может быть sticky (опционально) или фиксированным по скроллу
- в collapsed-режиме занимает минимум вертикали
- в expanded-режиме превращается в ридер

### 6.2 Feed (низ страницы)

Feed становится основной скан-зоной.

Требования к feed:

- плотная читабельная карточка/строка (scan-first)
- заголовок + 1 строка summary + дата/тип + теги (не более 3, остальное `+N`)
- клик по записи:

  - сохраняет позицию в ленте
  - обновляет Signal Center на выбранную запись

### 6.3 Фильтры

Сводим фильтры к одной компактной строке, остальное в drawer.

Всегда видимо:

- Search
- Type preset (или Kind)
- Sort
- Per page

В drawer (Filters…):

- tags
- date ranges
- source
- language
- advanced flags

---

## 7) Event Flow (логика синхронизации)

### 7.1 Выбор новости

1. Пользователь кликает запись в feed
2. `selectedId` обновляется
3. Signal Center переходит в `Selected` и показывает выбранную запись
4. запись помечается как read по правилу (см. 8.3)

### 7.2 Prev/Next в Signal Center

- `Next` выбирает следующую запись в порядке текущей сортировки и фильтров
- `Prev` выбирает предыдущую
- обновляет `selectedId`
- скролл в feed не обязателен (опционально scroll into view кнопкой)

### 7.3 Presets в Dispatch

- применяют filter state
- обновляют feed
- Signal Center:

  - если `selectedId` больше не в наборе результатов, падает в `Latest` (или ближайший доступный)

### 7.4 Pinned mode

- если включён `Pinned only`:

  - feed показывает только pinned
  - Signal Center default = pinned latest (если selectedId пуст)

---

## 8) UI-State: read/unread/new/pinned

### 8.1 Хранилище

Минимально: `localStorage`.

Ключи:

- `news.last_seen_at`
- `news.read_ids` (set)
- `news.pinned_ids` (set)

Если есть аккаунт/профиль: namespace по userId.

### 8.2 New since last visit

- `newCount` = число записей с `date > last_seen_at`
- `last_seen_at` обновляется при:

  - входе на страницу NEWS
  - или при уходе (on blur/unmount)

Выбрать одно правило и зафиксировать в реализации.

### 8.3 Когда считать запись прочитанной

V1 правило:

- при клике (select) mark read
- при Prev/Next mark read

---

## 9) Компонентная структура (референс)

- `NewsPage`

  - `NewsWireTicker` (существующий)
  - `SmartHeader`

    - `NewsDispatchPanel`
    - `SignalCenter`

      - `SignalTabs` (Summary/Meta/Links)
      - `SignalActions` (Prev/Next, Pin, Read)

  - `NewsToolbar` (compact filters row)

    - `SearchInput`
    - `KindPreset`
    - `SortSelect`
    - `PerPageSelect`
    - `FiltersDrawerButton`

  - `NewsFeed`

    - `NewsItemRow/Card`
    - `Pagination` (или infinite позже)

---

## 10) Требования к доступности и управлению

- Keyboard:

  - `J/K` или `↑/↓` (опционально) переключение по ленте
  - `Enter` select
  - `Esc` collapse Signal Center (если expanded)

- `prefers-reduced-motion` учитывается в анимациях collapse/expand.
- ARIA:

  - feed как list, item как option (или button-row)
  - активная запись отмечена `aria-selected`

---

## 11) Производительность

- Feed должен быть лёгким: минимум тяжёлых теней/blur на каждом item.
- Виртуализация списка опционально, если количество > 200.
- Collapse/expand делать аккуратно (CSS transitions без layout thrash).

---

## 12) Визуальные правила

1. Signal Center в collapsed-режиме не должен съедать ленту.
2. Красный акцент:

   - primary = активное состояние/selection
   - secondary = outline

3. Feed items:

   - тип/бейдж маленький
   - заголовок главный
   - summary 1 строка (ellipsis)
   - теги максимум 3 +N

---

## 13) Тест-план

### 13.1 Unit

- read/unread store: add/remove, counts
- new since last visit: вычисление по last_seen_at

### 13.2 Integration

- select item -> Signal Center updates
- preset -> feed updates; selectedId валидируется
- pinned mode -> feed/signal перестраиваются

### 13.3 E2E (smoke)

1. Открыть NEWS
2. Нажать preset `Updates`
3. Кликнуть запись -> Signal Center показывает её
4. Next -> переключает на следующую
5. Pin -> запись закреплена, pinned count обновился
6. Включить pinned only -> feed фильтруется

---

## 14) Acceptance Criteria

1. NEWS DISPATCH и SIGNAL CENTER сохранены визуально и по роли.
2. Signal Center имеет collapse/expand и табы Summary/Meta/Links.
3. Правый постоянный meta-блок удалён (meta в табе).
4. Feed стал основной скан-зоной: больше видимых записей, проще выбор.
5. Presets в Dispatch работают и синхронизируются с feed.
6. Есть read/unread и new since last visit (минимально через localStorage).
7. Ничего не ломает существующий функционал (по смоукам).

---

## 15) План работ (Step A–E)

Step A — Prep:

- Зафиксировать state: filters, selectedId, pinnedIds, readIds, last_seen_at
- Сжать фильтры в компактный toolbar и drawer

Step B — Signal Center Upgrade:

- collapse/expand
- tabs (Summary/Meta/Links)
- actions (Prev/Next, Pin, Read)

Step C — Feed Rework:

- новые карточки/строки scan-first
- select синхронизирует Signal Center

Step D — Dispatch Upgrade:

- unread/new counts
- presets и actions

Step E — Tests + Polish:

- smoke tests
- perf check на 100–200 items
- финальная чистка визуальной иерархии

---

## 16) Материалы/референсы

```txt
Changelog patterns (structure & readability):
https://linear.app/changelog
https://vercel.com/changelog

Master-detail pattern rationale:
https://blogs.windows.com/windowsdeveloper/2017/05/01/master-master-detail-pattern/

Usability guidance:
https://www.nngroup.com/articles/design-guidance/

Reduced motion:
https://web.dev/articles/prefers-reduced-motion

Pointer events:
https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
```

---

## 17) Открытые вопросы

1. Feed: pagination или infinite scroll (V1 можно оставить pagination как сейчас).
2. Режим чтения: expanded по клику Open или auto-expand при select.

Рекомендация: select не авто-expand, но запоминаем прошлое состояние.
