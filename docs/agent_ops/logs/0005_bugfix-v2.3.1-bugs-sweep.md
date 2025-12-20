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

## Step C — Documentation
- 

## Step D — QA
- 

## Step E — Git
- 

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
