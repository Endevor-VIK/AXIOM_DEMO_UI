
# AXIOM Panel — Итерация **v0.5 “RED-XS Density + Unified Preview + Cyber Ticker”**

**Все задачи: P0 (приоритет максимальный)**
**Файл:** `ax-design/AX_UI_ITERATION_v0.5.md`
**Основано на:** текущем состоянии ветки `feature/content-v2` и изменениях в:

* `app/routes/_layout.tsx`
* `app/routes/dashboard/page.tsx`
* `app/routes/login/page.tsx`
* `components/PreviewPane.tsx`
* `components/StatusLine.tsx`
* `components/Ticker.tsx`
* `ax-design/tokens.css`
* `ax-design/components.css`
* `styles/app.css`

---

## 0) Цель итерации

Выровнять интерфейс под глобальную компактность (**масштаб меньше по умолчанию**, без пользовательских «шестерёнок»), привести **все превью к единому UX**, разгрузить хедер, довести **Login / Dashboard / Content / News** до эталонного состояния. Тикер — **киберпанк-корп стиль** (плавный фирменный «информационный ряд»). Упор на аккуратную сетку, читабельность и анимации с учётом `prefers-reduced-motion`.

---

## 1) Базис: RED-XS плотность + упрощение хедера

### 1.1 Tokens (глобальная плотность)

**Файлы:** `ax-design/tokens.css`, `ax-design/components.css`, `styles/app.css`

* Ввести/уточнить базовый масштаб:

  ```css
  :root {
    --ax-scale: .90;           /* было 1.00 — делаем компактнее по умолчанию */
    --fs-14: 14px;
    --fs-15: 15px;             /* базовый текст */
    --fs-20: 20px;             /* заголовки вторички/меню */
    --line-md: 1.35;
    --btn-h: 34px;             /* компактные кнопки */
    --chip-h: 26px;            /* компактные чипы */
    --input-h: 36px;           /* поля ввода */
    --space-1: 4px;
    --space-2: 6px;
    --space-3: 8px;
    --space-4: 12px;
    --space-5: 16px;
  }
  ```
* Пройтись по общим атомам (`.ax-btn`, `.ax-chip`, `.ax-input`, `.ax-tab`, `.ax-card`) — умножить внутренние отступы и высоты на `var(--ax-scale)` или перевести на переменные высот выше.
* Убедиться, что **без браузерного зума** при 100% сайт визуально выглядит как наш «75%-макет» (за счёт внутренней плотности).

**DoD:** при 100% масштаб выглядит компактно, воздух появился, ничего не «кричит», отступы ровные.

### 1.2 Хедер, крошки, служебные «чипы»

**Файлы:** `app/routes/_layout.tsx`, `ax-design/components.css`, `styles/app.css`

* **Удалить бесполезные иконки** `A+`, `?`, `!` из топбара.
* Строку: `MODE :: RED PROTOCOL // SECTION :: ...` перенести **в StatusLine** (нижняя строка) или сделать компактным breadcrumb-рядом **под** главным меню (и скрывать на мобильных).
* Сократить вертикальные отступы топбара, привести заголовки меню к размеру `--fs-15/--fs-20`.
* Лого **AXIOM** сделать ссылкой на `/dashboard`.

**DoD:** верх стал лёгким; лишние элементы исчезли; подсекция видна, но не загромождает.

---

## 2) Unified Preview (общая рамка превью)

**Файлы:**

* Библиотека: `components/PreviewPane.tsx`, `ax-design/components.css`
* Роуты: `app/routes/dashboard/roadmap/page.tsx`, `app/routes/dashboard/audit/page.tsx`, интеграция в Content (ниже)

**Общие правила:**

* Единственная рамка превью с тулбаром, высота **72–78vh**, без двойных обводок.
* Кнопка **Open External** (если применимо) — справа; **Zoom 100/125/150%** — слева.
* **Download** целиком убрать (не нужен).

**Roadmap**

* Источник по умолчанию — `data/roadmap/index.html`.
* Таб «Source» показывать **только** если реально >1 источника.
* Левую панель/метаданные — убрать, сосредоточиться на **полноценном дереве** из `index.html` внутри превью.

**Audit**

* Текущий вид ок: **список слева** + выбранный отчёт справа в PreviewPane (или список сверху, превью ниже — выбираем тот, что уже реализован и удобен при плотности).
* Удалить всё, что намекает на «скачать».

**DoD:** Roadmap и Audit выглядят одинаково с точки зрения оболочки; никаких «урезанных» мини-окон.

---

## 3) Login (дожать до эталона)

**Файлы:** `app/routes/login/page.tsx`, `ax-design/components.css`, при необходимости `styles/app.css`

* Карточка 420–460px, `.ax-card.low`, паддинги `var(--space-5)`.
* Диск-эмблема: медленная 9s ротация, glow приглушить; отключать анимацию при `prefers-reduced-motion`.
* Поля: `min-height: var(--input-h)`, кнопки `min-height: var(--btn-h)`.
* Ошибки — компактно под инпутом, «шэйк» карточки 0.36s при неверном вводе.
* Подзаголовок в стиле “**RED PROTOCOL ACCESS GATEWAY**”, Blade-подчёркивание — как на референс-скринах.

**DoD:** карточка «собранная», без гигантизма; фокус-кольца, контраст AA, на мобиле не «ломается».

---

## 4) Dashboard (/dashboard)

**Файлы:** `app/routes/dashboard/page.tsx`, `ax-design/components.css`

* Сетка: `6/6` ≥1180px, `12/12` <1100px.
* **Control Status**: три «датчика» (Audit/Content/News) — крупная цифра, подпись, тонкая окружность (svg или css). Клики по датчику ведут в соответствующий раздел.
* **Latest Briefings**: заголовок, дата, тип (чип), описание, кнопка **Open** (ghost).
* Ряд кнопок снизу (Open Roadmap/Audit/Content/View News) — в одну строку, оборачивается красиво.

**DoD:** без ощущения «для слабовидящих», ровные колонки, аккуратные графы.

---

## 5) Content Hub (ре-дизайн и централизация превью)

**Файлы:**

* `app/routes/dashboard/content/_layout.tsx`
* (при наличии) `components/ContentCategoryTiles.tsx`, `components/ContentFilters.tsx`, `components/ContentPreview.tsx`
* либо интегрировать список+превью прямо в `_layout.tsx` поверх `PreviewPane`

**Задачи:**

* **Категории (Tiles) сверху**: сетка 3×2 (≥1180px), иконка, заголовок, счётчик. Пустые — чип `EMPTY` + подпись «Заполнится скоро». Клик по тайлу = быстрый фильтр.
* **Фильтры**: компактная одна строка (search | tag | status | lang | view), `flex-wrap` для узких экранов.
* **Список**: карточки контента (title/date/tags/summary) — кликабельные.
* **Превью снизу** (единое):

  * HTML — через `PreviewPane`/iframe, 72–78vh;
  * MD — безопасный рендер;
  * TXT — моно-шрифт, своя прокрутка.
  * Кнопка **Open source** (рядом с путём файла) — правее снизу карточки.

**DoD:** вход в Content = категории → фильтры → список → единая панель превью. Прокрутка удобная, без «мини-окон» и двойных скроллов.

---

## 6) News (карточки + **Cyber Ticker**)

**Файлы:** `app/routes/dashboard/news/page.tsx`, `components/Ticker.tsx`, `ax-design/components.css`

* **Карточки новостей**: единая шапка (title/date), компактные теги; `Open` выровнен справа внизу (ghost).
* **Тикер**:

  * Бесшовный marquee: список дублируется, CSS-анимация, **fade-маски** по краям.
  * Hover = `animation-play-state: paused`.
  * `prefers-reduced-motion` — отключить, показать статично.
  * Тип новости — цвет/иконка: `release` (⭐), `update` (🛈), и т.п.
  * Элементы тикера **кликабельны** → открывают запись.

**DoD:** бегущая строка современная, не «дёргается», читается и останавливается под курсором.

---

## 7) StatusLine (нижняя строка)

**Файлы:** `components/StatusLine.tsx`, `ax-design/components.css`

* Добавить crumb-чипы (Mode/Section/Route) — сюда, **убрав их из верхней перегруженной области**.
* Слева: ENV/ONLINE/Time; по центру: Route (укороченный), справа: версия.
* На мобильных — **автосокращение** (убрать часть чипов).

**DoD:** статусная строка информативна, но не мешает контенту, адаптивна.

---

## 8) Контрастность, фокусы, Motion

**Файлы:** `ax-design/components.css`, `styles/app.css`, атомы компонентов

* Все интерактивные (`.ax-btn`, `.ax-chip`, `.ax-input`, `.ax-tab`, `a`) — заметный `:focus-visible`.
* Контраст заголовков/подзаголовков ≥ 4.5:1.
* `prefers-reduced-motion` выключает: спин эмблемы, сдвиги кнопок, анимации тикера.

**DoD:** Lighthouse a11y ≥ 90, ручная проверка клавиатурой по всем маршрутам.

---

## 9) Чистка/рефакторинг по коду (точки входа)

* `app/routes/_layout.tsx`

  * Удалить A+/?!, перенести крошки в StatusLine.
  * Проверить sticky-позиционирование (чтобы верх не съедал высоту на мобилках).
* `components/Ticker.tsx`

  * Дублирование списка для бесшовности, hover pause, `reduced-motion`.
  * Клик по элементу → роут на `news/:id` (или scrollTo карточки).
* `components/PreviewPane.tsx`

  * Стандартизировать тулбар, высоту, убрать вторичные бордеры.
  * Публичные пропсы: `zoom`, `externalHref`, `leadingControls`, `reloadToken`.
* `app/routes/dashboard/roadmap/page.tsx`

  * Источник по умолчанию `data/roadmap/index.html`.
  * Таб выбора — только если >1.
  * Никаких “Download”.
* `app/routes/dashboard/audit/page.tsx`

  * Оставить список + единое превью; убрать «скачать».
  * Исправить любые «костыли» с regex путей.
* `app/routes/dashboard/content/_layout.tsx`

  * Категории → фильтры → список → `PreviewPane` снизу.
  * HTML/MD/TXT ветки отображения.
* `ax-design/tokens.css`, `ax-design/components.css`

  * Протянуть RED-XS переменные и размеры (см. §1).
  * Свести дубли и локальные «магические числа» в общие токены.
* `styles/app.css`

  * Убрать перезаписи, которые теперь покрываются токенами.
  * micro-fix’ы отступов и контраста.

---

## 10) Приёмка (DoD) по разделам

* **Login**: компактная карточка, шейк-анимация при ошибке, AA-контраст; мобилка ок.
* **Dashboard**: датчики кликабельны, правый блок ровный, кнопки в 1 строку, тикер вверху стабильный.
* **Roadmap**: открыт `data/roadmap/index.html`, единая рамка превью, нет двойных рамок/кнопки «скачать».
* **Audit**: список+превью; Zoom/External работают; нет «скачать».
* **Content**: тайлы категорий, фильтр-ряд, список карточек, **единая панель превью** снизу (HTML/MD/TXT).
* **News**: карточки ровные; тикер с кликом, паузой, `reduced-motion` учтён.
* **A11y**: фокусы везде; навигация с клавиатуры; Lighthouse a11y ≥ 90.

---

## 11) План работ и порядок

1. **M1 RED-XS**: токены + компоненты (кнопки/чипы/инпуты/карты) → плотность по всему UI.
2. **M2 Header/StatusLine**: вынос крошек вниз, чистка хедера, лого-линк.
3. **M3 Unified Preview**: довести Roadmap/Audit к одному виду, удалить Download.
4. **M4 Content Hub**: тайлы, фильтры, список, единая панель превью; правки верстки карточек.
5. **M5 News**: карточки и **кибер-тикер** (анимация/hover/ARIA).
6. **M6 A11y/Polish**: фокусы, контраст, `reduced-motion`, мелкие правки.
7. **QA**: Desktop 1920/1440, Tablet 1024/834, Mobile 390/360 (iOS/Android). Скрин-сеты 100% и 75% (сравнить плотность).

---

## 12) Комментарии по ревью (точечные рекомендации)

* **Сниппет для тикера (подход):**

  ```tsx
  // components/Ticker.tsx
  // Вёрстка: два подряд идентичных списка внутри трека
  <div className="ax-ticker" role="region" aria-label="Последние обновления">
    <div className="track">
      {items.map(renderItem)}
      {items.map(renderItem)} {/* дублируем для бесшовности */}
    </div>
  </div>
  ```

  ```css
  /* ax-design/components.css */
  .ax-ticker{overflow:hidden;mask-image:linear-gradient(90deg,transparent,black 6%,black 94%,transparent)}
  .ax-ticker .track{display:flex;gap:var(--space-4);animation:ticker 22s linear infinite}
  .ax-ticker:hover .track{animation-play-state:paused}
  @media (prefers-reduced-motion: reduce){.ax-ticker .track{animation:none}}
  @keyframes ticker{to{transform:translateX(-50%)}}
  ```

* **Сниппет для PreviewPane (единый тулбар):**

  ```tsx
  // components/PreviewPane.tsx (идея API)
  export function PreviewPane({ children, zoom=100, externalHref, leadingControls }: Props){
    return (
      <section className="ax-preview">
        <header className="ax-preview__bar">
          <div className="left">{leadingControls}</div>
          <div className="zoom">
            {[100,125,150].map(v => /* radio-like buttons */)}
          </div>
          {externalHref && <a className="ax-btn ghost" href={externalHref} target="_blank" rel="noreferrer">Open External ↗</a>}
        </header>
        <div className="ax-preview__frame" data-zoom={zoom}>{children}</div>
      </section>
    )
  }
  ```

  ```css
  .ax-preview{border-radius:16px;background:var(--ax-surface);box-shadow:0 0 0 1px var(--ax-border)}
  .ax-preview__bar{display:flex;justify-content:space-between;align-items:center;padding:var(--space-4) var(--space-5)}
  .ax-preview__frame{height:72vh;overflow:auto}
  .ax-preview__frame[data-zoom="125"]{zoom:1.25}
  .ax-preview__frame[data-zoom="150"]{zoom:1.5}
  ```

* **Чипы-крошки вниз (StatusLine) и чистка хедера:**
  Проверьте `app/routes/_layout.tsx`: удалить декоративные action-иконки; crumb-ряд снизу формировать из текущего `route`, `section`, `mode`.

---

## 13) Формат коммитов (коротко)

* `feat(tokens): RED-XS scale, compact heights for btn/chip/input`
* `feat(header): remove aux icons, move crumbs to StatusLine`
* `feat(preview): unify PreviewPane + apply to roadmap/audit, drop Download`
* `feat(content): tiles+filters, list -> unified preview (html/md/txt)`
* `feat(news): cyber ticker with pause/reduced-motion, card polish`
* `fix(a11y): focus-visible, contrast tune, mobile overflow`
* `chore: dedupe CSS overrides into ax-design/*`

---

## 14) Риски и их снятие

* **Регрессии плотности**: scope правок через ax-классы, не трогать легаси-селекторы без нужды.
* **Производительность тикера**: умеренная скорость, отключение на малых экранах/`reduced-motion`.
* **HTML-превью**: sandbox атрибуты для iframe, белый список параметров.

---

## 15) Результат итерации

* Компактный, аккуратный UI **по умолчанию** (без юзер-зумов).
* Единый опыт превью (Roadmap/Audit/Content).
* Кибер-тикер «корп-новостей» в духе Red Protocol.
* Упрощённый хедер, полезная StatusLine.
* A11y ≥ 90, без визуальных «перекачанных» блоков.

---

### Быстрые ссылки на ключевые файлы для ревью

* Хедер / навигация: `app/routes/_layout.tsx`
* Главная: `app/routes/dashboard/page.tsx`
* Логин: `app/routes/login/page.tsx`
* Превью-рамка: `components/PreviewPane.tsx`
* Нижняя строка статуса: `components/StatusLine.tsx`
* Тикер: `components/Ticker.tsx`
* Токены/компоненты: `ax-design/tokens.css`, `ax-design/components.css`
* Локальные правки: `styles/app.css`

---
