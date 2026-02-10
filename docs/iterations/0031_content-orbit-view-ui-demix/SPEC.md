<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_0031_CONTENT_ORBIT_VIEW_UI_DEMIX_SPEC_MD
  title: "SPEC · 0031_content-orbit-view-ui-demix"
  status: DRAFT
  mode: Doc
  goal: "SPEC"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-10
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/0031_content-orbit-view-ui-demix/SPEC.md -->

# SPEC · 0031_content-orbit-view-ui-demix

**Title:** CONTENT LIBRARY — Orbit View + UI De-Mix (Hierarchy & Modes)  
**Scope:** `apps/axiom-web-core-ui`  
**Route:** `/dashboard/content/*`  
**Work mode:** `main` + AgentOps logs

---

## 0) Контекст и референс

На странице Content Library сейчас одновременно “главные” элементы конкурируют между собой: большой hero-блок, крупная полоса категорий, мощная полоса фильтров и тройная рабочая зона (list → preview → details). Итог: стиль сильный, но восприятие “всё сразу”.

Нужно:

1. **Улучшить информационную иерархию** (режимы/контекст).
2. Добавить **Orbit View** — вращающийся селектор карточек (вдохновение: элемент “Cards UI and animation” со страницы Awwwards и сайт IT EMPIRE).

---

## 1) Цели

### 1.1 Основные цели

- **Развести “режимы” страницы**, чтобы убралась мешанина:
  - `Browse` (обзор/серфинг/быстрый поиск)
  - `Inspect` (глубокий просмотр: список → превью → детали)
- Добавить **Orbit View** как третий режим отображения контента (рядом с Cards/List), ориентированный прежде всего на **персонажей**, но работающий и для других коллекций.
- Orbit должен:
  - синхрониться с текущими фильтрами/категориями/поиском
  - по select обновлять правую панель `Details`
  - поддерживать drag / wheel / keyboard
  - иметь graceful fallback при `prefers-reduced-motion` и на слабых устройствах.

### 1.2 UX-цель

- Сделать Orbit “вау-витриной”, но **не ломать** рабочий сценарий менеджмента контента.

---

## 2) Не цели (Non-Goals)

- Не переписываем всю страницу “с нуля”.
- Не переводим UI на WebGL/Three.js как обязательную зависимость (можно рассмотреть позже).
- Не меняем модель данных контента (берём существующую).
- Не изменяем контентный pipeline/экспорт (Orbit потребляет то же, что Cards/List).

---

## 3) Ограничения и допущения

### 3.1 ⚠️ НЕПОЛНЫЙ КОНТЕКСТ

- структура файлов и названия компонентов — **референсные**
- агент должен **адаптировать** к текущей архитектуре UI

---

## 4) Термины

- **LayoutMode**: `browse | inspect`
- **ViewMode**: `cards | list | orbit`
- **Orbit**: 3D-селектор карточек (CSS 3D transforms), вращение вокруг оси Y, снаппинг на ближайший элемент.
- **Reduced Motion**: режим, когда анимации уменьшаются/отключаются согласно настройке системы.

---

## 5) Требования к UI/UX

### 5.1 LayoutMode: Browse

**Назначение:** быстро искать/смотреть контент, минимально отвлекаться.

**Состав:**

- Compact Toolbar (поиск + теги + быстрые фильтры)
- Категории (tabs)
- Контентная зона:
  - `Cards` или `List` или `Orbit` (полноширинно)
- Детальная панель справа **скрыта** или открывается как drawer (опционально).

### 5.2 LayoutMode: Inspect

**Назначение:** работа “как панель управления”: список → превью → детали.

**Состав:**

- Left: Results List (фильтрованный список)
- Center: Preview stage:
  - `cards` = grid preview (или single preview)
  - `orbit` = orbit stage (основной сценарий)
- Right: Details (табами: Summary / Meta / Source / Links)

### 5.3 Переключатели

- Переключатель LayoutMode: `Browse | Inspect`
- Переключатель ViewMode: `Cards | List | Orbit`
- Рекомендуемое поведение:
  - Orbit доступен в обоих LayoutMode, но **в Inspect** он наиболее логичен (замена center stage).

### 5.4 Интеракции Orbit

**Мышь/тач:**

- drag (pointerdown → pointermove → pointerup) вращает ленту
- wheel — плавно вращает (с демпфированием)
- отпускание — **snap** на ближайшую карточку
- click по карточке — select (и обновление Details)

**Клавиатура (A11y):**

- `←/→` — шаг по карточкам
- `Enter` — select
- `Esc` — выход из Orbit в Cards (или сворачивание Orbit-панели)

**Фокус/hover:**

- hover не должен вызывать резкие “рывки” вращения
- hover только подсвечивает (контур/контраст)

### 5.5 Reduced Motion / Low Perf

- Если `prefers-reduced-motion: reduce`:
  - отключаем инерцию и бесконечные циклы
  - заменяем Orbit на:
    - либо 2D “carousel strip”
    - либо обычный Cards/List с сообщением “Orbit disabled by Reduced Motion”
- На мобильных:
  - Orbit либо упрощается, либо превращается в горизонтальную карусель.

---

## 6) Технические требования

### 6.1 Реализация Orbit (V1): CSS 3D + rAF

- Используем:
  - `transform-style: preserve-3d`
  - `perspective` / `perspective()`
  - `will-change: transform` (точечно, не на весь DOM)
- Pointer Events для drag:
  - `pointerdown / pointermove / pointerup`

### 6.2 Ограничения на размер данных

- Orbit V1 должен ограничивать число карточек (например `max=24`):
  - если результатов больше — Orbit показывает top N + подсказка “use search/filters”

### 6.3 State & Data Flow

- Orbit использует общий источник данных `filteredItems`.
- Orbit не должен читать `canon/` напрямую.

### 6.4 Feature flag

- `FEATURE_ORBIT_VIEW=true` (env или config)
- По умолчанию:
  - флаг OFF в проде
  - флаг ON в dev

---

## 7) Структура компонентов (референс)

- `ContentLibraryPage`
  - `Toolbar`
  - `CategoryTabs`
  - `LayoutModeToggle` (`browse/inspect`)
  - `ViewModeToggle` (`cards/list/orbit`)
  - `ContentStage`
    - `CardsView`
    - `ListView`
    - `OrbitView` (new)
  - `DetailsPanel` (в Inspect всегда, в Browse опционально)

### 7.1 OrbitView API (предложение)

- props:
  - `items: ContentItem[]`
  - `activeId: string | null`
  - `onActiveChange(id)`
  - `onSelect(id)` (явный select)
  - `reducedMotion: boolean`
  - `maxItems?: number`

---

## 8) Правки иерархии страницы (De-Mix)

### 8.1 Toolbar: привести к 1–2 компактным линиям

Требование:

- не более 2 рядов controls
- красный акцент только на primary state

### 8.2 “Hero” блок

- В Browse можно оставить компактный header + счётчик
- В Inspect hero должен быть **минимальным** (заголовок + count)

### 8.3 Details Panel

- Табирование обязательно:
  - Summary
  - Meta
  - Source
  - Links

---

## 9) Производительность

- Orbit V1 держит стабильный FPS на средних устройствах при `N<=24`
- Никаких layout thrash: вращение только через `transform`
- Минимизировать re-render: rAF управляет трансформами (через refs), React state — только `activeIndex/activeId`

---

## 10) Доступность (A11y)

- Orbit управляется клавиатурой
- Фокус-индикаторы видимы
- `prefers-reduced-motion` поддержан
- Screen reader:
  - у активной карточки `aria-selected="true"`
  - список карточек — `role="listbox"`, элементы — `role="option"`

---

## 11) Тест-план

### 11.1 Unit

- math:
  - angle normalization
  - snap to nearest
  - clamp maxItems

### 11.2 Integration

- filters → Orbit обновляет items
- select в Orbit → DetailsPanel обновляется
- LayoutMode переключение не ломает state (activeId сохраняется)

### 11.3 E2E (минимально)

- открыть Content Library
- включить Orbit
- rotate drag
- select item
- проверка, что details изменились
- включить reduced-motion → orbit fallback

---

## 12) Критерии приёмки (Acceptance Criteria)

1. На странице доступен переключатель `Browse | Inspect`.
2. Доступен переключатель `Cards | List | Orbit` (Orbit за фичефлагом).
3. Orbit:
   - вращается drag/wheel
   - снапится на ближайший элемент
   - select обновляет DetailsPanel
4. Orbit уважает `prefers-reduced-motion` (fallback).
5. UI стал “чище”:
   - controls <= 2 рядов
   - в Inspect hero не мешает работе
6. Тесты (smoke) проходят, функционал не ломает существующие сценарии.

---

## 13) Риски и меры

- **Orbit перегружает страницу** → ограничить `maxItems`, включить флаг, добавить fallback.
- **Слишком много красного акцента** → ввести строгие tokens: red = active/primary only.
- **Девайс/мобильный лаг** → mobile fallback в 2D.

---

## 14) План работ (по шагам)

- Step A — Prep: LayoutMode/ViewMode state + toolbar (2 ряда)
- Step B — Orbit MVP: CSS 3D + drag/wheel + snap
- Step C — Integrations: Orbit ↔ DetailsPanel, respects filters, feature flag
- Step D — A11y + Reduced Motion: keyboard + fallback
- Step E — Tests + Polish

---

## 15) Материалы (links)

```txt
Awwwards — IT EMPIRE (site page):
https://www.awwwards.com/sites/it-empire

Awwwards — “Cards UI and animation” element:
https://www.awwwards.com/inspiration/cards-ui-and-animation-it-empire

Live site:
https://itempire.com/

MDN — transform-style:
https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style

MDN — perspective (property):
https://developer.mozilla.org/en-US/docs/Web/CSS/perspective

MDN — perspective() function:
https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/perspective

MDN — Pointer events overview:
https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events

W3C — Pointer Events spec:
https://www.w3.org/TR/pointerevents/

web.dev — prefers-reduced-motion:
https://web.dev/articles/prefers-reduced-motion

Codrops (пример 3D карусели/карточек):
https://tympanus.net/codrops/2025/11/11/building-a-3d-infinite-carousel-with-reactive-background-gradients/
```

---

## 16) Открытые вопросы

1. Orbit включаем глобально для всех категорий или V1 только для `CHARACTERS`?
2. Orbit в Browse тоже нужен или достаточно Inspect?
3. Источник изображения для карточек: всегда есть cover/portrait или нужен placeholder?
4. Делать ли URL-состояние (`?layout=inspect&view=orbit`)?

