<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_0034_CONTENT_HUB_VIEWMODES_STABILIZATION_V2_SPEC_MD
  title: "SPEC · 0034_content-hub-viewmodes-stabilization-v2"
  status: DRAFT
  mode: Doc
  goal: "SPEC"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-11
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
  owner: CREATOR
  workspace:
    repo: AXS
    app_path: apps/axiom-web-core-ui
  spec_id: SPEC_CONTENT_HUB_VIEWMODES_STABILIZATION_v2
-->

<!-- docs/iterations/0034_content-hub-viewmodes-stabilization-v2/SPEC.md -->

# SPEC: Content Hub View Modes Stabilization v2

## Browse / Cards / Orbit / Inspect — разделение ролей, разгрузка UI, фиксы selection, ограничение карточек (3–6)

**Scope:** `apps/axiom-web-core-ui`  
**Route:** `/dashboard/content/*`  
**Work mode:** `main` + AgentOps logs

---

## Контекст

Вкладка CONTENT перегружена и режимы “смешались”:

- В user UI появились лишние вкладки уровня отладки: `Summary / Meta / Source / Links`.
- В режиме `BROWSE` не открывается превью/selection по клику.
- `CARDS` выглядит странно и перегружает интерфейс.
- `ORBIT` сырой и смешивает сразу несколько представлений.

Суть задачи: вернуть чёткие роли режимам, убрать “системные детали” из user UI, починить `BROWSE`, резко сократить количество карточек и привести `ORBIT` к формату showcase.

---

## Цели

1. Чёткая модель режимов: `BROWSE / CARDS / ORBIT / INSPECT` — каждый режим выполняет свою задачу и не дублирует другой.
2. User UI чистый: никакой отладочной навигации (`Summary/Meta/Source/Links`) вне `INSPECT`.
3. `BROWSE` работает как “selection-driven UI”: клик по элементу = открытие превью/деталей.
4. `CARDS` перестаёт быть “простынёй”: показывать **только 3–6 карточек** одновременно (и не больше).
5. `ORBIT` становится витриной: минимальный UI, deep details — только через “Open Inspect”.
6. Сохранить Red Protocol стиль и общую эстетику (не ломать тему, не менять палитру глобально).

---

## Non-goals

- Не менять формат данных контента, схемы манифестов, мета-структуры и pipeline.
- Не переписывать Content Hub с нуля.
- Не трогать другие вкладки, кроме общих компонентов, если строго необходимо.

---

## Рабочая среда и правило разработки

Сайт уже интегрирован в AXS. Агент обязан работать **в AXS monorepo**:

- Рабочий путь приложения: `apps/axiom-web-core-ui`

Запрет:

- Не создавать отдельные репозитории.
- Не переносить код в “клон” вне AXS.
- Не менять чужие части AXS вне scope Content Hub.

---

## Термины и модель поведения

### 1) ViewMode State Machine

В системе должен быть единый state:

- `viewMode`: `'browse' | 'cards' | 'orbit' | 'inspect'`
- `selectedId`: выбранный элемент (единый источник правды)
- `filters/search/sort`: сохраняются при переключении режимов
- `selection` не сбрасывается без явного `Reset`

### 2) Принцип Progressive Disclosure

Глубокие детали (meta/source/links) доступны только тогда, когда пользователь реально хочет их открыть.

По умолчанию пользователь видит summary/preview, а не “панель инженера”.

---

## UX-спека по режимам

### BROWSE (поиск и быстрый выбор)

Роль: быстро найти и выбрать элемент.

UI:

- Слева: список элементов (строки).
- Справа: превью выбранного элемента (preview panel).
- Клик по строке (вся строка кликабельна) = `setSelectedId(id)`.
- `+` в строке — отдельное действие (pin/add/favorite), не влияет на selection.

Правило:

- Selection всегда видим: подсветка выбранного элемента.
- Preview всегда синхронизирован с selectedId.

### CARDS (визуальный обзор, строго 3–6)

Роль: обзор визуала и быстрых summary без перегруза.

Требование:

- Одновременно рендерить **не более 6 карточек**.
- Минимум 3 карточки (если контента больше 3).
- Значение 3–6 зависит от ширины экрана и плотности layout.

Рекомендуемая логика количества карточек:

- Desktop wide: 6
- Desktop normal: 4
- Tablet: 3
- Mobile: 1–2 (допускается, но задача нацелена на 3–6 для основных экранов)

Навигация:

- Только “Next/Prev batch” или “Stepper” (например, `1/5`).
- Бесконечный скролл запрещён.
- Полный список карточек на одной странице запрещён.

Поведение:

- Клик по карточке устанавливает `selectedId` и открывает превью (panel или modal).
- Опционально: автоподгрузка картинок только для текущих 3–6 карточек.

### INSPECT (глубокие детали)

Роль: глубокое чтение, источники, ссылки, метаданные.

UI:

- Здесь и только здесь доступна навигация: `Summary / Meta / Source / Links`.
- Остальные режимы не показывают эти вкладки.

### ORBIT (showcase / витрина)

Роль: “вау-визуал”, карусель/дека, минимум шума.

UI:

- Центр: дека/карусель.
- Левый список либо скрыт, либо компактный (не более 5–7 пунктов).
- Правая панель deep details не должна быть постоянно открыта.
- Кнопка: `Open Inspect` переводит в Inspect выбранного элемента.

---

## UI-очистка: убрать “лишние детали” из User UI

Проблема: вкладки `Summary / Meta / Source / Links` попали в режимы, где они не нужны.

Решение:

- В `browse/cards/orbit` не показывать эти вкладки вообще.
- В `inspect` показывать как tab bar или “Advanced”.

Acceptance:

- Пользователь в Browse/Cards/Orbit не видит “инженерный” UI.
- В Inspect доступна глубокая навигация и детали.

---

## Производительность

- Рендер карточек ограничен 3–6, что уже снижает нагрузку.
- Включить lazy-loading изображений карточек (если применимо).
- Анимации допускаются только лёгкие и короткие, без лагов.
- Учесть `prefers-reduced-motion`.

---

## План реализации (приоритеты)

### P0 — критично (чинит “сломано”)

1. Fix selection: `BROWSE` кликом по строке открывает preview.
2. Удалить `Summary/Meta/Source/Links` из user UI (вне Inspect).

### P1 — структура (чтобы больше не разваливалось)

3. Ввести единый `viewMode` + `selectedId` как общий источник правды.
4. CARDS: режим 3–6 карточек + batch-navigation (Prev/Next batch).

### P2 — полировка (после стабилизации)

5. Плавные transitions при смене batch/selection (учесть reduced motion).
6. ORBIT: минимизация UI, детали только через Open Inspect.

---

## Acceptance Criteria (Definition of Done)

### Browse

- [ ] Клик по элементу списка обновляет selection и preview.
- [ ] `+` не ломает selection, работает отдельно.

### User UI Cleanliness

- [ ] В `browse/cards/orbit` отсутствуют вкладки `Summary/Meta/Source/Links`.
- [ ] Вкладки доступны в `inspect`.

### Cards (3–6)

- [ ] Одновременно отображается не более 6 карточек.
- [ ] На десктопе отображается 4–6 карточек (в зависимости от ширины), на планшете 3.
- [ ] Переход по карточкам идёт batch-навигацией (Prev/Next batch), без “простыни”.

### Orbit

- [ ] Orbit не показывает одновременно список+дека+inspect-детали.
- [ ] Есть явная кнопка/переход `Open Inspect`.

### Общие

- [ ] Фильтры/поиск не сбрасываются при смене режимов.
- [ ] Selection сохраняется при смене режимов (кроме Reset).
- [ ] Стиль Red Protocol не разрушен.

---

## Smoke Test Plan

1. CONTENT → Browse → кликнуть 5 элементов → preview меняется каждый раз.
2. Проверить, что вкладки Summary/Meta/Source/Links видны только в Inspect.
3. Cards → проверить, что видим максимум 6 карточек и есть Next/Prev batch.
4. Orbit → выбрать элемент → Open Inspect → открываются детали.

---

## Rollback Plan

Если batch-навигация/режим Cards даст регрессию:

- оставить P0 (selection + очистка tabs),
- временно зафиксировать Cards как 3 карточки и простой Next/Prev без сложной логики.

---

## AgentOps Deliverables (обязательно)

- Создать Task Log `0034_<slug>.md` по шаблону, вести Step A–E.
- Обновить `ops/agent_ops/logs/00_LOG_INDEX.md`.
- Коммиты должны быть привязаны к `0034` и не выходить за scope.
- Работать только в `apps/axiom-web-core-ui` и связанных локальных компонентах UI.

