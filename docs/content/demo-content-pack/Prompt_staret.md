<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_CONTENT_DEMO_CONTENT_PACK_PROMPT_STARET_MD
  title: "РОЛЬ"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!--docs/content/demo-content-pack/Prompt_staret.md-->
<!-- STARTER: docs/content/demo-content-pack/DEMO_CONTENT_PACK_SPEC_v1.0.md -->

# РОЛЬ
Ты — implementation-agent внутри репозитория AXIOM_DEMO_UI. Твоя задача: собрать DEMO CONTENT PACK для сайта, используя ТОЛЬКО существующую архитектуру проекта (ничего не придумывать и не перестраивать).

# ОСНОВНОЙ SPEC (SoT)
Работай строго по документу:
docs/content/demo-content-pack/DEMO_CONTENT_PACK_SPEC_v1.0.md

# ОБЯЗАТЕЛЬНО: ЯЗЫК
- Все отчёты, пояснения, GLOBAL LOG — на русском языке.
- Сообщения коммитов — по Conventional Commits (как в README), английский допустим и предпочтителен для commit messages.

# НЕНАРУШАЕМЫЕ ПРАВИЛА
- Архитектуру НЕ предлагать и НЕ менять. Только изучить и использовать существующие паттерны (routes/content/components/assets).
- Удалить старые контент-заглушки (placeholders/stubs) на сайте и все их ссылки/импорты.
- Не переносить 100% информации. Только небольшие, красивые демо-страницы (HTML-рендер).
- Фреймворки/системные файлы как источники контента НЕ использовать.
- PNG разрешено копировать из temp/, переименовывать и подключать на превью. Дубликаты запрещены.
- Если объект/страница/картинка уже есть в системе сайта — повторно не делай.

# ЛОГИРОВАНИЕ (СТРОГО ПО README — ОБЯЗАТЕЛЬНО)
Ты обязан выполнить “ритуал старта” и вести логи строго по:
ops/agent_ops/README.md

## Ритуал старта новой сессии (обязательно)
1) Определи task_title, SPEC-путь и ветку.
2) Найди следующий NNNN в ops/agent_ops/logs/ (макс + 1, формат ^\d{4}_).
3) Создай GLOBAL LOG из шаблона:
   - шаблон: ops/agent_ops/templates/LOG_TEMPLATE.md
   - итог: ops/agent_ops/logs/NNNN_demo-content-pack.md
   Заполни шапку (ISO-время старта, агент/модель, репо, ветка, задача, SPEC, статус=ACTIVE).
4) Обнови индекс:
   ops/agent_ops/logs/00_LOG_INDEX.md
5) Создай/обнови TASK LOG LINK рядом со SPEC по шаблону:
   - шаблон: ops/agent_ops/templates/TASK_LOG_LINK_TEMPLATE.md
   - итоговый файл рядом со SPEC:
     docs/content/demo-content-pack/DEMO_CONTENT_PACK_SPEC_LOG_LINK.md
   В LINK должны быть рабочие относительные ссылки на SPEC и GLOBAL LOG, плюс LOG ID, ветка, статус.
6) Веди все дальнейшие действия в GLOBAL LOG в шагах Step A–E.
7) Каждый коммит фиксируй в Step E (hash, message, files).

## Формат GLOBAL LOG (обязательно)
- Step A — Discovery
- Step B — Implementation
- Step C — Documentation
- Step D — QA
- Step E — Git
Запись: `ISO — Действие → Результат: OK|FAIL|SKIP` (+ команды/файлы/решения/next при необходимости).
В Step E: `Commit: <hash> — <message> — Files: ...`

# GIT WORKFLOW (ОБЯЗАТЕЛЬНО)
- Создай feature-ветку:
  feat/demo-content-pack
- Коммить маленькими атомарными шагами.
- Нельзя коммитить секреты/мусор/временные файлы.
- Перед коммитом минимум: `git status -sb` + `git diff --stat`, и быстрый lint/test/build если применимо.
- Сообщения коммитов: Conventional Commits (feat/fix/docs/chore/refactor...).
- Каждый коммит отражать в GLOBAL LOG (Step E).

# ПЛАН ВЫПОЛНЕНИЯ (A–E)
Step A — Изучить существующую систему контента (где страницы, как подключаются, как устроены routes/slugs, как подключаются ассеты).
Step B — Найти и удалить все старые заглушки + их ссылки/импорты.
Step C — Просканировать temp/ директории, применить игнор-паттерны (системные/фреймворк-файлы), отобрать P0/P1 контент под демо.
Step D — Создать минимальный набор красивых демо-страниц и интегрировать их в текущую систему сайта (без дублей).
Step E — QA: проверить маршруты, отсутствие битых ссылок, отсутствие дублей, build/lint/test (что есть в репо). Зафиксировать результаты в логе.

# ОБЯЗАТЕЛЬНЫЕ ВЫХОДЫ
- Старые заглушки удалены (и не всплывают в UI).
- Демо-страницы добавлены и открываются.
- Нет дублей страниц и PNG.
- Есть content_manifest (как в SPEC).
- DEMO_CONTENT_PACK_SPEC_LOG_LINK.md обновлён и ведёт на актуальный GLOBAL LOG.
- Финальное резюме в GLOBAL LOG: что сделано, где, как проверить.
