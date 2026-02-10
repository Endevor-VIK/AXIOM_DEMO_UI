<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_0013_NEWS_SIGNAL_CENTER_REWORK_V1_SPEC_MD
  title: "SPEC: NEWS — Signal Center Rework v1"
  status: DRAFT
  owner: CREATOR
  editable_by_agents: true
  scope: axiom_web_core_ui
  lang: ru
  last_updated: 2026-02-11
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/0013_news-signal-center-rework-v1/SPEC.md -->

# SPEC: NEWS — Signal Center Rework v1

## Preserve NEWS DISPATCH + SIGNAL CENTER, remove duplication, add autoplay, fix density

### Контекст

Текущий NEWS UI сохраняет стиль Red Protocol, но стал перегруженным и слишком крупным:

- Большие элементы и огромные заголовки дают ощущение интерфейса для слабовидящих.
- В NEWS DISPATCH присутствуют элементы управления (All/Updates/Releases/Audit/Fixes/Mark all read/Pinned only/Today), которые дублируются в другой панели и создают шум.
- SIGNAL CENTER нужен как главный ридер пакета и должен поддерживать:
  - ручное переключение новостей (Prev/Next),
  - автопереключение по таймеру,
  - контроль (pause, pin, mark unread/read).

Главное требование: сохранить и усилить концепцию **NEWS DISPATCH / SIGNAL CENTER**, остальное можно реворкать.

---

## Цели

1. Сохранить визуальную и смысловую связку:
   - **NEWS DISPATCH** = статус + навигация/фильтры (коротко)
   - **SIGNAL CENTER** = чтение выбранной новости (Packet Reader)
2. Убрать дублирующие элементы управления из NEWS DISPATCH.
3. Добавить в SIGNAL CENTER:
   - Prev/Next
   - Autoplay (таймер N секунд)
   - Pause/Resume (пауза при hover/focus)
   - Индикатор прогресса таймера
4. Вернуть нормальную плотность интерфейса:
   - уменьшить типографику и вертикальные отступы
   - дать переключатель плотности (Compact / Default) при необходимости
5. Сохранить Red Protocol эстетически (без смены темы/палитры).

---

## Non-goals

- Не менять формат данных новостей (manifest/source) и pipeline.
- Не переписывать весь layout сайта, только NEWS-вкладку и общие компоненты, если требуется.

---

## UX архитектура (как должно работать)

### A) NEWS DISPATCH (левый блок)

Роль: статус и краткая навигация, без повторения глобальных фильтров.

Оставить:

- Кольцо TOTAL NEWS + счётчики (Unread/New/Visible/Page/Pinned)
- Кнопки быстрых переходов (например Roadmap/Content)
- Минимальный набор действий:
  - Toggle: `Unread only` (если реально нужно)
  - Toggle: `Pinned only` (если реально нужно)
  - Кнопка: `Mark all read` (только если нет аналогичного действия в другом месте, иначе убрать)

Удалить из левого блока (перенести в верхнюю/центральную панель фильтров):

- `All / Updates / Releases / Audit / Fixes`
- `Today`

Причина: эти элементы фильтры/категории, им место в единой полосе фильтрации, а не в статусном блоке.

### B) SIGNAL CENTER (центральный блок / Packet Reader)

Роль: чтение выбранной новости + управление потоком.

Функции:

- Prev/Next (по текущему отсортированному списку)
- Autoplay:
  - переключает на следующую новость каждые `N` секунд (дефолт 8–12s)
  - Pause при hover на reader, при фокусе (keyboard), при открытом модале, при interaction (scroll/selection)
  - Resume вручную кнопкой или автоматически после таймаута (опционально)
- Индикатор прогресса autoplay (тонкая линия/дуга рядом с Next)
- Действия:
  - Pin
  - Mark unread/read (единый toggle)
  - Expand (если есть режим расширенного чтения/модал)

Вкладки внутри Packet Reader:

- Допускаются только те, что реально нужны NEWS:
  - `Summary` (основной текст)
  - `Links` (ссылки)
  - `Meta` (только если важно)

Запрет: превращать NEWS в инженерный Inspect как в Content Hub. Meta должна быть компактной.

### C) Список новостей (нижняя область)

Роль: быстрый обзор и выбор.

Требования:

- Снизить высоту строк, уменьшить шрифт заголовков, ужать padding.
- Ограничить визуальный шум (бейджи/чипы): максимум 2–3 ключевых чипа + `+N` раскрывается при hover.
- Клик по строке = selection в Signal Center.
- Список поддерживает:
  - сортировку (Newest first)
  - страницу/лимит (сохранить `20/page`)
  - поиск

---

## Не для слабовидящих (density/typography fix)

Ввести параметр плотности:

- `Density: default | compact`

Где compact:

- уменьшает font-size заголовков (особенно PACKET READER)
- уменьшает line-height и вертикальные отступы
- ужимает list rows
- снижает высоту чипов/кнопок

Минимальное требование: даже без тумблера density, привести размеры в адекватное состояние.

---

## State model (логика)

Единый источник правды:

- `selectedNewsId`
- `newsOrder[]` (результат фильтров+сортировки)
- `autoplay: { enabled, intervalSec, paused, reason }`
- `readState` / `pinnedState` (локально или из манифеста)

Autoplay rules:

- включается вручную
- пауза при:
  - hover/focus на Reader
  - открытом модале/expand
  - ручном переключении (короткая пауза 1–2s)
- по окончании таймера -> Next
- при достижении конца списка:
  - либо stop
  - либо loop (настраиваемо, дефолт: stop)

---

## План реализации (приоритеты)

### P0 (обязательное)

1. Удалить дублирующие фильтры/кнопки из NEWS DISPATCH.
2. В SIGNAL CENTER добавить Prev/Next + Autoplay + Pause/Resume + progress indicator.
3. Уменьшить визуальные размеры (типографика/spacing), чтобы интерфейс стал плотнее.

### P1

4. Привести нижний список к компактному виду: меньше высота строки, меньше чипов, стабильный selection.
5. Чётко развести роли блоков: Dispatch = статус, Center = чтение, List = выбор.

### P2

6. Density toggle (Compact/Default), если нужно оставить крупный режим как опцию.
7. Микроанимации (enter/exit selection) 150–220ms, без лагов.

---

## Acceptance Criteria (DoD)

- [ ] В NEWS DISPATCH больше нет лишних фильтров (All/Updates/Releases/Audit/Fixes/Mark all read/Pinned only/Today), если они уже есть в другой панели.
- [ ] SIGNAL CENTER умеет Prev/Next и Autoplay по таймеру.
- [ ] Autoplay корректно ставится на паузу при hover/focus и не мешает чтению.
- [ ] Типографика/spacing стали компактнее: на экране помещается больше контента, нет ощущения low-vision UI.
- [ ] Клик по строке новости в списке меняет выбранную новость в Signal Center.
- [ ] Концепт NEWS DISPATCH / SIGNAL CENTER сохранён и усилен, стиль Red Protocol не разрушен.

---

## Smoke Test

1. Открыть NEWS -> выбрать 5 разных новостей в списке -> Signal Center обновляется.
2. Включить Autoplay -> убедиться, что переключает новости по таймеру.
3. Навести мышь на Signal Center -> Autoplay ставится на паузу.
4. Убедиться, что лишние фильтры исчезли из NEWS DISPATCH и остались только в одном месте.
5. Проверить читаемость: больше строк в списке видно без скролла.

---

## AgentOps Deliverables

- Task log `ops/agent_ops/logs/NNNN_<slug>.md` (Step A-E).
- Обновить `ops/agent_ops/logs/00_LOG_INDEX.md`.
- Коммиты привязать к NNNN, scope только NEWS.

