<!-- docs/iterations/bugfix-v2.3.1-bugs-sweep/spec.md -->

# AXIOM — Bugfix Sweep `v2.3.1-bugs-sweep`

## 0) Цель
Системно пройти backlog `docs/bugs`, подтвердить/отклонить воспроизведение, подготовить фиксы и верификацию под ветку `bugfix/v2.3.1-bugs-sweep`.

## 1) Область и ограничения
- Фокус: баги/инциденты из `docs/bugs` (BUG/SEC/PERF/ARCH), приоритет P0/P1.
- Не затрагивать новые фичи; только исправления/стабилизация.
- Соблюдать AgentOps: GLOBAL LOG, чекпоинты, мелкие коммиты.

## 2) Процесс (для каждой карточки багов)
1. **Repro**: подтвердить шаги, окружение, актуальный статус (NEW → IN_PROGRESS/CONFIRMED/BLOCKED/DONE).
2. **Scope**: кратко зафиксировать "expected vs actual", риски, затронутые модули.
3. **Fix plan**: что меняем, где тестируем (lint/unit/e2e/manual), критерии приемки.
4. **Implementation**: минимально достаточный фикс, без побочных рефакторов.
5. **QA**: чеклист тестов + результаты (OK/FAIL, ссылки на логи/скрины).
6. **Logging**: обновить карточку в `docs/bugs` (статус/прогресс), Global Log 0005 (Step D/E), ссылки на коммиты/PR.
7. **Review/PR**: Conventional Commits, ссылка на BUG-ID в теле, короткий summary + тесты.

## 3) Структура артефактов
- Итерация: `docs/iterations/bugfix-v2.3.1-bugs-sweep/spec.md` (этот документ).
- Лог сессии: `docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md`.
- Источник задач: `docs/bugs/00_BUG_INDEX.md` + карточки BUG/SEC/PERF/ARCH.
- Ветка: `bugfix/v2.3.1-bugs-sweep`.

## 4) Приоритетный чеклист (стартовая выборка)
- [ ] SEC-001 preview sandbox same-origin (XSS риск)
- [ ] SEC-002 reader unsanitized HTML
- [ ] SEC-003 markdown javascript: protocol
- [ ] BUG-005 perf animations low-end
- [ ] BUG-006 scale parity windowed
- [ ] BUG-007 reader legacy dataset
- [ ] PERF-001 avatar menu reflow
- [ ] ARCH-001 dual-content-pipeline
- [ ] BUG-003 reader overlay/menu scroll (позиционирование overlay/menu, scroll-lock)

(Можно дополнять из индекса; отмечать P0/P1 в теле карточек.)

## 5) Правила коммитов/логов
- Коммиты: `fix(...)` для исправлений, `test(...)` для тестов, `chore(bugs): ...` для статусов; один баг — один логический коммит (или пара: fix+tests).
- Каждый коммит вносить в 0005 (Step E) с hash/message/files.
- При BLOCKED фиксировать причину/окружение в карточке и в 0005 (Step D/Risks).

## 6) QA критерии
- Для security: воспроизведение уязвимости + подтверждение фикса (нет инъекции/скриптов), по возможности тест/санитайзер.
- Для perf: измеримый эффект или отсутствие регресса; минимум smoke/manual проверка.
- Для UI: визуальный чек + e2e/unit, если есть готовые тесты; скриншоты при изменении поведения.

## 7) Завершение итерации
- Все выбранные карточки имеют статус DONE или BLOCKED с причиной.
- Лог 0005 обновлён (Step D/E, Notes/Risks), BUG-индекс обновлён.
- Ветка готова к PR (summary: что исправлено, как тестировали, оставшиеся риски).
