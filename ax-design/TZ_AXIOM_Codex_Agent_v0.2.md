# ТЗ • AXIOM Codex Agent — Внедрение RED PROTOCOL UI (v0.2)

**Дата:** 2025‑09‑19
**Репозиторий:** `Endevor-VIK/AXIOM_DEMO_UI`
**Рабочая ветвь:** `feature/content-v2` (паблик остаётся на `main`)
**Размещение ТЗ:** `ax-design/TZ_AXIOM_Codex_Agent_v0.2.md` (временное; после F4 → `docs/`)

## 0) Цель и объём

Внедрить визуальную систему **RED PROTOCOL** (минимализм, острые «blade»‑формы, кибер‑футуризм) во все ключевые экраны сайта без ломки данных и маршрутов. Истина по стилям — **design tokens** и **библиотека компонентов** в `ax-design/*`.

**Входит в объём:** токены/компоненты, логин, топ‑бар/лейаут, dashboard (home), dashboard/{roadmap,audit,content,news}, базовые анимации и доступность.
**Не входит:** изменение форматов данных, переезд на другую сборку, перепроектирование навигации.

---

## 1) Артефакты и ссылки

* **Новые файлы (источник истины):**

  * `ax-design/tokens.css` — палитра, радиусы, тени, шрифты, анимации, контейнеры.
  * `ax-design/components.css` — `.ax-card`, `.ax-chip`, `.ax-blade-head`, `.ax-hr-blade`, `.ax-btn`, `.ax-input`, `.ax-tabs/.ax-tab`, `.ax-cover-*`, `.ax-scroll`, утилиты.
  * `ax-design/AX_UI_ROADMAP_v0.2.md` — дорожная карта и DoD.
* **Референсы (строительные леса; не импортировать в бандл):**

  * `ax-design/compat/axiom_style.qss`, `axiom_chrome.qss`, `axiom_red.qss`, `axiom-custom.css`, `settings.json`, `login_window.py`, `ref_html_03.01_VIKTOR.md`, `README_TEMP.md`.
* **Ключевые страницы/компоненты в проекте:**

  * `app/main.tsx` — точка импорта глобальных стилей.
  * `app/routes/_layout.tsx` — шапка/навигация/рамка приложения.
  * `app/routes/login/page.tsx` — экран входа.
  * `app/routes/dashboard/page.tsx` — главная панели.
  * `app/routes/dashboard/roadmap/page.tsx` — дерево/предпросмотр (iframe).
  * `app/routes/dashboard/audit/page.tsx` — список отчётов/предпросмотр (iframe).
  * `app/routes/dashboard/content/page.tsx` — hub категорий и карточек.
  * `app/routes/dashboard/news/page.tsx` — лента новостей.
  * `components/StatusLine.tsx`, `components/NewsCard.tsx` и др. (переиспользуемые сущности).
  * `styles/app.css` — прежние глобальные стили (частично заменяются токенами/компонентами).
  * `public/data/**` — манифесты и статические материалы для модулей.

**Guardrails:** `ax-design/compat/**` — **НЕ** подключать в бандл, использовать только как референс. Все изменения в `compat/` должны отражаться в `ax-design/tokens.css`/`components.css` + запись в `compat/README_TEMP.md → MIGRATION_LOG`.

---

## 2) План фаз (F1 → F4)

**F1 — Foundation:** импорт `tokens.css` + `components.css`, обновление `_layout.tsx` (контейнер/табы), полная переразметка `login` под веб‑паритет PyQt.
**F2 — Dashboard:** рефактор `dashboard/page.tsx` (компактная сетка, статусы‑чипы, кнопки‑чипы).
**F3 — Modules:** единый паттерн «список слева / предпросмотр справа» для `roadmap` и `audit`; редизайн `content` (категории 3×2, заглушки), `news` (грид, типы, карточка).
**F4 — Cleanup:** финальный визуальный аудит, Lighthouse (a11y/contrast), удаление `compat/`, перенос документов в `docs/`, релиз‑тег.

### Definition of Done (проект):

* Все страницы используют токены и классы из `ax-design/*`.
* Контраст AA (текст ≥ 4.5:1), видимый focus‑ring, поддержка `prefers-reduced-motion`.
* При масштабе 100% интерфейс смотрится «собранно» (без ощущения жирноты).
* `compat/` удалён; релиз оформлен.

---

## 3) Конкретные задачи (пошагово)

### 3.1 Импорт токенов/компонентов (F1)

1. Открыть `app/main.tsx` и **до** `styles/app.css` импортировать:

   ```ts
   import "../ax-design/tokens.css";
   import "../ax-design/components.css";
   import "../styles/app.css"; // оставить до миграции F4
   ```
2. Проверить порядок: `tokens.css` → `components.css` → старые стили.
3. Убедиться, что сборщик не включает `ax-design/compat/**` (exclude‑паттерн или явный неимпорт).

### 3.2 Топ‑бар/лейаут (F1)

**Файл:** `app/routes/_layout.tsx`

1. Обернуть контент в контейнер: `<div className="ax-container">{children}</div>`.
2. Навигацию оформить как табы:

   ```tsx
   <nav className="ax-tabs">
     <a className="ax-tab" href="/dashboard" aria-current={route==="/dashboard"?"page":undefined}>HOME</a>
     <a className="ax-tab" href="/dashboard/roadmap" aria-current={...}>ROADMAP</a>
     <a className="ax-tab" href="/dashboard/audit" aria-current={...}>AUDIT</a>
     <a className="ax-tab" href="/dashboard/content" aria-current={...}>CONTENT</a>
     <a className="ax-tab" href="/dashboard/news" aria-current={...}>NEWS</a>
   </nav>
   ```
3. Справа добавить компактные действия (иконки): масштаб текста, помощь, уведомления, `Выход`.
4. В нижней части шапки можно использовать `ax-cover-bar` для кратких статусов (опционально на HOME).

### 3.3 Экран `login` (F1)

**Файл:** `app/routes/login/page.tsx`

1. Панель входа:

   ```tsx
   <section className="ax-container ax-section">
     <div className="ax-card" role="form" aria-labelledby="login-title">
       <h1 id="login-title" className="ax-blade-head">WELCOME TO AXIOM PANEL</h1>
       {/* SVG‑эмблема (вращение) */}
       <div aria-hidden="true" className="logo-spin" />
       <input className="ax-input" name="user" placeholder="USER ID" />
       <input className="ax-input" name="key" placeholder="ACCESS KEY" type="password" />
       <div className="ax-row">
         <button className="ax-btn primary" type="submit">ENTRANCE</button>
         <button className="ax-btn ghost" type="button">REGISTER</button>
       </div>
       <div className="ax-hr-blade" aria-hidden="true" />
       <small>AXIOM DESIGN © 2025 — RED PROTOCOL</small>
     </div>
   </section>
   ```
2. Ошибки авторизации: добавлять `aria-live="assertive"` и класс `.is-invalid`/`aria-invalid="true"` на соответствующий `.ax-input`; на контейнер `ax-card` при ошибке — класс, который включает `animation: ax-shake 0.24s`.
3. CSS для эмблемы: в `components.css` уже есть базис; добавить локальный класс `.logo-spin` (rotation + glow), не трогая токены.

### 3.4 `dashboard/page.tsx` (F2)

1. Макет 2‑колоночный внутри `.ax-container`: слева блок **Статус** (три `.ax-chip`: `AUDIT`, `CONTENT`, `NEWS`), справа — **Что нового** (последние 1–3 новости).
2. Кнопки «Открыть …» заменить на `.ax-btn ghost` либо компактные `.ax-chip`‑кнопки.
3. Заголовки секций — `ax-blade-head`; разделители — `ax-hr-blade`.
4. Карточки — `ax-card` с `data-noise="on"`.

### 3.5 `dashboard/roadmap/page.tsx` (F3)

1. Левый список — колонка с `ax-card`; активный элемент подсвечивать `ax-chip`‑стилем.
2. Правый предпросмотр — обёртка `.ax-scroll` и `iframe` внутри.
3. Кнопки «Развернуть/Свернуть все», «Открыть в новой вкладке» — `.ax-btn`/`.ax-chip`.
4. Заголовки списка — `ax-blade-head`.

### 3.6 `dashboard/audit/page.tsx` (F3)

1. Повторяем паттерн из Roadmap: список слева (`ax-card`), предпросмотр справа (`.ax-scroll > iframe`).
2. В заголовке предпросмотра раскрывать теги статуса отчёта чипами (`data-variant`: `info/warn/error`).
3. Добавить контролы масштаба (100/125/150%) рядом с предпросмотром.

### 3.7 `dashboard/content/page.tsx` (F3)

1. Сверху — грид 3×2 «категорий» (Locations/Characters/Technologies/Factions/Events/Lore) как карточки‑кнопки (`ax-card` + иконка + подзаголовок).
2. В категориях с 0 элементов показывать заглушку: иконка, подпись «Заполнится скоро», чип `EMPTY` (серый).
3. Блок фильтров (поиск/теги/статусы/язык) уплотнить в одну строку на широких экранах.

### 3.8 `dashboard/news/page.tsx` (F3)

1. Перестроить вывод на грид 2×2 (xl)/1×N (sm).
2. В `components/NewsCard.tsx` переоформить карточку: заголовок, дата, теги‑чипы, краткий анонс, кнопка `Открыть` (`.ax-btn`).
3. Вверху — панель фильтров/пагинации с отдельным фоном (`ax-card ghost`).
4. Типам новостей назначить цветокод (`release/update/heads-up` → variants `info/good/warn`).

### 3.9 Обновление `StatusLine.tsx` (F2)

Добавить справа мини‑индикаторы: версия, зона, online. Использовать чипы/крошки (`.ax-chip` мелкого размера) и моноширинный шрифт.

---

## 4) Правила доступности, анимаций и перфоманса

* Все интерактивные элементы должны иметь видимый **focus** (см. `.ax-btn:focus-visible`, `.ax-chip:focus-visible`).
* **prefers-reduced-motion** — отключать sweep/shake/параллакс.
* Контраст текста и интерфейсных частей — не ниже AA.
* Избегать тяжёлых SVG‑фонов; предпочитать CSS‑градиенты/маски.
* Предпросмотры через `iframe` в `.ax-scroll` — без box‑shadow‑штормов; экономные тени.

---

## 5) Коммиты, PR и приёмка

**Префиксы:** `tokens:`, `ui:`, `layout:`, `login:`, `dashboard:`, `roadmap:`, `audit:`, `content:`, `news:`, `compat:`, `docs:`.
**Чек‑лист PR:**

* [ ] `ax-design/tokens.css` и `ax-design/components.css` подключены и не сломали существующие страницы.
* [ ] `compat/**` **не** импортирован.
* [ ] Скриншоты до/после приложены; страницы сверены на 100% масштабе.
* [ ] Lighthouse: a11y ≥ 90, контраст OK.
* [ ] `compat/README_TEMP.md → MIGRATION_LOG` обновлён.
* [ ] В `AX_UI_ROADMAP_v0.2.md` отмечены завершённые пункты.

**Приёмка по фазам:**
— F1: видим паритет PyQt на `login`, обновлён `_layout`.
— F2: компактный `dashboard/home`.
— F3: единый паттерн для `roadmap/audit`, обновлён `content/news`.
— F4: удалён `compat/`, docs перенесены, релиз‑тег.

---

## 6) Примечания по стилю (визуальная ДНК)

* Палитра: `--ax-bg #0c0d11`, `--ax-ink #10090c`, `--ax-red #ff2034`, доп. `--ax-red-2/#b10f1e`, `--ax-red-3/#5a0a12`.
* Характер формы: «лезвия»/клин (заголовки, табы, делители).
* Чипы/кнопки: круглые радиусы для чипов, острые для табов/заголовков; **sweep** на active ≤ 320 мс.
* Фон: допускается лёгкий шум/глитч; умеренно и отключаемо.
* Шрифты: body — `Inter`, тех‑метки — моно (`ui-monospace`), display — `Oxanium/Rajdhani` (опционально).

---

## 7) Быстрые команды/подсказки

* Импорт стилей (в `app/main.tsx`):

  ```ts
  import "../ax-design/tokens.css";
  import "../ax-design/components.css";
  import "../styles/app.css";
  ```
* Пример «пилюли» статуса:

  ```html
  <span class="ax-chip" data-variant="level">ECHELON · LEVEL 02</span>
  <span class="ax-chip" data-variant="online">ACCELERATOR: ONLINE</span>
  <span class="ax-chip" data-variant="armed">NIGHTMARE: ARMED</span>
  ```
* Делитель и заголовок:

  ```html
  <h3 class="ax-blade-head">Ключевые маркеры</h3>
  <div class="ax-hr-blade" aria-hidden="true"></div>
  ```

---

## 8) Финализация (F4)

1. Визуальный аудит всех разделов (скрин‑сверка с референсами).
2. Удалить `ax-design/compat/**`, почистить неиспользуемые классы в `styles/app.css`.
3. Перенести `AX_UI_ROADMAP_v0.2.md` и это ТЗ в `docs/`.
4. Создать релиз‑тег и краткие релиз‑ноуты (изменения по UX/доступности/перф).

---

**Конец ТЗ.** Выполнять по фазам; каждую фазу завершать отдельным PR с чек‑листом и скрин‑пруфами.
