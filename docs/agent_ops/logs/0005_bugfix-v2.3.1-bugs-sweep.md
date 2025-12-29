<!-- docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md -->

# GLOBAL LOG — 0005_bugfix-v2.3.1-bugs-sweep

- Старт: 2025-12-20T20:15:29+03:00
- Агент: Codex (ChatGPT, GPT-5)
- Репозиторий: AXIOM_DEMO_UI (ui)
- Ветка: bugfix/v2.3.1-bugs-sweep (планируемая)
- Задача: Итерация баг/фикс кампания v2.3.1 (backlog из `docs/bugs`)
- SPEC: docs/iterations/bugfix-v2.3.1-bugs-sweep/spec.md
- Статус: ACTIVE

---

## Step A — Discovery
- 2025-12-20T20:15:29+03:00 — Действие: Старт сессии для подготовки SPEC и чеклистов багфиксов v2.3.1; подтвердил контекст репо и ветку-назначение. → Результат: OK
- 2025-12-20T20:25:40+03:00 — Действие: Выбран баг `BUG-003_reader-overlay-menu-scroll` как первый кандидат; собрал точки входа: `src/features/content/pages/ReaderPage.tsx` (рендер меню/overlay + портал), `styles/content-hub-v2.css` (позиционирование .axr-menu/.axr-overlay). → Результат: OK

## Step B — Implementation
- 2025-12-20T20:17:20+03:00 — Действие: Создал итерационный SPEC `docs/iterations/bugfix-v2.3.1-bugs-sweep/spec.md` (цели, процесс, чеклист приоритетных багов, правила коммитов/QA). → Результат: OK
- 2025-12-20T20:28:40+03:00 — Действие: Обновил BUG-003 статус на IN_PROGRESS и собрал привязанные файлы для фикса (Reader: `src/features/content/pages/ReaderPage.tsx`; стили меню/overlay: `styles/content-hub-v2.css`; баг-карточка `docs/bugs/BUG-003_reader-overlay-menu-scroll.md`). Сформировал дорожную карту: fixed overlay/menu через портал, scroll-lock на body (fixed + top=-scrollY), z-index и safe-top, QA в разных позициях скролла. → Результат: OK
- 2025-12-20T20:34:30+03:00 — Действие: Реализовал фикс BUG-003: перевёл overlay/menu на `position: fixed` с `100dvh`, добавил оболочку `.axr-menu-shell` (fixed, pointer-events:none), повысил z-index; добавил scroll-lock в ReaderPage (body fixed с восстановлением scrollY). Файлы: `styles/content-hub-v2.css`, `src/features/content/pages/ReaderPage.tsx`, `docs/bugs/BUG-003_reader-overlay-menu-scroll.md`, `docs/iterations/bugfix-v2.3.1-bugs-sweep/spec.md`. → Результат: OK
- 2025-12-20T20:48:16+03:00 — Действие: В ответ на фидбэк (скролл должен работать под меню) убрал жёсткий scroll-lock с body в ReaderPage и разрешил touch-action на overlay (`pan-y/pinch-zoom`), чтобы прокрутка контента сохранялась при открытом меню. Коммит не делал (ожидается повторная проверка UI). Файлы: `src/features/content/pages/ReaderPage.tsx`, `styles/content-hub-v2.css`. → Результат: WIP
- 2025-12-20T20:59:20+03:00 — Действие: Анализ багов после повторной проверки: меню остаётся привязано к верхнему offset и перекрывает header (нужно опустить z-index меню/overlay ниже шапки и вычислять фактическую высоту шапки); скролл идёт одновременно в меню и в контенте, но позиция меню не учитывает текущий scroll контента (фиксированная привязка). План: (1) перенести портал наверняка в `document.body` и убедиться, что нет `transform` родителя; (2) динамически измерять высоту `.axr-header` и устанавливать CSS-переменную для top/height overlay/menu; (3) опустить z-index overlay/menu ниже header; (4) оставить scroll свободным, но обеспечить чтобы overlay покрывал viewport под шапкой; (5) при необходимости добавить gap от header через env(safe-area-inset-top). → Результат: TODO
- 2025-12-20T21:08:29+03:00 — Действие: Попытка улучшения: портал теперь принудительно `document.body` (fallback), добавлен расчёт динамической высоты `.axr-header` (`--axr-header-h-dyn`) через layout effect; overlay/menu топ/высота завязаны на эту переменную, z-index overlay/menu опущены ниже header. Скролл-lock по-прежнему отключён. Коммита нет, требуется повторная ручная проверка UI. Файлы: `src/features/content/pages/ReaderPage.tsx`, `styles/content-hub-v2.css`. → Результат: WIP
- 2025-12-20T21:17:12+03:00 — Действие: Внесены UX-ограничители прокрутки без коммита: overlay теперь блокирует прокрутку (touch-action:none, overscroll-behavior:contain, preventDefault на wheel/touchmove), меню получает overscroll-behavior:contain, чтобы колесо/жесты не прокручивали страницу. Цель — меню и overlay независимы от скролла контента, меню скроллится только внутри. Требуется повторная проверка. Файлы: `src/features/content/pages/ReaderPage.tsx`, `styles/content-hub-v2.css`. → Результат: WIP
- 2025-12-20T21:25:30+03:00 — Действие: Начал рефакторинг слоя меню: вынес слой в компонент `ReaderMenuLayer` (portal + фильтр + UI), убрал inline Portal из ReaderPage. Добавил классы `axr-menu-layer` и включение pointer-events только при открытии; меню/overlay получают z-index ниже header. Scroll-lock не используется. Требуется повторная проверка (цель — независимый скролл меню, overlay фиксирован, страница скроллится отдельно). Файлы: `src/features/content/components/ReaderMenuLayer.tsx`, `src/features/content/pages/ReaderPage.tsx`, `styles/content-hub-v2.css`, лог 0005. → Результат: WIP
- 2025-12-20T21:40:58+03:00 — Действие: Исправил TS-ошибку (activeId передавался при null entry), подправил `ReaderPage` пропсы. Баг остаётся нерешённым (меню не открывается из любого места, scroll связывается с html-контентом), требуется дальнейший дизайн механизма. Файлы: `src/features/content/pages/ReaderPage.tsx`. Коммит будет сделан для фиксации прогресса, баг остаётся OPEN. → Результат: WIP/FAIL
- 2025-12-20T21:48:00+03:00 — Действие: Продолжил рефактор: расширил тип `activeId` в `ReaderMenuLayer` (string|null) с передачей precomputed `activeId` в `ReaderPage`, чтобы снять TS ошибки exactOptionalPropertyTypes; состояние бага неизменное (меню не открывается корректно из любой точки, скролл/слои требуют дальнейшей проработки). Файлы: `src/features/content/components/ReaderMenuLayer.tsx`, `src/features/content/pages/ReaderPage.tsx`. Коммит планируется, баг остаётся OPEN. → Результат: WIP/FAIL
- 2025-12-20T22:10:00+03:00 — Действие: Радикальный шаг: ввёл отдельный scroll-контейнер `.axr-scroll` внутри Reader (теперь скролл идёт по контейнеру, не по body), добавил проксирование wheel/touch на overlay для управления скроллом контента при открытом меню (overlay остаётся кликабельным). Меню/overlay остаются фиксированными и независимыми от скролла контента. Коммита нет (нужна проверка UI). Файлы: `src/features/content/pages/ReaderPage.tsx`, `src/features/content/components/ReaderMenuLayer.tsx`, `styles/content-hub-v2.css`. → Результат: WIP
- 2025-12-20T22:18:40+03:00 — Действие: По фидбэку UI (меню открывается от любой точки, но перекрывает header/overlay не закрывает контент/скролл контента блокируется) скорректировал слои: `axr-menu-layer` ограничен областью под header (top/height через `--axr-header-h-dyn`), обновлён поиск scrollRoot при open. Требуется повторная проверка, баг остаётся OPEN. Файлы: `src/features/content/components/ReaderMenuLayer.tsx`, `styles/content-hub-v2.css`. → Результат: WIP/FAIL
- 2025-12-20T22:33:10+03:00 — Действие: Для стабилизации высоты header добавил `ResizeObserver` в `ReaderMenuLayer` (динамическое обновление `--axr-header-h-dyn`), чтобы слой меню/overlay не перекрывал шапку и корректно рассчитывал высоту под viewport. Коммита нет, требуется повторная проверка UI и подтверждение. Файлы: `src/features/content/components/ReaderMenuLayer.tsx`. → Результат: WIP
- 2025-12-22T19:12:40+03:00 — Действие: Пересчёт высоты header перевёл на `offsetHeight` (исключение двойного масштаба при `zoom/transform`), слой меню/overlay перевёл на `top + bottom` вместо `height: 100dvh` (стабилизация покрытия под шапкой). Добавил ленивое восстановление scrollRoot в overlay. Требуется повторная проверка UI. Файлы: `src/features/content/components/ReaderMenuLayer.tsx`, `styles/content-hub-v2.css`. → Результат: WIP
- 2025-12-22T18:12:33+03:00 — Действие: Перенёс прокрутку при открытом меню на глобальные `wheel/touch` обработчики (document-level) с проверкой цели: меню скроллится самостоятельно, фон прокручивается через `#axr-scroll` при событиях вне меню. Overlay теперь только кликабельный слой закрытия. Файлы: `src/features/content/components/ReaderMenuLayer.tsx`. → Результат: WIP
- 2025-12-22T18:48:22+03:00 — Действие: Старт BUG-006 (scale parity windowed): скорректировал глобальный зум под windowed режим — для `html` оставлен `zoom/transform` 0.8, но добавлен режим “fit” при ширине ≤1600px (расширение layout-width через `width/height`), чтобы окно масштабировалось без перестановки блоков. Файлы: `styles/app.css`, `docs/bugs/BUG-006_scale-parity-windowed.md`, `docs/bugs/00_BUG_INDEX.md`. → Результат: WIP
- 2025-12-22T19:15:45+03:00 — Действие: Пересмотр BUG-006: убрал “fit”-логику (усугубляла дрейф), ввёл адаптивный `--ax-ui-scale` (0.8 ≥1600, 0.9 до 1440, 1.0 ниже 1440) с чистым zoom/transform и без доп. компенсаций. Обновил гипотезы в карточке BUG-006. Требуется ручная проверка. Файлы: `styles/app.css`, `docs/bugs/BUG-006_scale-parity-windowed.md`. → Результат: WIP
- 2025-12-22T19:26:41+03:00 — Действие: Откат адаптивного `--ax-ui-scale` из-за регресса (0.8 scale пропал, элементы выросли). Вернул базовый `0.8` для `html` zoom/transform, обновил заметки BUG-006. Файлы: `styles/app.css`, `docs/bugs/BUG-006_scale-parity-windowed.md`. → Результат: WIP

## Step C — Documentation
- 2025-12-22T19:58:18+03:00 — Действие: Создал архитектурный spec по отказу от html-zoom и нормализации масштаба: `docs/iterations/ui-scale-normalization-v2.3.1/spec.md`. Добавил ссылку в BUG-006. → Результат: OK
- 2025-12-22T20:21:53+03:00: Действие: Углубил spec (v0.2): базовая рамка 1920x1080, раздельные масштабы density/viewport, canvas-архитектура, portal-стратегия, data-layout, расширенный roadmap/QA. → Результат: OK
- 2025-12-29T14:56:13+03:00 — Действие: Создал директорию для baseline-скриншотов и README с неймингом: `docs/iterations/ui-scale-normalization-v2.3.1/assets/screenshots/`. Обновил spec чеклист. → Результат: OK
- 2025-12-29T16:23:33+03:00 — Действие: Описал каждый baseline-скриншот (описание/замечания/баги) и зафиксировал способ просмотра через viewer Codex в `docs/iterations/ui-scale-normalization-v2.3.1/assets/screenshots/README.md`. → Результат: OK
- 2025-12-29T20:29:30+03:00 — Действие: Добавлены baseline-скриншоты для UI масштаба в `docs/iterations/ui-scale-normalization-v2.3.1/assets/screenshots/`. → Результат: OK
- 2025-12-29T20:29:30+03:00 — Действие: Добавлена новость о полном реворке вкладок Audit/Roadmap в `public/data/news/manifest.json` + `public/data/news/items/2025-12-29-audit-roadmap-rework.md`. → Результат: OK
- 2025-12-29T17:04:42+03:00 — Действие: Выполнена инвентаризация масштабов (глобальный zoom, токены, локальные preview/doc zoom) и добавлена карта файлов/механизмов в `docs/iterations/ui-scale-normalization-v2.3.1/spec.md`. → Результат: OK
- 2025-12-29T18:12:01+03:00 — Действие: Добавил карту layout/порталов (DOM корни, контейнеры, portal-узлы) и вывод по переносу `#modal-root` внутрь canvas в `docs/iterations/ui-scale-normalization-v2.3.1/spec.md`. → Результат: OK

## Step D — QA
- 2025-12-20T20:44:20+03:00 — Действие: Ручная проверка BUG-003 в UI (локал): меню всё ещё открывается от верхней точки, фон полностью залочен (нет скролла страницы при открытом меню). Подозрение: жёсткий scroll-lock `body { position: fixed }` + меню фиксировано к top header; различие между scroll документа и вложенного HTML контента. → Результат: FAIL (требуется доработка)
- 2025-12-20T20:55:00+03:00 — Действие: Вторая проверка после снятия scroll-lock: скролл доступен, но меню остаётся привязано к верхней части и перекрывает header; overlay не отделён от шапки. → Результат: FAIL
- 2025-12-22T18:01:42+03:00 — Действие: Проверка текущей сборки: меню открывается из любой точки, header кликается, overlay корректен; проблема осталась — при открытом меню не скроллится основной HTML-контент под overlay. → Результат: FAIL (нужен фикс прокрутки при active menu)
- 2025-12-22T18:21:32+03:00 — Действие: Финальная проверка (по фидбэку пользователя): меню, overlay и скролл HTML-контента работают корректно при открытом меню. BUG-003 закрыт как DONE. → Результат: PASS

## Step E — Git
- 2025-12-20T20:39:16+03:00 — Commit: `73924d8` — `fix(reader-menu): fix overlay positioning and lock scroll` — Files: `src/features/content/pages/ReaderPage.tsx`, `styles/content-hub-v2.css`, `docs/bugs/BUG-003_reader-overlay-menu-scroll.md`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-20T21:25:30+03:00 — Commit: `a04d710` — `chore(reader-menu): refactor layer component and fix ts error (BUG-003 wip)` — Files: `src/features/content/components/ReaderMenuLayer.tsx`, `src/features/content/pages/ReaderPage.tsx`, `styles/content-hub-v2.css`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-20T21:40:58+03:00 — Commit: `2e1abe9` — `chore(reader-menu): update props for ts strict mode (BUG-003 still open)` — Files: `src/features/content/pages/ReaderPage.tsx`, `src/features/content/components/ReaderMenuLayer.tsx`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-22T17:09:58+03:00 — Commit: `7790519` — `chore(reader-menu): add scroll container and refine layer bounds (BUG-003 wip)` — Files: `src/features/content/pages/ReaderPage.tsx`, `src/features/content/components/ReaderMenuLayer.tsx`, `styles/content-hub-v2.css`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-22T18:02:35+03:00 — Commit: `1e4bd1f` — `chore(reader-menu): stabilize header sizing and layer bounds` — Files: `src/features/content/components/ReaderMenuLayer.tsx`, `styles/content-hub-v2.css`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md` (BUG-003 остаётся OPEN)
- 2025-12-22T18:21:32+03:00 — Commit: `080a699` — `fix(reader-menu): congratulations!!! BUG-003 resolved` — Files: `src/features/content/components/ReaderMenuLayer.tsx`
- 2025-12-22T19:39:43+03:00 — Commit: `bafeb97` — `fix(favorites): avoid legacy migration recursion` — Files: `lib/identity/favoritesService.ts`
- 2025-12-22T19:41:04+03:00 — Commit: `f24fc60` — `chore(bugs): start BUG-006 scale parity investigation` — Files: `styles/app.css`, `docs/bugs/BUG-006_scale-parity-windowed.md`, `docs/bugs/00_BUG_INDEX.md`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-29T15:40:14+03:00 — Commit: `ae23c6b` — `docs(assets): add baseline UI scale screenshots` — Files: `docs/iterations/ui-scale-normalization-v2.3.1/assets/screenshots/*.png`
- 2025-12-29T15:41:15+03:00 — Commit: `2fe9d95` — `feat(news): announce audit/roadmap rework` — Files: `public/data/news/manifest.json`, `public/data/news/items/2025-12-29-audit-roadmap-rework.md`
- 2025-12-29T16:29:20+03:00 — Commit: `9d0d5bf` — `docs(assets): annotate baseline screenshots` — Files: `docs/iterations/ui-scale-normalization-v2.3.1/assets/screenshots/README.md`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-29T16:33:22+03:00 — Commit: `758d093` — `chore(agent-ops): log screenshot annotations` — Files: `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-29T17:47:31+03:00 — Commit: `3379468` — `docs(spec): map scale touchpoints` — Files: `docs/iterations/ui-scale-normalization-v2.3.1/spec.md`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-29T18:26:07+03:00 — Commit: `fbb55aa` — `docs(spec): map layout and portal roots` — Files: `docs/iterations/ui-scale-normalization-v2.3.1/spec.md`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`

---

## Notes / Decisions
- Основной источник задач — `docs/bugs` индекс и карточки; фиксация статусов и приоритетов в SPEC.
- Работы командные, без самовольных фиксов — нужно соблюдать процесс (repro, owner, статус, ссылки на PR/коммиты).

## Risks / Open Points
- Требуется реальное пользовательское поведение для валидации UI; автоматически не подтвердить UX регрессии.

## Acceptance Checklist
- [ ] SPEC итерации создан с целями/объемом, процессом и чеклистом
- [ ] Лог 0005 ведётся и ссылка на SPEC актуальна
- [ ] Чеклист багов/фикс-сессий добавлен
