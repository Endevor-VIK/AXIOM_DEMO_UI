<!-- docs/agent_ops/README.md -->

# AXIOM AgentOps — Log & Commit System

Единый стандарт для AI-агента: фиксируй каждое действие в GLOBAL LOG, веди индекс, клади TASK LOG LINK рядом со SPEC, коммить маленькими шагами. Референс реального лога: `docs/agent_ops/logs/0002_tunnel-dev-implementation.md`.

## Термины
- SPEC (SoT) — документ требований задачи.
- GLOBAL LOG — главный лог сессии агента в общей картотеке.
- TASK LOG LINK — файл-указатель рядом со SPEC, ссылается на GLOBAL LOG.
- SESSION — один прогон по задаче (ветка/итерация).

## Структура директорий
- Картотека: `docs/agent_ops/logs/00_LOG_INDEX.md`, `docs/agent_ops/logs/NNNN_<task_slug>.md`
- Шаблоны: `docs/agent_ops/templates/LOG_TEMPLATE.md`, `docs/agent_ops/templates/TASK_LOG_LINK_TEMPLATE.md`
- Внутри задачи: SPEC + `<SPEC_BASENAME>_LOG_LINK.md` рядом (если есть SPEC)

## Нумерация GLOBAL LOG (NNNN)
- Имена: `docs/agent_ops/logs/NNNN_<task_slug>.md`, где NNNN — 0001, 0002, …
- Найди максимум по `^\d{4}_` в `docs/agent_ops/logs/` → новый ID = max + 1; если пусто — `0001`.
- `task_slug`: латиница/цифры/дефис (`a-z0-9-`), без пробелов.

## Ритуал старта новой сессии
1) Определи задачу (`task_title`), SPEC-путь (если есть) и ветку.  
2) Создай GLOBAL LOG: скопируй шаблон в `docs/agent_ops/logs/NNNN_<task_slug>.md`, заполни шапку (ISO время, агент/модель, репо, ветка, задача, SPEC, статус=ACTIVE).  
3) Запиши стартовое действие в Step A.  
4) Обнови индекс `docs/agent_ops/logs/00_LOG_INDEX.md` (ID, Date/Start, Task, Branch, SPEC, GLOBAL LOG, Status).  
5) Если у задачи есть SPEC — создай LINK `<SPEC_BASENAME>_LOG_LINK.md` рядом со SPEC по шаблону; ссылки должны быть рабочими (относительные).  
6) Все дальнейшие действия фиксируй в GLOBAL LOG (Step B–E).  
7) Каждый коммит добавляй в Step E.

## Формат GLOBAL LOG (обязательно)
- Шапка: Старт (ISO), Агент/модель, Репозиторий, Ветка, Задача, SPEC, Статус (ACTIVE/PAUSED/DONE/BLOCKED).
- Блоки: Step A — Discovery, B — Implementation, C — Documentation, D — QA, E — Git.
- Записи: `ISO — Действие → Результат: OK|FAIL|SKIP` + при необходимости команда, файлы, решение, next.
- Step E: для каждого коммита — `Commit: <hash> — <message> — Files: ...`.
- Notes/Risks: фиксируй решения, риски, блокеры.

## TASK LOG LINK (рядом со SPEC)
- Имя: `<SPEC_BASENAME>_LOG_LINK.md`.
- Формат: ссылки на SPEC и GLOBAL LOG (relative), LOG ID, ветка, статус.
- Назначение: человек открывает SPEC-директорию и сразу видит актуальный GLOBAL LOG.

## Commit policy
- Коммит обязателен после: новых файлов; законченной правки (одна фича/фикс); переезда/переименования; правок конфигов/CI; изменения зависимостей; перед рискованным экспериментом (checkpoint).
- Не коммитим: секреты (`.env`, `.env.local`, `auth.bcrypt`, ключи), временные файлы (`/tmp`, `.log`, `.cache`, build output), мусор.  
- Checkpoint: `chore(checkpoint): ...` + в GLOBAL LOG указать зачем и что не готово.
- Минимальная проверка перед коммитом: `git status -sb`, `git diff --stat`; при правках кода — быстрый линт/тест, если применимо.
- Связь с логом: каждый коммит отражается в Step E GLOBAL LOG.
- Сообщения: Conventional Commits (`feat/fix/docs/chore/refactor(...)`).

## Acceptance checklist
- [ ] Есть `docs/agent_ops/logs/00_LOG_INDEX.md`
- [ ] Есть шаблоны LOG + LINK
- [ ] Создан хотя бы один GLOBAL LOG
- [ ] LINK-файл лежит рядом с выбранным SPEC
- [ ] README содержит правила и ритуал
- [ ] Commit policy описана и применяется
