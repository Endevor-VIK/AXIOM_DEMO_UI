# ITERATION PLAN — AXIOM DEMO UI (RED PROTOCOL)

> **Status:** draft v1.0
> **Date:** 2025‑09‑22
> **Repo:** `Endevor-VIK/AXIOM_DEMO_UI`
> **Branch (work):** `feature/content-v2.1`
> **Target PR:** `feature/content-v2.1 → main` (squash, Conventional Commits)

---

## 0) Meta

**Purpose.** Синхронизировать все панели `/dashboard` со стилем **RED PROTOCOL** (как у login), исправить визуальные/структурные баги и улучшить мобильный UX без изменения данных и бизнес‑логики.

**Context (what’s already done).**

* Прототип стиля RED PROTOCOL реализован на **/login** (fx‑слой, свечение, радиусы, лезвийные заголовки).
* Базовые токены и компоненты в `ax-design/tokens.css` и `ax-design/components.css`.
* Добавлены разделы `/dashboard`: home, roadmap, audit, content, news; видны рассинхроны и пустоты.

**Constraints.**

* Без изменений серверной части и схем манифестов контента/новостей.
* Используем существующие токены/классы, расширяем только при необходимости.
* Анимации — только `transform/opacity`; `prefers-reduced-motion` обязателен.

**Glossary.**

* **Shell (`.ax-shell`)** — страничный каркас: отступы, ширина контейнера, вертикальные интервалы.
* **FX Layer (`#fx-layer`)** — фоновый слой эффектов; не взаимодействует с мышью, не содержит контента.
* **Sticky Bars** — фиксированные хедер/футер с компенсирующими отступами для контента.
* **Blade Head (`.ax-blade-head`)** — «лезвийный» заголовок секции с подсветкой и делителем.
* **Divider (`.ax-hr-blade`)** — тонкий разделитель с красным акцентом.
* **Chip (`.ax-chip`)** — капсула статуса/тега.
* **Ticker** — бегущая строка корпоративных апдейтов (одна на страницу, глобально под шапкой).
* **Split‑layout** — двухпанельная разметка: список слева + sticky‑превью справа; на мобиле — превью в модалке.
* **Viewer** — область просмотра (roadmap/audit), с явной высотой и внутренним скроллом.
* **Noisebar/Skeleton** — нейтральные плейсхолдеры вместо «кракозябр».
* **DoD** — Definition of Done / критерии приёмки.

---

## 1) Objectives (SMART)

1. **Визуальная консистентность с /login (RED PROTOCOL).**
   *Done when:* у всех страниц одинаковые радиусы/свечения карточек, blade‑заголовки, делители и чипы; эффекты вынесены в `#fx-layer`.

2. **Sticky header/footer без «парения».**
   *Done when:* при скролле верх/низ панели не «отрываются», контент не уходит под них; высоты компенсируются через shell.

3. **Глобальный NewsTicker + чистая `/dashboard/news`.**
   *Done when:* на каждой странице ровно **один** ticker под хедером; на `/news` нет дублирующих капсул; карточки новостей — сеткой 2‑колонки (desktop), тексты `line-clamp: 3`.

4. **/dashboard/content: split‑layout + мобильная модалка, без дубликата превью.**
   *Done when:* список рендерит только айтемы; превью — справа sticky (desktop) или модалкой (mobile); «инлайн-превью» под списком удалено.

5. **Roadmap/Audit viewer: корректные высоты и скролл.**
   *Done when:* viewer имеет явную минимальную высоту, внутренний скролл и не выглядит «пустым»; кнопки «Open/External» доступны и не перекрываются.

6. **Мобильный UX и производительность.**
   *Done when:* на мобиле убраны тяжёлые тени/блюры, анимации уважают `prefers-reduced-motion`, плавный скролл без дёрганий, взаимодействия тач‑дружественные.

7. **Чистые плейсхолдеры и кодировка.**
   *Done when:* вместо «��������…» используются skeleton/noisebar; проверены `<meta charset="utf-8">` и шрифт с кириллицей.

8. **Dev‑комфорт (локалка).**
   *Done when:* нет красных ошибок HMR (Vite WS), Router future‑warning опционально подавлен или задокументирован.

**Метрики приёмки (минимум):**

* CLS/FLIP‑джерки на главных взаимодействиях ≈ 0 (визуально), без «стробоскопа» при hover.
* FPS не проседает при тикере/скролле на десктопе; на мобиле тикер замедлён или отключён при `reduced-motion`.
* «Один источник истины» для новостей: отсутствие дублей в DOM на `/news`.

---

## 2) Scope & Out of Scope

### In Scope (входит в итерацию)

* **Каркас и слои:** единый `.ax-shell`, sticky header/footer, `#fx-layer`.
* **Новости:** глобальный `NewsTicker` в layout; чистка `/dashboard/news` от дубликатов; сетка карточек 2‑колонки на десктопе; `line-clamp` описаний; унификация чипов/кнопок.
* **Контент‑хаб:** split‑layout (list + sticky preview), модалка на мобиле; удаление «инлайн-превью»; плейсхолдеры noisebar/skeleton; фикс шрифта/кодировки.
* **Roadmap/Audit:** явные высоты viewer, правильный `overflow`, порядок слоёв; доступность кнопок (z‑index, focus).
* **Мобилка/перф:** облегчённые тени, адаптивные отступы через `clamp()`, отключение тяжёлых эффектов; поддержка `prefers-reduced-motion`.
* **Стили:** унификация карточек/блейдов/делителей/чипов под RED PROTOCOL с использованием `ax-design/*`.
* **Dev:** заметка по Vite HMR (ws/wss), при необходимости минимальная настройка `vite.config.ts`; Router‑future флаг — как опция.

### Out of Scope (не входит)

* Изменение серверной логики, схем манифестов или добавление новых API.
* Полная переработка дизайн‑токенов (создание новой системы с нуля).
* Международзация/локализация (кроме поддержки кириллицы в шрифте).
* SEO/метаданные, аналитика, авторизация/роли.
* Миграция на Router v7/SSR/новый билд‑пайплайн.
* Новые типы контента или долгие 3D/particle‑эффекты.

> Всё, что Out of Scope, может войти в следующую итерацию после стабилизации UI ядра.

---

## 3) Constraints & Dependencies

**Design system**

* Используем существующие файлы: `ax-design/tokens.css`, `ax-design/components.css`.
* Новые стили кладём в `styles/red-protocol-overrides.css` (импортируется в `app/main.tsx` после `ax-design/*`).
* Все базовые визуальные элементы — через утилитарные классы: `.ax-shell`, `.ax-card`, `.ax-blade-head`, `.ax-hr-blade`, `.ax-chip`, `.ax-ticker-*`.

**Routing/Runtime**

* React Router v6; допускается включить `future: { v7_startTransition: true }` без изменения API.
* Vite dev server: HMR по `ws://localhost:5173` (или `wss` при https). Не ломаем сборку/структуру.

**Fonts/locale**

* Обязателен `<meta charset="utf-8">` в `index.html`.
* Шрифт с поддержкой кириллицы (например, JetBrains Mono/Red Hat Display). Подключение — централизовано (без инлайна в компонентах).

**Accessibility**

* Поддержка `prefers-reduced-motion` и видимого `:focus`.
* Контраст текста на фоне ≥ WCAG AA (проверяем только ключевые зоны).

**Performance**

* Анимации только `transform/opacity`.
* Тяжёлые тени/блюры — запрещены в областях с постоянной прокруткой, на мобиле отключать.

**Dependencies между циклами**

* Cycle 0 → основа для всех остальных (shell, sticky bars, fx-layer, импорт overrides).
* Cycle 1 требует готовый shell (тикер закрепляется под шапкой).
* Cycle 2/3 используют разметку shell для sticky‑правил и высот.

---

## 4) Deliverables

1. **Каркас/слои**

   * Обновлённый `app/routes/_layout.tsx` (или эквивалентный корневой layout).
   * Новый фоновой слой `#fx-layer`.
   * Единый контейнер `.ax-shell` на всех страницах `/dashboard/*`.
2. **Компоненты**

   * `components/NewsTicker.tsx` — корпоративная бегущая строка.
   * `components/Modal.tsx` — лёгкая модалка для мобилки.
   * При необходимости: `components/ContentPreview.tsx` (выделенный превью‑панель).
3. **Стили**

   * `styles/red-protocol-overrides.css` (или добавки в `styles/app.css`).
   * Миксин/классы для: `.ax-ticker-*`, `.ax-content-split`, `.ax-noisebar`, кастомный скроллбар.
4. **Страницы**

   * `/dashboard` (home): унификация карточек, тикер под шапкой.
   * `/dashboard/news`: один тикер + сетка карточек (2‑колонки desktop), удаление дублей.
   * `/dashboard/content`: split‑layout + модалка на мобиле; удалён инлайн‑превью.
   * `/dashboard/roadmap`, `/dashboard/audit`: viewer‑панели с явной высотой/скроллом, доступностью кнопок.
5. **Документация**

   * Короткий `docs/RED_PROTOCOL_NOTES.md` (что, где и как подключено).
   * Обновление `docs/GETTING_STARTED.md` (заметка про HMR и шрифты).
6. **PR/Repo**

   * PR в `main` со сквош‑коммитом и чеклистом DoD.

---

## 5) Success Criteria / DoD

**Глобально**

* Хедер/футер sticky; контент не уходит под панели; нет «парения».
* Ровно один `NewsTicker` на страницу; на `/news` нет второй капсульной ленты.
* На мобиле тяжёлые эффекты отключены, скролл плавный, ховеры не «мигают».
* Нет «кракозябр» в плейсхолдерах, вместо этого видны `.ax-noisebar` или skeleton.
* Поддержан `prefers-reduced-motion`: тикер не анимируется или замедлён.
* В dev‑консоли отсутствуют красные ошибки HMR/WS.

**По страницам**

* **Home**: карточки и заголовки соответствуют RED PROTOCOL (радиусы, свечение, blade‑делители); тикер под шапкой.
* **News**: один тикер; карточки в 2 колонки (≥ 1024px), `line-clamp:3` на описании; равнение кнопок; без дублей в DOM.
* **Content**: split‑layout; превью справа sticky; на `<1024px` — модалка по тапу; никаких вторых инлайн‑превью.
* **Roadmap/Audit**: viewer имеет `min-height` и `overflow:auto`; кнопки `Open/External` доступны и не перекрываются FX‑слоем.

**Тест‑кейсы (ручные)**

* Пролистать каждую страницу сверху вниз и обратно (desktop/mobile). Убедиться, что бары не «плавают».
* Открыть `/content` на десктопе — превью закреплено; на мобиле — открывается модалка, закрывается по `Esc`/тапу на фон.
* В `/news` убедиться, что в DOM нет двух повторяющихся наборов новостей.
* Включить в ОС `reduce motion` и проверить отключение анимаций тикера.
* Brave/Chrome: выключить/включить shields — HMR не валит консоль.

---

## 6) Iteration Cycles

> Каждая карточка: **ID, Context, Goal, Files, Changes, Acceptance, Tests, Notes**

### Cycle 0 — Foundation (Shell, Sticky, FX)

**C0‑T1 — Layout shell и sticky bars**

* **Context:** бары «парят», контент уходит под них.
* **Goal:** единый каркас с sticky header/footer и компенсирующими отступами.
* **Files:** `app/routes/_layout.tsx`, `styles/red-protocol-overrides.css`, `index.html`.
* **Changes:** обёртка `.ax-page` + `.ax-shell`, `#fx-layer` (fixed), sticky header/footer; корректные высоты.
* **Acceptance:** любой скролл не ломает шапку/футер; контент не скрывается; FX‑эффекты не перехватывают клики.
* **Tests:** ручной скролл на всех страницах; проверка `z-index` кликабельности.

**C0‑T2 — Подключение overrides и токенов**

* **Context:** расхождения визуального языка.
* **Goal:** импорт `ax-design/*` + overrides ниже.
* **Files:** `app/main.tsx`, `styles/red-protocol-overrides.css`.
* **Changes:** порядок импортов: `tokens.css`, `components.css`, затем overrides.
* **Acceptance:** классы `.ax-card`, `.ax-blade-head`, `.ax-hr-blade` применяются глобально.

**C0‑T3 — Fonts & charset**

* **Context:** «кракозябры» в плейсхолдерах.
* **Goal:** гарантировать utf‑8 и шрифт с кириллицей.
* **Files:** `index.html`, `styles/red-protocol-overrides.css`.
* **Changes:** `<meta charset="utf-8">`, подключить кириллические гарнитуры.
* **Acceptance:** ни одного блока с «��������…».

**C0‑T4 — Базовые утилиты и scrollbar**

* **Goal:** ввести `.ax-noisebar`, кастомный тонкий скроллбар, адаптивные `clamp()`‑отступы.
* **Files:** `styles/red-protocol-overrides.css`.
* **Acceptance:** плейсхолдеры аккуратные; скроллбар узкий и не конфликтует с тёмной темой.

---

### Cycle 1 — News (Ticker + Grid)

**C1‑T1 — Глобальный NewsTicker**

* **Context:** нужна корпоративная бегущая строка единым компонентом.
* **Goal:** `NewsTicker` живёт в layout под шапкой, один на страницу.
* **Files:** `components/NewsTicker.tsx`, `app/routes/_layout.tsx`, `styles/red-protocol-overrides.css`.
* **Changes:** вставить компонент после header; css‑классы `.ax-ticker-*`; пауза по hover, `reduced-motion` режим.
* **Acceptance:** тикер виден на всех страницах; нет дублей; не «прыгает» FPS.

**C1‑T2 — Удалить капсульную дубль‑ленту на /news**

* **Files:** `app/routes/dashboard/news/*`.
* **Changes:** удалить вторую одну из лент, оставить только тикер + сетку карточек.
* **Acceptance:** в DOM ровно один набор заголовков новостей (без duplication).

**C1‑T3 — Сетка карточек и line‑clamp**

* **Files:** `app/routes/dashboard/news/*`, `styles/red-protocol-overrides.css`.
* **Changes:** 2‑колонки ≥ 1024px, 1 колонка на мобиле; `-webkit-line-clamp:3` для описаний; унифицированные `.ax-chip`.
* **Acceptance:** сетка заполняет пространство; описания не «льются» в 6+ строк; кнопки ровно выровнены.

---

### Cycle 2 — Content Hub (Split + Modal)

**C2‑T1 — Split‑layout (list + sticky preview)**

* **Files:** `app/routes/dashboard/content/AllRoute.tsx`, `styles/red-protocol-overrides.css`.
* **Changes:** сетка `.ax-content-split`; слева список + фильтры; справа `.ax-card` со sticky превью.
* **Acceptance:** на десктопе превью всегда в видимой области при скролле списка.

**C2‑T2 — Модалка превью на мобиле**

* **Files:** `components/Modal.tsx`, `AllRoute.tsx`, стили.
* **Changes:** при ширине <1024px по выбору айтема открывать модалку; закрытие по `Esc`/тап на фон.
* **Acceptance:** UX без горизонтальных скроллов; модалка не «течёт».

**C2‑T3 — Удаление инлайн‑дубликата превью**

* **Files:** `AllRoute.tsx` и/или компонент списка.
* **Changes:** удалить рендер превью под списком; список только эмитит `onSelect`.
* **Acceptance:** в DOM одно превью.

**C2‑T4 — Плейсхолдеры вместо битого текста**

* **Files:** стили + компоненты списка/тайлов.
* **Changes:** внедрить `.ax-noisebar`/skeleton.
* **Acceptance:** отсутствуют «кракозябры»; визуальный шум минимален.

---

### Cycle 3 — Roadmap & Audit (Viewer)

**C3‑T1 — Явная высота и overflow viewer**

* **Files:** `app/routes/dashboard/roadmap/*`, `app/routes/dashboard/audit/*`, стили.
* **Changes:** `.ax-viewer { min-height: calc(100dvh - header - footer - запас); overflow:auto; }`.
* **Acceptance:** контент виден; прокручивается внутри; нет «пустого полотна».

**C3‑T2 — Кнопки и Z‑layers**

* **Changes:** обеспечить кликабельность `Open/External`; проверить, что `#fx-layer` не перекрывает.
* **Acceptance:** клики работают, фокус‑обводка видна.

**C3‑T3 — Лоудер/Skeleton**

* **Changes:** при загрузке html/markdown показывать skeleton вместо пустоты.
* **Acceptance:** нет «мертвых» пустых блоков при ожидании.

---

### Cycle 4 — Polish & Mobile

**C4‑T1 — Унификация карточек и заголовков**

* **Files:** глобальные стили и все страницы.
* **Changes:** `.ax-card` / `.ax-blade-head` / `.ax-hr-blade` — строго одинаковые; убрать локальные варианты.
* **Acceptance:** визуально как /login по радиусам/свечению/делителям.

**C4‑T2 — Гуттеры и адаптив через clamp()**

* **Changes:** `.ax-shell` гуттеры и вертикальные интервалы через `clamp()`; проверка больших экранов.
* **Acceptance:** нет чувства «отдалённой перспективы», блоки занимают пространство.

**C4‑T3 — Hover/active/focus состояния**

* **Changes:** только `transform/opacity`; видимый `:focus`; без резких миганий.
* **Acceptance:** a11y‑дружественные состояния.

**C4‑T4 — Mobile perf**

* **Changes:** ослабить тени на мобиле, уменьшить тикер‑скорость; отключить тяжёлое по `reduced-motion`.
* **Acceptance:** плавный скролл, нет подлагов.

---

### Cycle 5 — QA & Docs

**C5‑T1 — Чек‑листы DoD**

* **Changes:** пройти DoD по каждой странице и Глобально.
* **Acceptance:** все пункты зелёные.

**C5‑T2 — Перформанс‑смотр**

* **Changes:** быстрая проверка DevTools Performance на 2–3 сценариях; убрать горячие точки.
* **Acceptance:** нет длинных layout thrashing; анимации не грузят CPU.

**C5‑T3 — Документация и PR**

* **Files:** `docs/RED_PROTOCOL_NOTES.md`, `docs/GETTING_STARTED.md`.
* **Changes:** заметки по подключению, ограничениями, будущим шагам; PR с чеклистом.
* **Acceptance:** PR готов к ревью без дополнительных вопросов.

---

## 7) Work Items (детальные карточки для агента)

> Формат карточки: **Context · Goal · Files · Changes · Acceptance · Tests · Notes**

### Cycle 0 — Foundation

**C0‑T1: Layout shell + sticky bars**

* **Context:** бары «парят», FX‑слой может перекрывать клики.
* **Goal:** единый каркас с sticky header/footer и `#fx-layer`.
* **Files:** `app/routes/_layout.tsx`, `styles/red-protocol-overrides.css`, `index.html`.
* **Changes:** внедрить `.ax-page`, `.ax-shell`, sticky header/footer (vars `--ax-header-h`, `--ax-footer-h`), `#fx-layer` fixed.
* **Acceptance:** на всех страницах `/dashboard/*` панели не отрываются, клики по контенту не блокируются.
* **Tests:** скроллите вверх/вниз на Home/News/Content/Audit/Roadmap.
* **Notes:** следить за порядком слоёв: header/footer z‑index > shell > fx‑layer.

**C0‑T2: Overrides import order**

* **Context:** расхождения в стилях из‑за порядка импортов.
* **Goal:** `red-protocol-overrides.css` идёт после `ax-design/*`.
* **Files:** `app/main.tsx`.
* **Acceptance:** классы overrides перезаписывают базовые.

**C0‑T3: Fonts + charset**

* **Context:** битые символы в плейсхолдерах.
* **Goal:** гарантировать `<meta charset>` и кириллицу в шрифтах.
* **Files:** `index.html`, `styles/red-protocol-overrides.css`.
* **Acceptance:** нет «��������…» в DOM.

**C0‑T4: Utils (noisebar, scrollbar)**

* **Goal:** завести `.ax-noisebar`, тонкий скроллбар, адаптивные гуттеры.
* **Files:** `styles/red-protocol-overrides.css`.
* **Acceptance:** визуально чистые плейсхолдеры; аккуратный скроллбар.

---

### Cycle 1 — News

**C1‑T1: Вставить глобальный NewsTicker**

* **Context:** нужен один корпоративный тикер на всех страницах.
* **Goal:** добавить `components/NewsTicker.tsx` в layout, под шапкой.
* **Files:** `components/NewsTicker.tsx`, `app/routes/_layout.tsx`, `styles/red-protocol-overrides.css`.
* **Changes:** компонент с бесшовной прокруткой (transform), пауза при hover, режим `reduced-motion`.
* **Acceptance:** один тикер на страницу; нет дублей; на мобиле скорость ниже.

**C1‑T2: Чистка дублей на /news**

* **Goal:** удалить капсульную «вторую» ленту; оставить одну сетку.
* **Files:** `app/routes/dashboard/news/*`.
* **Acceptance:** в DOM единственный набор карточек.

**C1‑T3: Сетка карточек 2‑колонки + line‑clamp**

* **Files:** `app/routes/dashboard/news/*`, `styles/red-protocol-overrides.css`.
* **Acceptance:** ≥1024px — 2 колонки, <960px — 1; описания обрезаны до 3 строк.

---

### Cycle 2 — Content Hub

**C2‑T1: Split‑layout**

* **Goal:** ввести `.ax-content-split` (list + sticky preview).
* **Files:** `app/routes/dashboard/content/AllRoute.tsx`, `styles/red-protocol-overrides.css`.
* **Acceptance:** превью всегда видно при скролле списка.

**C2‑T2: Modal preview на мобиле**

* **Goal:** открывать превью модалкой при ширине <1024px.
* **Files:** `components/Modal.tsx`, `AllRoute.tsx`.
* **Acceptance:** закрытие по фон/ESC, скролл внутри.

**C2‑T3: Удалить инлайн‑дубликат**

* **Goal:** в DOM остаётся только один блок превью.
* **Files:** `AllRoute.tsx`/листинг.

**C2‑T4: Плейсхолдеры**

* **Goal:** заменить битый текст на `.ax-noisebar`/skeleton.
* **Files:** компоненты списка/тайлов, стили.

---

### Cycle 3 — Roadmap/Audit

**C3‑T1: Viewer размеры/скролл**

* **Goal:** задать `min-height` и `overflow:auto` viewer‑панели.
* **Files:** `app/routes/dashboard/roadmap/*`, `app/routes/dashboard/audit/*`, стили.

**C3‑T2: Кнопки/слои**

* **Goal:** обеспечить доступность кнопок; `#fx-layer` не перекрывает.

**C3‑T3: Skeleton загрузки**

* **Goal:** показывать placeholder, пока источник не отрисован.

---

### Cycle 4 — Polish & Mobile

**C4‑T1: Унифицировать `.ax-card/.ax-blade-head/.ax-hr-blade`**

* **Goal:** привести к виду /login на всех страницах.

**C4‑T2: Гуттеры через clamp()**

* **Goal:** убрать ощущение «отдалённой перспективы» на широких экранах.

**C4‑T3: Focus/hover**

* **Goal:** видимый `:focus`, мягкие hover без миганий.

**C4‑T4: Mobile perf**

* **Goal:** ослабить эффекты, снизить тени, замедлить тикер.

---


## 8) Visual Guidelines 

### 8.1 Базис и токены

* **Источник стилей:** `ax-design/tokens.css`, `ax-design/components.css` + локальные `styles/red-protocol-overrides.css` (после `ax-design/*`).
* **Цветовые роли:** использовать семантические переменные (если доступны) — `--ax-bg/*`, `--ax-ink/*`, `--ax-red/*`, `--ax-muted/*`. Если роли отсутствуют — вводить под `--ax-role-*` и мэппить на существующие.
* **Темнота:** фоновые градиенты тёплые, без синего/цианового холодка. Красная подсветка — с альфой, не чистый #FF0000.
* **Типографика:** заголовки — моно-капсы (mono, 600–700, letter-spacing 0.06–0.1em), текст — гротеск/моно микс.

### 8.2 Карточки (`.ax-card`)

* **Радиус:** 18–20px (строго одинаковый по всему /dashboard).
* **Контур:** 1px `rgba(255,32,52,.16)` **inset**.
* **Свечение:** мягкое `inset 0 0 24px rgba(255,32,52,.12)`; никаких мощных внешних glow на больших площадях.
* **Фон:** `radial-gradient(120% 100% at 50% 0, #130a0d, #0b0708)`.
* **Отступы:** внутренние `clamp(14px, 2.2vw, 22px)`; между блоками — `clamp(12px, 2vw, 20px)`.
* **Слои:** контентные элементы не используют `filter: blur()`. Эффекты — через `#fx-layer`.
* **Скелетоны:** вместо «кракозябр» — `.ax-noisebar`/skeleton‑строки.

**CSS‑шаблон**
*Пример для переиспользования:*

```css
.ax-card{
  border-radius:20px;
  background:radial-gradient(120% 100% at 50% 0,#130a0d,#0b0708);
  box-shadow:0 0 0 1px rgba(255,32,52,.16) inset,0 0 24px rgba(255,32,52,.12) inset;
  padding:clamp(14px,2.2vw,22px);
}
```

### 8.3 Заголовки секций (`.ax-blade-head`) и делители (`.ax-hr-blade`)

* **Стиль:** моно‑капс, 700, letter‑spacing ≈ 0.08em.
* **Подсветка:** тонкая красная линия под заголовком + лёгкая рябь.
* **Иерархия:** h2 — крупный, h3 — меньше; не использовать ярко‑жёлтый, кроме явно выделенных предупреждений.
* **Отступы:** сверху/снизу `clamp(10px, 1.8vw, 16px)`.

```css
.ax-blade-head{font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.ax-hr-blade{height:2px;background:linear-gradient(90deg,rgba(255,32,52,.7),rgba(255,32,52,.2));border:0;border-radius:2px}
```

### 8.4 Чипы (`.ax-chip`)

* **Виды:** `--filled` (акцент) и `--hollow` (контур). Третий вид — `--muted` для второстепенных меток.
* **Размер:** высота 22–24px, шрифт 11–12px моно‑капс.
* **Интервалы:** горизонтальный зазор между чипами 6–10px.
* **Glow:** **запрещён** сильный внешний glow; допускается лёгкий контур.

### 8.5 Ticker (корпоративный телетайп)

* **Высота:** 36–40px (desktop), 30–34px (mobile).
* **Скорость:** 36–48 px/s (desktop), 20–28 px/s (mobile); пауза при hover.
* **Швы:** контент дублируется для бесшовного эффекта; второй список — `aria-hidden="true"`.
* **ARIA:** контейнер `aria-label="Latest briefings"`, внутри — статичный список; **не** спамить screen reader событиями.
* **Reduced motion:** при `prefers-reduced-motion` — остановить прокрутку и просто отображать ленту без движения.

### 8.6 Гриды, гуттеры и контейнер

* **Контейнер:** ширина `min(1200px, 100% - 2*gutter)`.
* **Гуттер:** `--gutter: clamp(12px, 2.2vw, 24px)`; вертикальные интервалы `--vspace: clamp(12px, 2.6vw, 28px)`.
* **Брейкпоинты:** 360 / 480 / 768 / 1024 / 1280.
* **News grid:** ≥1024px — 2 колонки; <1024px — 1.
* **Split‑layout:** 1fr + 340–420px справа (sticky preview); на мобиле — 1 колонка + модалка.

### 8.7 Иконки

* **Стиль:** однотонные, монолинейные, светлые (с розово‑красным оттенком via `currentColor`).
* **Размер:** 18–24px; выравнивать по cap‑height текста.
* **A11y:** если декоративные — `aria-hidden="true"`.

### 8.8 Состояния (hover/active/focus)

* **Hover:** лёгкий подъём `transform: translateY(-1px)` или масштаб `scale(1.01)`; длительность 140–180ms, cubic‑bezier(0.2,0.6,0.2,1).
* **Active:** «нажатие» `translateY(0)` + ослабление внутреннего свечения.
* **Focus:** видимая обводка (outline 2px, оттенок красного/розового с альфой), не убирать `outline` глобально.

### 8.9 FX‑слой

* **Расположение:** `#fx-layer { position: fixed; inset:0; pointer-events:none; z-index:0; }`.
* **Назначение:** фоновые градиенты/рябь; **никаких** кликабельных элементов; не перекрывать контент/кнопки.

---

## 9) Performance & Accessibility (расширенные)

### 9.1 Производительность

* **Анимации:** только `transform/opacity`; избегать `filter`, `box-shadow` на больших блоках в скролле.
* **RAF‑петли:** если нужна JS‑анимация (тикер) — `requestAnimationFrame`; пауза, когда вкладка скрыта (`document.hidden`).
* **IntersectionObserver:** останавливать тяжёлые эффекты, если блок вне вьюпорта.
* **contain:** для больших изолированных контейнеров можно добавить `contain: content;` (аккуратно, без ломки размеров).
* **Обновления DOM:** избегать частых reflow; использовать `will-change` только точечно и временно (на время анимации).

### 9.2 Доступность

* **Модалка:** `role="dialog"` + `aria-modal="true"`; фокус‑трап внутри модалки; возврат фокуса на триггер после закрытия; закрытие по `Esc` и клику по backdrop.
* **Ticker:** визуально — движение; для скринридеров — статичный список (`aria-hidden` на дубликате, без `aria-live` спама).
* **Клавиатура:** полная навигация `Tab/Shift+Tab/Enter/Esc`; порядок фокуса логичен; интерактивные элементы в DOM‑порядке.
* **Контраст:** ключевые тексты ≥ AA. Если светлый текст на тёмно‑красном — добавить лёгкий `text-shadow` или снизить насыщенность фона.
* **Размеры целей:** минимум 40×40px на тач‑устройствах для кликабельных элементов (кнопки, табы, переключатели).
* **Семантика:** landmark‑роли (`<header>`, `<main>`, `<footer>`), списки — `<ul>`/`<li>` вместо дивов.

### 9.3 Reduced motion

* **Правило:**

```css
@media (prefers-reduced-motion: reduce){
  .ax-ticker-track{ transform:none !important; }
  .ax-anim{ animation:none !important; transition:none !important; }
}
```

* **JS‑ветка:** при детекте reduced‑motion можно снижать частоту обновления/скорость тикера или выключать его полностью.

---

## 10) Dev Notes (расширенные)

### 10.1 Vite HMR

* **Браузер Brave:** отключить Shields для `localhost:5173`.
* **Конфиг (пример):**

```ts
// vite.config.ts
export default defineConfig({
  server:{
    host:'localhost', port:5173, strictPort:true,
    hmr:{ protocol:'ws', host:'localhost', port:5173, clientPort:5173, path:'/hmr' }
  }
});
```

* Если dev‑сервер под https — `hmr.protocol:'wss'`.

### 10.2 React Router future‑flag

```ts
const router = createBrowserRouter(routes, { future:{ v7_startTransition:true } });
```

### 10.3 Порядок CSS

1. `ax-design/tokens.css`
2. `ax-design/components.css`
3. `styles/red-protocol-overrides.css`

### 10.4 Z‑index карта

* Modal: **999**
* Header/Footer sticky: **100**
* Ticker/Top overlays: **90**
* Page content (shell): **10**
* FX layer: **0**

### 10.5 Практики

* **Коммиты:** Conventional — `feat/fix/refactor/style/chore/docs` + scope.
* **PR:** один сквош; чеклист DoD; скриншоты «до/после» по страницам.
* **Проверки:** Chrome, Brave, Mobile Chrome (Android/iOS симулятор); ширины: 360, 390, 768, 1024, 1280, 1440.
* **Диагностика перфа:** DevTools Performance → скролл `/news`, запуск тикера, открытие модалки. Ищем длинные Layout/Recalculate Style.
* **Запреты:** `overflow: clip` на родителях viewer; тяжёлые многоступенчатые `box-shadow` на scroll‑зонах; длинные CSS‑фильтры.

---

## 11) Attachments (расширенные)

### 11.1 Скриншоты (минимальный набор)

* `home_scroll.png` — разрыв шапка/низ при скролле.
* `news_dup.png` — дублирующаяся лента в `/news`.
* `content_inline_preview.png` — второй инлайн‑превью под списком.
* `viewer_empty.png` — пустое «полотно» в `/roadmap` или `/audit` (без контента из‑за высоты/overflow).
* `mobile_overflow.png` — горизонтальные скроллы/тяжёлые эффекты на мобиле.

**Для каждого скрина:** краткая подпись «Что увидеть», «Ожидаемое поведение», «Где фиксится (файлы)».

### 11.2 Ссылки по репо (точки входа)

* Дизайн: `ax-design/tokens.css`, `ax-design/components.css`
* Глобальные стили: `styles/app.css`, `styles/red-protocol-overrides.css`
* Layout: `app/routes/_layout.tsx`
* Страницы: `app/routes/dashboard/*` (home, news, content, audit, roadmap)
* Компоненты: `components/NewsTicker.tsx`, `components/Modal.tsx`, `components/ContentPreview.tsx`

### 11.3 Как прикладывать в PR

* Папка `attachments/iteration-v1/` в корне ветки или в описании PR (drag’n’drop).
* Скриншоты «до/после» по каждой странице, gif работы тикера и модалки.
* Список проверенных ширин и браузеров.
