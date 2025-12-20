<!-- docs/agent_ops/README.md -->

# AXIOM AgentOps — Log & Commit System

Единый стандарт для AI-агента: создавай GLOBAL LOG на старте задачи, веди индекс, клади LINK рядом со SPEC и коммить небольшими шагами.

## Быстрый старт (ритуал новой сессии)
1. Определи `task_slug`, SPEC путь и текущую ветку.
2. Найди следующий ID: просканируй `docs/agent_ops/logs/` по `^\d{4}_`. Если пусто — `0001`.
3. Скопируй `docs/agent_ops/templates/LOG_TEMPLATE.md` в `docs/agent_ops/logs/NNNN_<task_slug>.md` и заполни шапку (время, агент, репо, ветка, SPEC).
4. Обнови индекс `docs/agent_ops/logs/00_LOG_INDEX.md` (таблица: ID, Date, Task, Branch, SPEC, GLOBAL LOG, Status).
5. Если есть SPEC — создай рядом LINK `<SPEC_BASENAME>_LOG_LINK.md` по шаблону `docs/agent_ops/templates/TASK_LOG_LINK_TEMPLATE.md` (ссылки на SPEC и GLOBAL LOG).

## Формат GLOBAL LOG
- Шапка: стартовое время (ISO), агент/модель, репо, ветка, задача, SPEC, статус.
- Блоки Step A–E: Discovery / Implementation / Documentation / QA / Git.
- Записи: `ISO — Действие → Результат (OK|FAIL|SKIP)` + при необходимости команда, файлы, решение.
- Step E фиксирует каждый коммит: hash, сообщение, файлы.

## Commit policy (когда коммитить)
Коммит обязателен после: новых файлов, законченной правки, переезда/рефактора, конфигов/зависимостей, рискованного шага (checkpoint).
Не коммитим: секреты (.env, auth.bcrypt), временные артефакты, мусор. Checkpoint: `chore(checkpoint): ...` + в логе объяснение зачем.
Перед коммитом: `git status -sb`, `git diff --stat`, при правках кода — быстрый линт/тест, если применимо.

## Где лежит
- Индекс: `docs/agent_ops/logs/00_LOG_INDEX.md`
- GLOBAL LOGи: `docs/agent_ops/logs/NNNN_<task_slug>.md`
- Шаблоны: `docs/agent_ops/templates/LOG_TEMPLATE.md`, `docs/agent_ops/templates/TASK_LOG_LINK_TEMPLATE.md`
- SPEC: `docs/agent_ops/AXIOM_AGENTOPS_LOG_SYSTEM_SPEC_v0.2.3.1.md`

## Проверки для ревьюера
- Новый лог создан и записан в индекс.
- LINK рядом со SPEC присутствует.
- Коммиты маленькие, читаемые, отражены в Step E.
- Нет секретов в git, временные файлы не добавлены.
