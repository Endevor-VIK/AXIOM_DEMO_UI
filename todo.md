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
├─ app/                                   # входные точки/маршруты UI
│  ├─ main.tsx
│  └─ routes/
│     ├─ login/
│     │  └─ page.tsx
│     ├─ dashboard/
│     │  ├─ page.tsx
│     │  ├─ audit/
│     │  │  └─ page.tsx
│     │  ├─ content/
│     │  │  └─ page.tsx
│     │  ├─ news/
│     │  │  └─ page.tsx
│     │  └─ roadmap/
│     │     └─ page.tsx
│     └─ _layout.tsx
├─ components/
│  ├─ TerminalBoot.tsx
│  ├─ PanelNav.tsx
│  ├─ StatusLine.tsx
│  ├─ GmsMeta.tsx
│  ├─ AuthGate.tsx
│  ├─ NewsFeed.tsx
│  ├─ NewsCard.tsx
│  ├─ Ticker.tsx
│  └─ Form/
│     ├─ Input.tsx
│     └─ Button.tsx
├─ lib/
│  ├─ auth/
│  │  ├─ index.ts
│  │  └─ crypto.ts
│  ├─ command-router/
│  │  ├─ index.ts
│  │  └─ commands/*.ts
│  ├─ news/
│  │  ├─ index.ts
│  │  └─ schema.ts
│  ├─ vfs/
│  │  ├─ index.ts
│  │  └─ adapters/gms-index.ts
│  ├─ gms-render/
│  │  ├─ meta.ts
│  │  └─ blocks/*
│  ├─ telemetry/
│  │  └─ noop.ts
│  └─ utils/
├─ public/
│  ├─ assets/
│  └─ data/
│     ├─ index.json
│     ├─ objects.json
│     ├─ logs.json
│     ├─ audits/manifest.json
│     ├─ content/manifest.json
│     └─ news/
│        ├─ manifest.json
│        └─ items/                 # markdown/html карточки новостей
├─ styles/
│  ├─ tokens.css
│  └─ app.css
├─ tools/
│  ├─ whitelist.json
│  ├─ redactor.ts
│  └─ export.ts
├─ tests/
│  ├─ vfs.spec.ts
│  ├─ news.spec.ts
│  └─ redactor.spec.ts
├─ .github/workflows/
│  └─ export-web-core.yml
├─ package.json
├─ vite.config.ts
└─ README.md
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
* **News**: whitelist только полей (`id,date,title,kind,tags,summary,link`); очистка HTML в `news/items/*` (strip XSS); внешние ссылки — только из allowlist.

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
* **News (C19–C24)** — `news/manifest.json` (id, date, title, kind, tags, summary, link) + `items/*`. Рендер в `NewsFeed` с виртуализацией и фильтрами; `Ticker` на layout.
* **VFS (C09)** — единый источник данных для вкладок; синхронная и асинхронная загрузка с кэшированием.
* **Command Router (C25–C26)** — поддержка терминальных команд (`help`, `ls`, `open`, `search`, `meta`, `log`, `news`). В PUBLIC — read‑only.
* **Export/Redactor (C28–C30)** — детерминированный артефакт `/export`; маскирование секретов и абсолютных путей; whitelist.

---

## 🔷 `BLOCK 11` — СТАРТ (ПЕРВЫЕ 5 CANVAS)

1. **C00 — `package.json`**: deps — `react`, `react-dom`, `typescript`, `vite`, `@types/react*`; scripts — `dev`, `build`, `preview`, `lint`, `format`.
2. **C01 — `vite.config.ts`**: alias `@/*` → `src`/корень `./`; настройка `base`, assets, HMR.
3. **C02 — `tsconfig.json`**: `strict: true`, `jsx: react-jsx`, `paths: {"@/*":["./*"]}`.
4. **C03 — `app/main.tsx`**: React root, Router, провайдеры (темы/ошибки), mount.
5. **C04 — `app/routes/_layout.tsx`**: оболочка Dashboard с `PanelNav`, `StatusLine`, `Ticker`.

> После `C04` — быстрый smoke‑ран: рендер лэйаута с пустыми заглушками.

---

## 🔷 `BLOCK 12` — ACCEPTANCE / DONE

* Каждый Canvas содержит: цель, краткую доку, код, мини‑тест/проверку, чеклист мобильной вёрстки (если UI).
* В таблице очереди обновляем `Статус` → `READY` после ревью.
* Возврат к legacy (`index.html`, `assets/js/app.js`) только для паритета; затем депрекация.

---

**CREATOR × AXIOM** — 2025

<!-- END AXIOM CONTENT -->
