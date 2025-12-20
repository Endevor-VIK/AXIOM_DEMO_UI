
# docs/agent_ops/AXIOM_AGENTOPS_LOG_SYSTEM_SPEC_v0.2.3.1.md

<!-- docs/agent_ops/AXIOM_AGENTOPS_LOG_SYSTEM_SPEC_v0.2.3.1.md -->

# AXIOM AGENTOPS — LOG & COMMIT SYSTEM — SPEC v0.2.3.1

## 0) Цель
Нужна унифицированная система, чтобы любой AI-агент:
- прозрачно фиксировал каждое действие (как в примере `TUNNEL_DEV_IMPLEMENTATION_LOG.md`) 
- делал небольшие и частые коммиты для лёгкого undo
- создавал новый лог при старте новой задачи/сессии
- поддерживал “связку” между задачей (SPEC) и реальным логом в общей картотеке

---

## 1) Термины
- **SoT / SPEC** — документ требований задачи (пример: `docs/devtools/TUNNEL_DEV_IMPLEMENTATION_SPEC.md`) 
- **GLOBAL LOG** — реальный главный лог сессии, хранится в общей картотеке
- **TASK LOG LINK** — “ссылка-файл” внутри директории задачи, указывающая на GLOBAL LOG
- **SESSION** — один прогон/сессия агента по одной задаче (одна ветка/один поток работ)

---

## 2) Структура директорий (создаём в проекте)
### 2.1 Главная картотека логов
```

docs/agent_ops/
logs/
00_LOG_INDEX.md
0001_<task_slug>.md
0002_<task_slug>.md
...
templates/
LOG_TEMPLATE.md
TASK_LOG_LINK_TEMPLATE.md

```

### 2.2 Директория задачи (пример)
```

docs/devtools/
SOME_TASK_SPEC.md
SOME_TASK_LOG_LINK.md   <-- ссылка на GLOBAL LOG (обязательно, если есть SPEC)

```

---

## 3) Нэйминг и порядок (строго)
### 3.1 Формат имени GLOBAL LOG
`docs/agent_ops/logs/NNNN_<task_slug>.md`

- `NNNN` — 4 цифры, строго по порядку (0001, 0002, 0003…)
- `<task_slug>` — слаг стартовой задачи: lowercase, `a-z0-9-`, без пробелов  
  Пример: `0007_tunnel-dev-protected-quick-tunnel.md`

### 3.2 Как агент выбирает следующий номер
- сканирует `docs/agent_ops/logs/`
- находит максимум по шаблону `^\d{4}_`
- следующий = max + 1  
Если логов нет → `0001_...`

---

## 4) Правило создания лога на старте
Когда агент начинает новую задачу, он ОБЯЗАН:

1) Определить:
   - название задачи (`task_title`)
   - путь к SPEC (если есть)
   - branch (текущая ветка)

2) Создать новый GLOBAL LOG:
- `docs/agent_ops/logs/NNNN_<task_slug>.md` по шаблону `templates/LOG_TEMPLATE.md`

3) Обновить индекс:
- `docs/agent_ops/logs/00_LOG_INDEX.md` (добавить запись)

4) Если SPEC существует:
- создать `TASK LOG LINK` в директории задачи (рядом со SPEC)
- название: `<SPEC_BASENAME>_LOG_LINK.md`
- внутри — ссылка на GLOBAL LOG + метаданные

---

## 5) Формат LOG (унифицированный)
LOG должен быть читаемым и одинаковым для всех задач.

### 5.1 Обязательная “шапка”
- Start timestamp (ISO)
- Agent model (если известно)
- Repo + branch
- SPEC path (если есть)
- GLOBAL LOG path
- Status: ACTIVE / PAUSED / DONE / BLOCKED

### 5.2 Структура тела
LOG должен включать:
- **Step A — Discovery**
- **Step B — Implementation**
- **Step C — Documentation**
- **Step D — QA**
- **Step E — Git**

Внутри — записи формата:

`- 2025-12-20T19:11:02+01:00 — Action: <что делал> → Result: OK|FAIL|SKIP`
и дополнительно (по ситуации):
- Command
- Files changed
- Notes/Decision
- Next

---

## 6) Commit Policy (автономные коммиты агентом)
Цель: “легкое undo” → **частые маленькие коммиты**, но не “шум” на каждый символ.

### 6.1 Когда агент ОБЯЗАН коммитить
Коммит обязателен после:
1) Создания новых файлов (скрипт/спека/README/шаблон)
2) Логической законченной правки (одна фича/один фикс/одна миграция)
3) Перемещения/переименования (особенно опасные рефакторы)
4) Изменений конфигов сборки/линтера/CI
5) Изменения зависимостей (package.json/lock)
6) Перед рискованным экспериментом (checkpoint commit)

### 6.2 Когда коммитить НЕ НАДО
Не коммитим:
- временные файлы: `/tmp`, `.log`, `.cache`, build output
- локальные секреты: `.env`, `.env.local`, `*.key`, `auth.bcrypt`
- изменения, которые не проходят базовую проверку, если это не осознанный “checkpoint” (см. ниже)

### 6.3 Checkpoint commits (для undo)
Если изменения “в процессе”, но нужно зафиксировать точку отката:
- коммит допускается, но сообщение должно содержать `chore(checkpoint): ...`
- в LOG обязательна строка: **WHY checkpoint** и **что ещё не готово**

### 6.4 Минимальная проверка перед коммитом
Перед каждым коммитом агент делает:
- `git status -sb`
- `git diff --stat`
- если правился код: быстрый smoke-check (что применимо в проекте):
  - `npm run lint` / `npm test` / `npm run build` (если есть)
  - если нет — хотя бы запуск/типовой import check

### 6.5 Связь коммита с логом
Каждый коммит должен:
- быть записан в GLOBAL LOG (Step E — Git)
- содержать краткое описание, что именно фиксит
- использовать Conventional Commits:
  - `feat(...)`, `fix(...)`, `docs(...)`, `chore(...)`, `refactor(...)`

---

## 7) TASK LOG LINK (ссылка-файл рядом со SPEC)
Если задача имеет SPEC, в директории задачи создаётся LINK-файл, содержащий:
- ссылку на GLOBAL LOG (relative path)
- ссылку на SPEC
- ID лога (NNNN)
- статус сессии

Это даёт:
- прозрачность (где реальный лог)
- быстрый доступ к истории
- возможность видеть работу агента прямо из директории задачи

---

## 8) Acceptance Criteria
Система считается внедрённой, если:
- [ ] существует `docs/agent_ops/logs/00_LOG_INDEX.md`
- [ ] существуют templates (LOG + LINK)
- [ ] создан хотя бы один тестовый GLOBAL LOG
- [ ] создан LINK-файл рядом с SPEC (для тестовой задачи)
- [ ] есть README с инструкцией для агента и для человека
- [ ] описана commit policy + примеры сообщений
```

---

```md
# docs/agent_ops/README.md

# AXIOM AgentOps — Log & Commit System

## Что это
Стандарт, который заставляет AI-агента работать прозрачно:
- фиксировать все действия в одном реальном “главном” логе (GLOBAL LOG)
- вести индекс логов
- делать маленькие коммиты для простого undo
- создавать ссылку на лог внутри директории задачи (рядом со SPEC)

Основано на рабочем примере из проекта: `docs/devtools/TUNNEL_DEV_IMPLEMENTATION_LOG.md` :contentReference[oaicite:4]{index=4}

---

## Где лежит история
Главная картотека:
- `docs/agent_ops/logs/00_LOG_INDEX.md`
- `docs/agent_ops/logs/NNNN_<task_slug>.md`

Шаблоны:
- `docs/agent_ops/templates/LOG_TEMPLATE.md`
- `docs/agent_ops/templates/TASK_LOG_LINK_TEMPLATE.md`

---

## Как агент начинает новую задачу (обязательный ритуал)
1) Создать новый GLOBAL LOG в `docs/agent_ops/logs/NNNN_<task_slug>.md`
2) Обновить `docs/agent_ops/logs/00_LOG_INDEX.md`
3) Если есть SPEC задачи — создать LINK рядом со SPEC:
   - `<SPEC_BASENAME>_LOG_LINK.md`  
   который указывает на GLOBAL LOG

---

## Правила коммитов (коротко)
Коммитим:
- новые файлы
- законченные маленькие изменения
- переезды/рефакторы
- конфиги/зависимости
- чекпоинт перед рисками

Не коммитим:
- секреты
- временные файлы
- мусорные артефакты окружения

Каждый коммит фиксируется в GLOBAL LOG.

---

## Быстрый чеклист для человека (CREATOR)
Если агент начал задачу — проверь:
- создан ли новый лог в `docs/agent_ops/logs/`
- есть ли запись в `00_LOG_INDEX.md`
- есть ли LINK рядом со SPEC
- коммиты маленькие и читаемые
```

---

```md
# docs/agent_ops/templates/LOG_TEMPLATE.md

# GLOBAL LOG — {NNNN}_{task_slug}

- Start: {ISO_TIMESTAMP}
- Agent: {MODEL_OR_NAME}
- Repo: {REPO_NAME}
- Branch: {BRANCH_NAME}
- Task: {TASK_TITLE}
- SPEC: {SPEC_PATH_OR_NONE}
- Status: ACTIVE

---

## Step A — Discovery
- {ISO_TIMESTAMP} — Action:  → Result: 

## Step B — Implementation
- {ISO_TIMESTAMP} — Action:  → Result: 

## Step C — Documentation
- {ISO_TIMESTAMP} — Action:  → Result: 

## Step D — QA
- {ISO_TIMESTAMP} — Action:  → Result: 

## Step E — Git
- {ISO_TIMESTAMP} — Commit: `<hash>` — `<message>` — Files: `...`

---

## Notes / Decisions
- 

## Risks / Open Points
- 

## Acceptance Checklist
- [ ] 
```

---

```md
# docs/agent_ops/templates/TASK_LOG_LINK_TEMPLATE.md

# TASK LOG LINK — {TASK_TITLE}

- SPEC: {SPEC_PATH}
- GLOBAL LOG: {RELATIVE_LINK_TO_GLOBAL_LOG}
- LOG ID: {NNNN}
- Branch: {BRANCH_NAME}
- Status: ACTIVE

> This file is a pointer only. The real session history is stored in the GLOBAL LOG.
```

---

## PROMPT STARTER для агента (унифицированный, “как в референсе”)
