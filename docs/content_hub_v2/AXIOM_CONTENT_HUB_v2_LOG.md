<!--docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_LOG.md-->

<!-- AXIOM_AGENT_LOG_START -->
# AXIOM CONTENT HUB v2 — LOG

- Spec file: `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_SPEC.md`
- Log file: `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_LOG.md`
- Agent: Codex
- Started: 2025-11-29 02:15 (MSK)
- Finished: —
- Spec version: v1.0

## GLOBAL STATUS

| Block | Name                    | Status | Comment |
|-------|-------------------------|--------|---------|
| A     | Data & Sources          | DONE   | контент-src + HTML + индекс готовы |
| B     | Content Build Script    | DONE   | build:content + full build успешны на Linux |
| C     | Content Hub UI          | DONE   | v2 UI и роутинг готовы |
| D     | Reader UI               | DONE   | Reader v1 реализован |
| E     | Migration & Cleanup     | IN_PROGRESS | удалены legacy content-файлы, build-проверка в работе |
| F     | QA & Final Confirmation | IN_PROGRESS | build выполнен; нужны визуальные проверки/QA |

## STEP: 0.1 · Baseline audit and log setup

- Status: DONE
- Date: 2025-11-29 02:15 (MSK)
- Description:
  Прочитал SPEC целиком, подготовил структуру лога и зафиксировал текущую архитектуру старого CONTENT: маршруты `/dashboard/content/*` (файлы `app/routes/dashboard/content/_layout.tsx`, `AllRoute.tsx`, `CategoryRoute.tsx`, `LoreRoute.tsx`, `ReadRoute.tsx`, `ContentCategoryView.tsx`, `context.tsx`), связанные компоненты (`components/ContentList.tsx`, `components/ContentFilters.tsx`, `components/ContentPreview.tsx`, `components/PreviewPane.tsx`, `components/content/*`), данные VFS (`lib/vfs/**`, `public/data/content/**` включая `manifest.json`, категорийные манифесты и файлы `CHR-VIKTOR-0301`, `CHR-AXIOM-0303`), а также дизайн-референсы (`ax-design/preview/*.html`, `ax-design/reader/READER_VIEW.html`).

**Files created:**
- нет

**Files changed:**
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_LOG.md` — добавлена шапка лога, глобальный статус и первая запись аудита.

**Files removed:**
- нет

**Notes:**
- Текущий build-скрипт контента отсутствует; `package.json` содержит только Vite-сборку и инструменты VFS. CONTENT опирается на `public/data/content/...` и `lib/vfs`.

**Problems / Risks:**
- нет

## STEP: A.1–A.3 / B.1–B.3 · Данные контента и скрипт сборки

- Status: DONE
- Date: 2025-11-29 02:30 (MSK)
- Description:
  Созданы исходники в `content-src` (AXIOM, VIKTOR, шаблоны локации/персонажа/технологии/фракции/события) с полным front-matter, добавлен скрипт `scripts/build-content.ts`, который рендерит Markdown → `public/content-html/*` и собирает индекс `src/features/content/data/content-index.json`. Добавлен devDependency `gray-matter`, обновлены npm-скрипты (`build:content`, обновлён `build`). Сборка контента выполнена через `node.exe node_modules/tsx/dist/cli.mjs scripts/build-content.ts` из-за ограничений UNC-пути в Windows npm.

**Files created:**
- `content-src/01.01_CENTRAL_NODE.md`
- `content-src/03.00_CHARACTER_TEMPLATE.md`
- `content-src/03.01_VIKTOR.md`
- `content-src/03.03_AXIOM.md`
- `content-src/04.00_TECH_TEMPLATE.md`
- `content-src/05.00_FACTION_TEMPLATE.md`
- `content-src/06.00_EVENT_TEMPLATE.md`
- `scripts/build-content.ts`
- `public/content-html/01.01_CENTRAL_NODE.html`
- `public/content-html/03.00_CHARACTER_TEMPLATE.html`
- `public/content-html/03.01_VIKTOR.html`
- `public/content-html/03.03_AXIOM.html`
- `public/content-html/04.00_TECH_TEMPLATE.html`
- `public/content-html/05.00_FACTION_TEMPLATE.html`
- `public/content-html/06.00_EVENT_TEMPLATE.html`
- `src/features/content/data/content-index.json`

**Files changed:**
- `package.json` — добавлен скрипт `build:content`, обновлён `build`, добавлена зависимость `gray-matter`.
- `package-lock.json` — зафиксирована новая зависимость `gray-matter`.
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_SPEC.md` — отмечены чек-листы блоков A и B (подзадачи выполненных шагов).
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_LOG.md` — обновлён статус, добавлена запись шага.

**Files removed:**
- нет

**Notes:**
- Формат ошибок скрипта: `[build-content] <file>: field "<...>" ...` или `Duplicate id/slug`, с немедленным `process.exit(1)`.
- `npm run build:content` из Windows npm ломается на UNC (`\\wsl$`) путях; рабочий обход — запуск `node.exe node_modules/tsx/dist/cli.mjs scripts/build-content.ts`. Рассмотреть установку Linux Node или вызов через `node_modules/.bin/tsx` в CI.
- Пакет `@types/gray-matter` отсутствует в реестре; типы предоставляет сам `gray-matter`.

**Problems / Risks:**
- Среда Windows npm не запускает скрипты по UNC-пути; сборку контента запускал напрямую через `node.exe`. Нужно учесть при автоматизации/CI.

## STEP: C.1–C.4 · Content Hub UI и роутинг

- Status: IN_PROGRESS
- Date: 2025-11-29 02:36 (MSK)
- Description:
  Реализованы UI-компоненты Content HUB v2 (`ContentSidebar`, `ContentPreview`) и страница `ContentHubPage`, подключён новый стиль (`styles/content-hub-v2.css`) и типы данных. Обновлён роут `/dashboard/content` на новый ContentHubPage, добавлен редирект `/dashboard/content/all` → `/dashboard/content`. Кнопка “Open source” ведёт на `/content/:id` (Reader добавлю следующим шагом).

**Files created:**
- `src/features/content/types.ts`
- `src/features/content/components/ContentSidebar.tsx`
- `src/features/content/components/ContentPreview.tsx`
- `src/features/content/pages/ContentHubPage.tsx`
- `styles/content-hub-v2.css`

**Files changed:**
- `app/main.tsx` — маршрут CONTENT теперь рендерит `ContentHubPage`, добавлен редирект с `/dashboard/content/all`.
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_SPEC.md` — отмечены пункты блока C (кроме перехода в READER).
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_LOG.md` — обновлён статус блока C и добавлена запись шага.

**Files removed:**
- нет

**Notes:**
- Контент-список фильтруется по id/title/tags, выбранный id пишется в query `?id=` для возврата к нужной карточке.
- Превью следует референсу `ax-design/preview`, адаптив до <980px превращает сплит в столбец.
- Переходы в READER ведут на `/content/:id`; маршрут реализован в шаге D.

**Problems / Risks:**
- нет (маршрут READER добавлен в шаге D).

## STEP: D.1–D.4 · Reader UI и маршрут `/content/:id`

- Status: DONE
- Date: 2025-11-29 02:36 (MSK)
- Description:
  Добавлен `ReaderPage` с дизайном из `ax-design/reader/READER_VIEW.html`: шапка с кнопкой Back, гамбургером и метаданными, левое меню с поиском по id/title/tags, загрузка HTML из `public/content-html/<id>.html` со стейтами (LOADING/ошибка/контент). В роутере добавлен защищённый маршрут `/content/:id` и редирект со старого `/dashboard/content/read/:id` на новый. Общие стили вынесены в `styles/content-hub-v2.css`, добавлен helper `withBasePath` для корректных путей с `BASE_URL`.

**Files created:**
- `src/features/content/pages/ReaderPage.tsx`
- `src/features/content/utils.ts`
- `app/routes/dashboard/content/LegacyReadRedirect.tsx`

**Files changed:**
- `app/main.tsx` — добавлен маршрут `/content/:id` под `AuthGate`, редирект `/dashboard/content/read/:id` → `/content/:id`.
- `styles/content-hub-v2.css` — добавлены стили Reader (`axr-*`).
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_SPEC.md` — закрыты пункты блока D.
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_LOG.md` — обновлён статус блоков и добавлена запись шага.

**Files removed:**
- нет

**Notes:**
- Reader загружает HTML по `BASE_URL + /content-html/<id>.html`; 404/ошибка выводятся в теле с кнопкой возврата в CONTENT.
- Меню закрывается при выборе файла на мобильных; поиск работает по id/title/tags.
- Кнопка Back возвращает на `/dashboard/content?id=<id>` для сохранения выбранного элемента в хабе.

**Problems / Risks:**
- Полный `npm run build` не прогонялся из-за UNC-ограничений Windows npm (см. шаг B); проверка сборки и e2e предстоит.

## STEP: E.1–E.3 · Очистка legacy CONTENT

- Status: IN_PROGRESS
- Date: 2025-11-29 02:36 (MSK)
- Description:
  Удалена старая реализация CONTENT (`/dashboard/content/*` маршруты, списки/фильтры/тайлы/старое превью), оставлен только редирект `LegacyReadRedirect` для совместимости. Обновлён чек-лист блока E в SPEC.

**Files created:**
- нет

**Files changed:**
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_SPEC.md` — отмечены задачи по блоку E (очистка).
- `docs/content_hub_v2/AXIOM_CONTENT_HUB_v2_LOG.md` — добавлен шаг очистки, статус блока E.
- `vite.config.ts` — удалён BOM для корректного парсинга конфигурации.

**Files removed:**
- `app/routes/dashboard/content/_layout.tsx`
- `app/routes/dashboard/content/AllRoute.tsx`
- `app/routes/dashboard/content/CategoryRoute.tsx`
- `app/routes/dashboard/content/ContentCategoryView.tsx`
- `app/routes/dashboard/content/LoreRoute.tsx`
- `app/routes/dashboard/content/ReadRoute.tsx`
- `app/routes/dashboard/content/context.tsx`
- `components/ContentFilters.tsx`
- `components/ContentList.tsx`
- `components/ContentPreview.tsx`
- `components/ContentCategoryTiles.tsx`
- `components/ContentCardExpanded.tsx`
- `components/content/CategoryStats.tsx`
- `components/content/CategoryTiles.tsx`
- `components/content/category-stats.css`
- `components/content/category-tiles.css`

**Notes:**
- Главный контент-маршрут теперь опирается только на `ContentHubPage`/`ReaderPage`.
- LegacyReadRedirect остаётся для перенаправления старого `/dashboard/content/read/:id` на новый `/content/:id`.

**Problems / Risks:**
- Полный build/тесты ещё не прогнаны; `tsc --noEmit` падает на ранее существующих ошибках в `lib/analytics`, `lib/hybrid/prefixStyles.ts` и e2e ассистента (`tests/e2e/accessibility.spec.ts`), не затрагивал в рамках очистки. Попытка `vite build` через Windows node на UNC-пути завершилась ошибкой externalize-deps (не резолвятся `vite`/`@vitejs/plugin-react`), требуется локальная сборка в среде без UNC.

## STEP: B.3.4 · Linux reinstall и успешный build

- Status: DONE
- Date: 2025-11-29 03:04 (MSK)
- Description:
  Установил nvm + Node.js v22.21.1 в WSL, удалил Windows-артефакты `node_modules` и переустановил зависимости под Linux. Выполнил `npm run build:content` и полный `npm run build` — оба успешно на Linux (UNC-проблемы устранены).

**Files created:**
- нет

**Files changed:**
- `package-lock.json` — обновлён после Linux `npm install`.
- `node_modules/.package-lock.json` — сохранено текущее состояние.
- `node_modules/.bin/loose-envify` — теперь Linux-ссылка; удалены Windows-обёртки `.cmd/.ps1`.

**Files removed:**
- `node_modules/.bin/loose-envify.cmd`
- `node_modules/.bin/loose-envify.ps1`

**Notes:**
- Использую `nvm use 22` (npm 10.9.4) для дальнейших команд; сборка проходит без ошибок.
- `npm run build` включает `build:content` перед Vite.

**Problems / Risks:**
- Нет новых; QA/визуальные проверки и e2e тесты ещё не запускались (блоки F/E остаются открыты).

## STEP: D.x · Reader: legacy id, меню, контент/ошибки

- Status: DONE
- Date: 2025-11-29 04:20 (MSK)
- Description:
  Добавлен резолвер legacy id/slug (CHR-XXXX → canonical id) с автоканонизацией URL. Меню закрыто по умолчанию и фиксируется под шапкой на десктопе. Убран hero-блок и скрыт первый h1 контента для исключения дублирования, тело ограничено по ширине. Показ ошибок/пустых файлов с путём HTML и retry-кнопкой.

**Files changed:**
- `src/features/content/pages/ReaderPage.tsx` — резолвер legacy, автоканонизация, состояния загрузки/ошибок, меню-контрол.
- `styles/content-hub-v2.css` — sticky меню под header на десктопе, центрирование/ограничение тела, скрытие первого h1, word-break.

**Files removed:**
- нет

**Notes:**
- `npm run build` (Linux, nvm 22) проходил успешно после правок; minify даёт предупреждение по CSS, но сборка собирается.

**Problems / Risks:**
- Требуется визуальный smoke: загрузка HTML отображается корректно, меню — под header при скролле, проверка старых ссылок `/content/CHR-...`.

## STEP: C.4.x · Интеграция новой preview-панели в legacy CONTENT

- Status: DONE
- Date: 2025-11-29 03:34 (MSK)
- Description:
  Встроил новую превью-панель (дизайн ax-content-preview) в десктопный сплит `ContentCategoryView`: теперь справа отображается обновлённый preview в стиле Content Hub v2, кнопка `Open source` ведёт в старый reader `/dashboard/content/read/:id`. Добавил адаптер данных для текущих ContentItem (kicker, logline, markers, signature, image). Подключил стили `content-hub-v2.css`.

**Files created:**
- нет

**Files changed:**
- `app/routes/dashboard/content/ContentCategoryView.tsx` — адаптация данных и замена правой панели на новую preview.
- `styles/content-hub-v2.css` — подключена для новой панели (импорт).

**Files removed:**
- нет

**Notes:**
- `npm run build` (Linux, nvm 22.21.1) успешно после интеграции.
- Изображения подбираются по id (AXIOM/VIKTOR) или placeholder.

**Problems / Risks:**
- Требуется визуальный QA (F.1/F.2.2/F.2.3) на десктоп/мобайл.

## STEP: C.4.y · Чистая панель превью + переход в новый Reader

- Status: DONE
- Date: 2025-11-29 03:34 (MSK)
- Description:
  Убрал старую рамку/фон для новой превью-панели (`.ax-preview-panel--v2` теперь без бордеров/градиента) и переключил кнопки открытия на новый маршрут `/content/:id` (Reader v1). Мобильные переходы тоже ведут в новый Reader.

**Files changed:**
- `styles/red-protocol-overrides.css` — стили `.ax-preview-panel--v2` очищены (без фона/бордера/тени).
- `app/routes/dashboard/content/ContentCategoryView.tsx` — навигация `Open source` и моб. переходы теперь на `/content/:id`.

**Files removed:**
- нет

**Notes:**
- Слой превью теперь только новый компонент без legacy-подложки. Reader-интеграция соответствует маршрутy `/content/:id`.

**Problems / Risks:**
- Нужно визуально проверить панель после снятия фона на разных темах/ширинах.

## STEP: D.x · Reader UI — улучшение состояния Not Found / Error

- Status: DONE
- Date: 2025-11-29 03:45 (MSK)
- Description:
  Улучшил страницу Reader: добавил hero-блок с метаданными (id/version/status/lang), стилизованные chips, современный not-found экран с CTA, и кнопку повторной загрузки при ошибке fetch. Ошибка и not-found теперь выглядят как часть Red Protocol.

**Files changed:**
- `src/features/content/pages/ReaderPage.tsx` — hero мета, улучшенные состояния (loading/error/not-found), retry, навигация сохраняется.
- `styles/content-hub-v2.css` — добавлены стили hero, chips и контейнеров Reader.

**Files removed:**
- нет

**Notes:**
- Навигация обратно остаётся `/dashboard/content?id=<id>`; CTA в not-found ведёт в CONTENT.
- Билд после предыдущих правок проходил успешно; после UI-апдейта требуется повторная сборка/QA (блок F).

**Problems / Risks:**
- Нужно визуально проверить на разных ширинах и убедиться, что контент по-прежнему читабелен (особенно при длинных HTML).

## STEP: D.x+1 · Reader — совместимость с legacy id и канонизация

- Status: DONE
- Date: 2025-11-29 03:55 (MSK)
- Description:
  Добавил резолвер legacy id (например, `CHR-VIKTOR-0301` → `03.01_VIKTOR`) и автоматический переход на канонический путь `/content/<id>` с сохранением query. Это убирает ложные `NOT FOUND` для старых ссылок. Повторный билд успешен.

**Files changed:**
- `src/features/content/pages/ReaderPage.tsx` — резолвер legacy id/slug/suffix, автоканонизация маршрута.

**Files removed:**
- нет

**Notes:**
- `npm run build` (Linux, nvm 22.21.1) — успешно после изменений.

**Problems / Risks:**
- Требуется smoke-проверка старых ссылок (`/content/CHR-...`) и актуальных id.

## STEP: D.x+2 · Reader визуал: закрытое меню, без hero, выравнивание

- Status: DONE
- Date: 2025-11-29 04:20 (MSK)
- Description:
  Закрываю меню по умолчанию при переходах, убрал hero-блок, сузил и центрировал тело reader, добавил скрытие первого h1 из контента (убирает дублирование заголовков). Билд после правок успешен.

**Files changed:**
- `src/features/content/pages/ReaderPage.tsx` — меню закрывается на смену id; основное тело без hero, только содержимое.
- `styles/content-hub-v2.css` — контент ограничен по ширине, центрирован; скрыто первое h1 внутри reader.

**Files removed:**
- нет

**Notes:**
- `npm run build` (Linux) прошёл; предупреждение minify из CSS снято после чистки.

**Problems / Risks:**
- Нужен визуальный чек на десктоп/мобайл после скрытия заголовка и центрации.

## STEP: UI Restore · CategoryStats/ax-card/ax-content-card

- Status: DONE
- Date: 2025-11-29 03:23 (MSK)
- Description:
  Восстановил legacy UI-хром (CategoryStats/corptable, обёртка `ax-card ghost ax-route-wreath`, стили/кнопки `ax-content-card__btn`) на `/dashboard/content/*`: вернул ContentLayout и связанные компоненты/стили. Маршрут CONTENT снова использует старый лэйаут, при этом новый Reader остаётся на `/content/:id`. Полный `npm run build` прошёл успешно после восстановления.

**Files created:**
- `components/content/CategoryStats.tsx`
- `components/content/CategoryTiles.tsx`
- `components/content/category-stats.css`
- `components/content/category-tiles.css`

**Files changed (восстановлены):**
- `app/main.tsx` — возвращён маршрут `ContentLayout` с дочерними `AllRoute/CategoryRoute/LoreRoute/ReadRoute`; сохранил `/content/:id` для нового Reader.
- `app/routes/dashboard/content/_layout.tsx`
- `app/routes/dashboard/content/AllRoute.tsx`
- `app/routes/dashboard/content/CategoryRoute.tsx`
- `app/routes/dashboard/content/ContentCategoryView.tsx`
- `app/routes/dashboard/content/LoreRoute.tsx`
- `app/routes/dashboard/content/ReadRoute.tsx`
- `app/routes/dashboard/content/context.tsx`
- `components/ContentFilters.tsx`
- `components/ContentList.tsx`
- `components/ContentPreview.tsx`
- `components/ContentCategoryTiles.tsx`
- `components/ContentCardExpanded.tsx`

**Files removed:**
- нет

**Notes:**
- Сборка после восстановления: `npm run build` (Linux, nvm 22.21.1) — успешно, включает `build:content`.
- Коробка CategoryStats, ax-card wrapper и стили кнопки `ax-content-card__btn` возвращены без изменений к прошлой версии.

**Problems / Risks:**
- Нужно дополнительно провести визуальный QA (блок F.1/F.2.2/F.2.3) после возврата legacy UI.
