<!-- START AXIOM CONTENT -->

# `[11.02_WEB_CORE_ARCHITECTURE.md]` — **AXIOM\_DEMO\_UI • Архитектура & Компас действий (v1)**

> 🔹 CURRENT VERSION: v1.0
> 🔹 STATUS: DRAFT
> 🔹 DATE: 2025‑09‑06
> 🔹 ZONE: \[11\_SYSTEM\_INTERFACE > 11.02\_WEB\_CORE]
> 🔹 AXIOM\_META\_ID: `webcore-arch-v1`
> 🔹 COMMENT: Модульная архитектура сайта с терминальной загрузкой, строгим логином и мобильной адаптацией.

---

## 🔷 `BLOCK 00` — EXEC SUMMARY

* Цель: перейти от плоской SPA к модульной веб‑архитектуре на Vite + React + TS.
* Ключевые элементы: **TerminalBoot** → **Login** → **Main (protected)**; VFS‑снимки данных; gms‑render; export/redactor/whitelist.
* Фокус: мобильная адаптация, безопасность, масштабируемость, детерминированные сборки.

---

## 🔷 `BLOCK 01` — ДЕРЕВО КАТАЛОГОВ

```txt
Архитектура
AXIOM_DEMO_UI/
├─ app/                                           # входные точки/маршруты (Vite + React)
│  ├─ main.tsx                                    # C03
│  └─ routes/
│     ├─ _layout.tsx                              # C04 общий каркас (PanelNav/StatusLine/Ticker slot)
│     ├─ login/
│     │  └─ page.tsx                              # C11
│     └─ dashboard/                               # защищённая зона
│        ├─ page.tsx                              # C15 hub (табы: roadmap/audit/content/news)
│        ├─ roadmap/
│        │  └─ page.tsx                           # C16 iframe + VFS
│        ├─ audit/
│        │  └─ page.tsx                           # C17 audits manifest render
│        ├─ content/
│        │  └─ page.tsx                           # C18 content manifest (filter/sort)
│        └─ news/
│           └─ page.tsx                           # C19 news feed page
├─ components/
│  ├─ TerminalBoot.tsx                            # C10 пошаговый preload
│  ├─ AuthGate.tsx                                # C14 guard
│  ├─ PanelNav.tsx                                # C08 навигация/моб. меню
│  ├─ StatusLine.tsx                              # C07 gms-meta indicators
│  ├─ Ticker.tsx                                  # C22 top‑N последних news
│  ├─ NewsFeed.tsx                                # C21 список (пагинация/фильтр)
│  ├─ NewsCard.tsx                                # C20 типизированные карточки
│  ├─ GmsMeta.tsx                                 # вспомогательный вывод метаданных
│  └─ Form/
│     ├─ Input.tsx
│     └─ Button.tsx
├─ lib/
│  ├─ auth/
│  │  ├─ crypto.ts                                # C12 WebCrypto hash/verify
│  │  └─ index.ts                                 # C13 token/session API
│  ├─ vfs/
│  │  ├─ index.ts                                 # C09 чтение index/objects/logs
│  │  └─ adapters/
│  │     └─ gms-index.ts                          # адаптер GMS структуры
│  ├─ news/
│  │  ├─ schema.ts                                # C23 ajv/types
│  │  └─ index.ts                                 # C24 provider (manifest→records)
│  ├─ command-router/
│  │  ├─ index.ts                                 # C25 parser/dispatch
│  │  └─ commands/
│  │     ├─ news.ts                               # C26
│  │     └─ (заглушки future: search/meta/log)     # плановые
│  ├─ gms-render/
│  │  ├─ meta.ts                                  # форматирование мета‑секций
│  │  └─ blocks/                                  # специфические рендеры Canvas
│  ├─ telemetry/
│  │  └─ noop.ts                                  # PUBLIC no‑op
│  └─ utils/                                      # вспомогательные функции
├─ public/
│  ├─ assets/                                     # статические ресурсы (шрифты/иконки)
│  └─ data/
│     ├─ index.json
│     ├─ objects.json
│     ├─ logs.json
│     ├─ news/
│     │  ├─ manifest.json                         # список новостей (whitelist поля)
│     │  └─ items/                                # markdown/html карточки (по ссылкам)
│     ├─ content/
│     │  ├─ manifest.json                         # контент (technologies|factions|demo...)
│     │  └─ files/                                # *.md / *.html (iframe/md render)
│     └─ audits/
│        ├─ manifest.json
│        └─ html/                                 # audit HTML (sanitized)
├─ styles/
│  ├─ tokens.css                                  # C05 дизайн‑токены (палитра/типо)
│  ├─ app.css                                     # C06 base + layout адаптив
│  └─ red-protocol-overrides.css                  # итеративные override (из iteration plan)
├─ tools/
│  ├─ whitelist.json                              # C28 списки разрешённых полей/паттернов
│  ├─ redactor.ts                                 # C29 очистка секретов/путей
│  └─ export.ts                                   # C30 статический экспорт (/export)
├─ tests/
│  ├─ vfs.spec.ts                                 # C31
│  ├─ news.spec.ts                                # C32
│  └─ redactor.spec.ts                            # (проверка маскирования) 
├─ docs/                                          # документация/итерации
│  ├─ GETTING_STARTED.md                          # on‑boarding для dev
│  ├─ ITERATION_PLAN_AXIOM DEMO_UI_v1.0.md        # цикл задач (foundation/news/content)
│  ├─ AX_OPENAI_API_INTEGRATION_v0.1.md           # интеграция API (плановая)
│  └─ (прочие future docs)
├─ ax-design/
│  ├─ AX_UI_ITERATION_v0.5.md                     # визуальная итерация (RED‑XS)
│  └─ compat/
│     ├─ README_TEMP.md                           # временные заметки совместимости
│     └─ (ref_html_* assets)                      # HTML референсы (не билдятся)
├─ .github/
│  └─ workflows/
│     └─ export-web-core.yml                      # C33 CI: build→export→deploy
├─ legacy/
│  ├─ index.html                                  # C34 (депрекация после паритета)
│  └─ assets/js/app.js                            # C35 старая SPA логика (разбор)
├─ package.json                                   # C00
├─ vite.config.ts                                 # C01
├─ tsconfig.json                                  # C02
├─ README.md                                      # обновляемая дока запуска
└─ (generated) export/                            # артефакт экспорта (gitignore)
```

---

## 🔷 `BLOCK 02` — ТАБЛИЦА СТАТУСОВ (НОВОЕ / РЕДАКТИРУЕМ / НЕ ИЗМЕНЯЕМ)

**Легенда:** NEW — новое · EDIT — редактируем · KEEP — не изменяем (до миграции)

| Путь/Модуль                             | Роль                  | Статус | Примечание           |
| --------------------------------------- | --------------------- | ------ | -------------------- |
| `app/`                                  | Вход/маршруты         | NEW    | Каркас страниц       |
| `app/routes/login/page.tsx`             | Экран входа           | NEW    | Строгий логин        |
| `app/routes/dashboard/page.tsx`         | Главный экран         | NEW    | Защищённый доступ    |
| `app/routes/dashboard/news/page.tsx`    | Лента новостей        | NEW    | What's New           |
| `components/TerminalBoot.tsx`           | Терминальная загрузка | NEW    | Лог задач            |
| `components/AuthGate.tsx`               | Защита маршрутов      | NEW    | Проверка токена      |
| `components/PanelNav.tsx`               | Навигация             | NEW    | Мобильное меню       |
| `components/StatusLine.tsx`             | Статус/мета           | NEW    | GMS‑мета             |
| `components/NewsFeed.tsx`               | Лента                 | NEW    | Список + пагинация   |
| `components/NewsCard.tsx`               | Карточка              | NEW    | Типы: update/release |
| `components/Ticker.tsx`                 | Тикер                 | NEW    | Новое на сайте       |
| `lib/auth/*`                            | Аутентификация        | NEW    | Хэш пароля           |
| `lib/vfs/*`                             | Доступ к данным       | NEW    | Чтение снапшотов     |
| `lib/gms-render/*`                      | Рендер GMS            | NEW    | meta/blocks          |
| `lib/news/*`                            | Агрегатор новостей    | NEW    | Manifest → модели    |
| `lib/command-router/*`                  | Команды UI            | NEW    | help/ls/open         |
| `lib/command-router/commands/news.ts`   | Команда `news`        | NEW    | Вывод последних N    |
| `public/data/*`                         | Снимки данных         | EDIT   | Перенос из `/data`   |
| `public/data/news/*`                    | Данные ленты          | NEW    | manifest + items     |
| `public/data/content/*`                 | Контент (HTML/MD)     | NEW    | категории: demo/tech/factions |
| `public/data/audits/*`                  | Аудитовые HTML        | NEW    | iframe preview       |
| `styles/tokens.css`                     | Дизайн‑токены         | NEW    | Red Protocol         |
| `styles/app.css`                        | Базовые стили         | EDIT   | Адаптив              |
| `tools/whitelist.json`                  | Белый список          | NEW    | Без секретов         |
| `tools/redactor.ts`                     | Редактор публикации   | NEW    | Маскирование         |
| `tools/export.ts`                       | Экспорт витрины       | NEW    | `/export` билд       |
| `.github/workflows/export-web-core.yml` | CI публикации         | NEW    | Pages                |
| `index.html` (legacy)                   | Старый вход           | EDIT   | Депрекация           |
| `assets/js/app.js` (legacy)             | Логика SPA            | EDIT   | Разбор на модули     |
| `tests/news.spec.ts`                    | Тесты ленты           | NEW    | Схема/рендер         |
| `README.md`                             | Документация          | EDIT   | Обновить разделы     |

> Табличные «Примечания» — короткие фразы; детали ниже.

---

## 🔷 `BLOCK 03` — ПОЯСНЕНИЯ К НОВЫМ ДЕТАЛЯМ

* **TerminalBoot.tsx**: экран предварительной загрузки. Выполняет задачи: чтение `public/data/*`, проверка наличия манифестов, инициализация дизайн‑токенов, прогрев кэша, сбор метрик (no‑op в PUBLIC). Показывает пошаговый лог (OK/FAIL), после успеха — переход к `login`.
* **Auth (lib/auth)**: строгий вход по логину/паролю. Пароли хэшируются. В PUBLIC — mock‑хранилище (`users.json`), в PRO — серверless API/Workers. Токен хранится в `localStorage`/cookie.
* **AuthGate**: HOC/компонент‑обёртка. Без токена перенаправляет на `/login`.
* **VFS (lib/vfs)**: слой чтения снапшотов (`index.json`, `objects.json`, `logs.json`) как дерева `00..19`. Единая точка данных для страниц и поиска.
* **gms‑render**: функции отображения шапки/мета/статуса, счётчик PLACEHOLDER, ссылки на 00\_NAVIGATION.
* **command‑router**: маршрутизация пользовательских команд (help/ls/open/search/meta/log/about://public). В PUBLIC — только чтение.
* **tools/**: `whitelist.json` описывает разрешённые поля/файлы; `redactor.ts` вычищает секреты и пути; `export.ts` готовит статический артефакт `/export` для публикации.
* **Design tokens**: `tokens.css` — палитра, типографика, тени; единая база для адаптива.
* **News Feed**: маршрут `/dashboard/news`, компоненты `NewsFeed/NewsCard/Ticker`, данные в `public/data/news/*`. Манифест новостей описывает элементы ленты: `id`, `date`, `title`, `kind` (`update|release|roadmap|heads-up`), `tags`, `summary`, `link`. Пример:

```json
[
  {
    "id": "2025-09-06-webcore",
    "date": "2025-09-06",
    "title": "WEB CORE: старт работ",
    "kind": "update",
    "tags": ["webcore","release"],
    "summary": "Инициализация архитектуры, терминальная загрузка, строгий логин.",
    "link": "/dashboard/news/2025-09-06-webcore"
  }
]
```
* **Content Manifest (`public/data/content/manifest.json`)**: массив объектов. Базовые поля: `title`, `date`, `tags?`, `file`, опционально: `category`, `subCategory`, `id`, `summary`, `status`, `visibility`, `weight`, `lang`, `links[]`, `meta{}`.
  - Присутствуют демо‑элементы и placeholder записи (например, технология и фракция с `status: published` / `category: technologies|factions`).
  - HTML/MD файлы рендерятся через iframe (HTML) или прямую загрузку (MD — позже unified renderer).
* **Категории контента (расширяемость)**: `technologies`, `factions`, `demo`. План: унифицированный тип для фильтрации в дальнейшем `/dashboard/content`.
* **Audits (`public/data/audits/*`)**: манифест + отдельные HTML (iframe). Используются для smoke‑валидаций структуры и будущего валидатора (упоминание внутри demo audit файла).

---

## 🔷 `BLOCK 04` — ШАГИ ВНЕДРЕНИЯ (КОМПАС)

1. **Бранч**: `feat/webcore-v1`.
2. **Инициализация стека**: Vite + React + TypeScript; базовые скрипты `dev/build/preview`.
3. **Структура**: создать каталоги из `BLOCK 01`.
4. **Миграция статики**: перенести `/data` → `public/data`, `/assets` → `public/assets`. Обновить пути.
5. **TerminalBoot**: реализовать список задач, пошаговый лог, авто‑переход к `/login`.
6. **Auth**: форма логина (без подсказок), регистрация, хэш пароля, токен, `AuthGate` для `/dashboard/*`.
7. **Main (dashboard)**: вкладки Roadmap/Audit/Content/**News**; интегрировать VFS/gms‑render; добавить **Ticker** («Что нового») в хедере; команда `news` в command‑router.
8. **Мобильный UI**: медиазапросы, жесты для вкладок, минимальные тач‑таргеты ≥ 44px.
9. **Поиск и meta**: команды `search/meta` на основе индексов VFS.
10. **Инфраструктура сборки**: `whitelist.json` → `redactor.ts` → `export.ts`; добавить CI `export-web-core.yml`.
11. **Тесты**: `vfs.spec.ts`, `redactor.spec.ts`; e2e навигации позже.
12. **Документация**: обновить `README.md` (запуск, режимы, данные, ограничения PUBLIC/PRO).
13. **Депрекация legacy**: оставить `index.html`/`assets/js/app.js` до паритета, затем удалить.

---

## 🔷 `BLOCK 05` — МОБИЛЬНАЯ ОПТИМИЗАЦИЯ

* Viewport‑meta, fluid‑layout, CSS‑grid/flex.
* Lazy‑loading тяжёлых панелей; изоляция анимаций (will‑change).
* Клавиатурные и тач‑жесты; крупные кликабельные области.
* Предзагрузка шрифтов; системные fallback‑шрифты.
* Виртуализация списка новостей (100+ элементов): windowing, lazy‑images, skeleton‑карточки.

---

## 🔷 `BLOCK 06` — БЕЗОПАСНОСТЬ И РЕЖИМЫ

* PUBLIC: только чтение; mock‑auth; запрет мутаций; redaction/whitelist в export.
* PRO: серверless‑login, KV‑кэш, API только чтение; feature‑flags.
* Общие правила: никакой секретики в снапшотах; относительные пути; маскирование токенов.
* **News**: whitelist полей `id,date,title,kind,tags,summary,link`.
* **Content**: whitelist (минимум для PUBLIC экспорта) — `title,date,tags?,file,category?,subCategory?,summary?,lang?,status?,weight?`.
* **Audits**: HTML проходит sanitization (strip script/style вне allowlist) перед публикацией (этап в `redactor.ts` — запланировано).
* Внешние ссылки: только из allowlist (в будущем раздел в `tools/whitelist.json`).

---

## 🔷 `BLOCK 07` — ACCEPTANCE

* Login без подсказок; вход только по логину/паролю.
* Защищённые маршруты: прямой переход в main невозможен без токена.
* TerminalBoot показывает полный лог загрузки и завершает за ≤ 3 сек (на desktop).
* Мобильная вёрстка устойчива (до ширины 360px).
* Билд `/export` детерминирован; CI публикует Pages без утечек.
* Лента новостей: сортировка по дате (DESC), фильтр по `kind`, deeplink на карточки, **Ticker** показывает 1–3 последних записи.

---

## 🔷 `BLOCK 08` — ПРАВИЛА (HOW WE SHIP)

* 1 Canvas = 1 файл/скрипт (или 1 компонент), **атомарные шаги**.
* Ветки: `feat/webcore-v1` (основная) → PR‑инкременты `Cxx/<name>`.
* Формат Canvas‑имени: `Cxx__path.to.file` (пример: `C03__app/main.tsx`).
* Commit‑префикс: `Cxx:` + краткое действие (init/fix/test/refactor).
* DoD (Definition of Done): код + краткая дока в Canvas + запуск/тест (если применимо) + отметка статуса в очереди.

---

## 🔷 `BLOCK 09` — ОЧЕРЕДЬ СКРИПТОВ (NEW/EDIT/KEEP)

**Статусы:** `TODO`, `WIP`, `READY`, `BLOCKED`.
**Легенда:** NEW — новое; EDIT — редактируем; KEEP — не трогаем (до миграции).

| ID  | Путь                                    | Роль                                | Статус | Тип  | Примечание                    |
| --- | --------------------------------------- | ----------------------------------- | ------ | ---- | ----------------------------- |
| C00 | `package.json`                          | Скрипты/зависимости (Vite+React+TS) | TODO   | NEW  | базовая оболочка, lint/format |
| C01 | `vite.config.ts`                        | Конфиг Vite                         | TODO   | NEW  | алиасы, assets, base          |
| C02 | `tsconfig.json`                         | TS базовая конфигурация             | TODO   | NEW  | strict, paths                 |
| C03 | `app/main.tsx`                          | Вход приложения                     | TODO   | NEW  | mount + Router                |
| C04 | `app/routes/_layout.tsx`                | Общий лэйаут                        | TODO   | NEW  | PanelNav/StatusLine           |
| C05 | `styles/tokens.css`                     | Дизайн‑токены                       | TODO   | NEW  | Red Protocol                  |
| C06 | `styles/app.css`                        | Базовые стили                       | TODO   | EDIT | адаптив/reset                 |
| C07 | `components/StatusLine.tsx`             | Статус/мета                         | TODO   | NEW  | gms‑индикация                 |
| C08 | `components/PanelNav.tsx`               | Навигация                           | TODO   | NEW  | mobile menu                   |
| C09 | `lib/vfs/index.ts`                      | Чтение снапшотов                    | TODO   | NEW  | index/objects/logs            |
| C10 | `components/TerminalBoot.tsx`           | Терминальная загрузка               | TODO   | NEW  | лог задач + переход           |
| C11 | `app/routes/login/page.tsx`             | Экран входа                         | TODO   | NEW  | строгий логин                 |
| C12 | `lib/auth/crypto.ts`                    | Хэш/verify                          | TODO   | NEW  | webcrypto                     |
| C13 | `lib/auth/index.ts`                     | Локальная auth                      | TODO   | NEW  | токен + storage               |
| C14 | `components/AuthGate.tsx`               | Guard маршрутов                     | TODO   | NEW  | редирект на /login            |
| C15 | `app/routes/dashboard/page.tsx`         | Main (protected)                    | TODO   | NEW  | shell + tabs                  |
| C16 | `app/routes/dashboard/roadmap/page.tsx` | Roadmap                             | TODO   | NEW  | iframe+vfs                    |
| C17 | `app/routes/dashboard/audit/page.tsx`   | Audit                               | TODO   | NEW  | manifest render               |
| C18 | `app/routes/dashboard/content/page.tsx` | Content                             | TODO   | NEW  | manifest render               |
| C19 | `app/routes/dashboard/news/page.tsx`    | News                                | TODO   | NEW  | лента новостей                |
| C20 | `components/NewsCard.tsx`               | Карточка новости                    | TODO   | NEW  | виды: update/release          |
| C21 | `components/NewsFeed.tsx`               | Список новостей                     | TODO   | NEW  | пагинация/filters             |
| C22 | `components/Ticker.tsx`                 | Тикер «Что нового»                  | TODO   | NEW  | top‑3 последних               |
| C23 | `lib/news/schema.ts`                    | JSON‑схема новостей                 | TODO   | NEW  | ajv/types                     |
| C24 | `lib/news/index.ts`                     | Провайдер новостей                  | TODO   | NEW  | manifest→items                |
| C25 | `lib/command-router/index.ts`           | Роутер команд                       | TODO   | NEW  | help/ls/open                  |
| C26 | `lib/command-router/commands/news.ts`   | Команда `news`                      | TODO   | NEW  | вывод N последних             |
| C27 | `public/data/*`                         | Перенос снапшотов                   | TODO   | EDIT | из `/data` (legacy)           |
| C28 | `tools/whitelist.json`                  | Белый список                        | TODO   | NEW  | редактор публикации           |
| C29 | `tools/redactor.ts`                     | Маскирование                        | TODO   | NEW  | secret/paths scrub            |
| C30 | `tools/export.ts`                       | Сборка `/export`                    | TODO   | NEW  | статический билд              |
| C31 | `tests/vfs.spec.ts`                     | Тесты VFS                           | TODO   | NEW  | snapshot/paths                |
| C32 | `tests/news.spec.ts`                    | Тесты новостей                      | TODO   | NEW  | схема/рендер                  |
| C33 | `.github/workflows/export-web-core.yml` | CI Pages                            | TODO   | NEW  | build→export→deploy           |
| C34 | `index.html` (legacy)                   | Старый вход                         | TODO   | EDIT | депрекация                    |
| C35 | `assets/js/app.js` (legacy)             | Демо‑логика                         | TODO   | EDIT | разбор/удаление               |

---

## 🔷 `BLOCK 10` — ПОЯСНЕНИЯ К КЛЮЧЕВЫМ УЗЛАМ

* **TerminalBoot.tsx (C10)** — выводит пошаговый лог: preload токенов, загрузка `public/data/*`, проверка манифестов, warm‑up. Успех → `navigate('/login')`.
* **Auth (C12–C14)** — регистрация+вход; пароли хэшируются (WebCrypto); хранение токена `localStorage`/cookie; `AuthGate` блокирует доступ к `/dashboard/*`.
* **News (C19–C24)** — `news/manifest.json` (id, date, title, kind, tags, summary, link) + `items/*`. Рендер в `NewsFeed` (виртуализация позже); `Ticker` на layout.
* **Content Provider (добавлено)** — чтение `content/manifest.json`, нормализация записей (унификация дат, сортировка по `weight|date DESC`), фильтр по категориям; iframe/MD стратегия рендера.
* **VFS (C09)** — единый источник данных (index/objects/logs) + быстрый кэш.
* **Command Router (C25–C26)** — `help|ls|open|search|meta|log|news` (read‑only в PUBLIC).
* **Export/Redactor (C28–C30)** — `/export` артефакт; очистка секретов, абсолютных путей; применяются whitelist фильтры (включая разделы news/content/audits).

---

## 🔷 `BLOCK 11` — DELTA / CHANGELOG (АРХИТЕКТУРНЫЕ ОБНОВЛЕНИЯ)

| Версия | Дата       | Изменение                                                                 |
|--------|------------|----------------------------------------------------------------------------|
| v1.0   | 2025-09-06 | Первичная структура, очереди Canvas, News/Audit/Content базовые манифесты |
| v1.0a  | 2025-09-06 | Добавлены схемные уточнения: Content categories, whitelist поля, Block 13  |
| v1.0b  | 2025-09-06 | Security расширен (content/audits), добавлен Content Provider в Block 10   |

> Следующие плановые deltas: v1.1 — Command Router расширение (`search/meta`), v1.2 — виртуализация ленты, v1.3 — экспорт + redaction pipeline.

---

## 🔷 `BLOCK 12` — СВЯЗАННЫЕ ФАЙЛЫ / ДОПОЛНИТЕЛЬНЫЕ ИСТОЧНИКИ

| Файл | Роль | Связь с архитектурой |
| ---- | ---- | -------------------- |
| `docs/GETTING_STARTED.md` | On‑boarding | Базовое описание запуска окружения и подготовки данных (`public/data/*`). |
| `docs/ITERATION_PLAN_AXIOM DEMO_UI_v1.0.md` | План итераций | Декомпозиция циклов (Cycle 0 Foundation, Cycle 1 News, Cycle 2 Content); источник задач C0–C2. |
| `docs/AX_OPENAI_API_INTEGRATION_v0.1.md` | Интеграция API | Планируемый модуль расширения (будущий слой assistant/AI hints) — не входит в v1 scope. |
| `ax-design/AX_UI_ITERATION_v0.5.md` | UI итерация (RED‑XS) | Определяет визуальные токены и цели плотности; синхронизация с `styles/tokens.css` и overrides. |
| `ax-design/compat/README_TEMP.md` | Совместимость / временные заметки | Источник временных решений и ограничений до полной миграции ref_html.* |
| `ax-design/compat/ref_html_*.md/html` | Исторические референсы | Используются для верификации рендера (roadmap/audit previews) — не деплоятся напрямую. |

### 12.1 Назначение блока

Собрать внешние (к архитектуре) документы, влияющие на:
1. Формирование задач очереди (итерационные планы).
2. Визуальные решения (UI iteration).
3. Будущие расширения (API/assistant интеграции).
4. Совместимость и миграцию legacy HTML.

### 12.2 Политика актуализации

* Изменения в docs/* → отражаются в следующих версиях DELTA (BLOCK 11).
* Любое добавление полей данных сначала фиксируется в `ITERATION_PLAN...` → затем whitelist → реализация.
* Архивные файлы в `ax-design/compat/` не модифицируются; при миграции создаётся новый Canvas вместо правки legacy.

### 12.3 Переход в будущие версии

| Область | Триггер | Действие |
| ------- | ------- | -------- |
| AI Integration | Старт v1.4 | Добавить lib/ai/, конфиг rate‑limits, security review. |
| UI Tokens Evolution | Завершение v1.1 | Выделить `tokens.css` генерацию (build step). |
| Legacy Cleanup | Экспорт стабилен | Удалить `legacy/` + соответствующие Canvas C34/C35. |

---

**CREATOR × AXIOM** — 2025

<!-- END AXIOM CONTENT -->
