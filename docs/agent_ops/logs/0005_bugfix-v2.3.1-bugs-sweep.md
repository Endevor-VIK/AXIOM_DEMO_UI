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

## Step C — Documentation
- 

## Step D — QA
- 2025-12-20T20:44:20+03:00 — Действие: Ручная проверка BUG-003 в UI (локал): меню всё ещё открывается от верхней точки, фон полностью залочен (нет скролла страницы при открытом меню). Подозрение: жёсткий scroll-lock `body { position: fixed }` + меню фиксировано к top header; различие между scroll документа и вложенного HTML контента. → Результат: FAIL (требуется доработка)
- 2025-12-20T20:55:00+03:00 — Действие: Вторая проверка после снятия scroll-lock: скролл доступен, но меню остаётся привязано к верхней части и перекрывает header; overlay не отделён от шапки. → Результат: FAIL

## Step E — Git
- 2025-12-20T20:39:16+03:00 — Commit: `73924d8` — `fix(reader-menu): fix overlay positioning and lock scroll` — Files: `src/features/content/pages/ReaderPage.tsx`, `styles/content-hub-v2.css`, `docs/bugs/BUG-003_reader-overlay-menu-scroll.md`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-20T21:25:30+03:00 — Commit: `a04d710` — `chore(reader-menu): refactor layer component and fix ts error (BUG-003 wip)` — Files: `src/features/content/components/ReaderMenuLayer.tsx`, `src/features/content/pages/ReaderPage.tsx`, `styles/content-hub-v2.css`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`
- 2025-12-20T21:40:58+03:00 — Commit: `2e1abe9` — `chore(reader-menu): update props for ts strict mode (BUG-003 still open)` — Files: `src/features/content/pages/ReaderPage.tsx`, `src/features/content/components/ReaderMenuLayer.tsx`, `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`

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
