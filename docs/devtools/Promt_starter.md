<!--docs/devtools/Promt_starter.md-->
<!-- STARTER: docs/devtools/TUNNEL_DEV_IMPLEMENTATION_SPEC.md -->

# PROMPT_STARTER — AXIOM TUNNEL DEV (Protected Quick Tunnel) v0.2.3.1 (Agent Entry)

> **Repo:** `AXIOM_DEMO_UI`  
> **Mission:** Создать отдельный dev-скрипт `scripts/run_tunnel_dev.py`, который поднимает защищённый доступ (BasicAuth через Caddy) и публичный Cloudflare Quick Tunnel (trycloudflare) к уже запущенному Vite dev server.  
> **Output:** Код + документация + implementation log + чистые коммиты.  
> **Важно:** `scripts/run_local.py` НЕ трогать. Это отдельный инструмент, который работает рядом.

---

## 0) 🔗 Mandatory Reference Files (Read First)

Агент **обязан** сначала открыть и прочитать эти документы (в репозитории):

1) **SPEC (главный документ требований):**  
   - `docs/devtools/TUNNEL_DEV_IMPLEMENTATION_SPEC.md`

2) **Implementation LOG (вести в процессе выполнения):**  
   - `docs/devtools/TUNNEL_DEV_IMPLEMENTATION_LOG.md`

3) **README (создать/обновить по итогам):**  
   - `docs/devtools/TUNNEL_DEV_README.md`

> Правило: если возникает конфликт между интерпретацией и документами — **SPEC → LOG → README** (в таком порядке).

---

## 1) Prime Rules (Non-negotiable)

1) **Не модифицировать `scripts/run_local.py`.**  
   - Скрипт туннеля должен работать, когда Vite уже поднят отдельно.

2) **Никаких секретов в git.**  
   - Пароль не хранить в коде/конфигах в репозитории.  
   - Пароль брать из ENV (по умолчанию `AXIOM_TUNNEL_PASS`).  
   - В stdout не печатать пароль (только маска).

3) **WSL без systemd.**  
   - Никаких `systemctl`, никаких сервисов. Только subprocess.

4) **По умолчанию избегать QUIC/UDP.**  
   - `cloudflared` запускать с `--protocol http2` (default).  
   - QUIC допустим только если явно указан флагом.

5) **Любой шаг → фиксировать в LOG.**  
   - дата/время, изменения файлов, команды тестов, результаты, риски.

---

## 2) Execution Strategy (Do in Order)

### STEP A — Discovery (обязательно)
**Цель:** подтвердить текущие точки запуска и окружение.

1) Проверить, что Vite поднимается через `scripts/run_local.py` и доступен:
   - `http://127.0.0.1:5173/` внутри WSL
2) Проверить наличие бинарей:
   - `cloudflared --version`
   - `caddy version`

✅ Результаты (OK/FAIL + команды) занести в `docs/devtools/TUNNEL_DEV_IMPLEMENTATION_LOG.md` (блок A).

---

### STEP B — Create the new script `scripts/run_tunnel_dev.py`
**Цель:** реализовать CLI + проверку Vite + запуск Caddy + запуск cloudflared.

Обязательные функции/модули (минимум):
- CLI args (как в SPEC)
- verify Vite URL с retry до timeout (если `--verify=true`)
- генерация bcrypt через `caddy hash-password --plaintext ...`
- создание временного Caddyfile в `/tmp/...`
- запуск `caddy run --config <temp> --adapter caddyfile` как subprocess
- проверка прокси (ожидаемый `401` без авторизации)
- запуск `cloudflared tunnel --url http://localhost:<proxy-port> --no-autoupdate --protocol http2`
- парсинг публичного URL `https://*.trycloudflare.com` из stdout
- корректный shutdown по Ctrl+C: закрыть cloudflared → закрыть caddy → удалить temp Caddyfile

✅ Обновить LOG (блок B) + перечислить созданные функции и пути файлов.

---

### STEP C — Documentation (README)
**Цель:** сделать запуск “без вопросов”.

Создать `docs/devtools/TUNNEL_DEV_README.md`:
- Quick start (Vite → Tunnel)
- Примеры:
  - `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py`
  - смена портов
  - отключение verify
- Troubleshooting:
  - “Vite not reachable”
  - “Port 8080 busy”
  - “QUIC fails / use http2”
  - “cloudflared/caddy not installed”

✅ Обновить LOG (блок C).

---

### STEP D — Manual QA (обязательно)
**Цель:** подтвердить, что реально защищено паролем.

Проверки:
1) Vite запущен → `run_tunnel_dev.py` стартует и печатает публичный URL
2) Публичный URL открывается и запрашивает логин/пароль (BasicAuth)
3) После ввода логина/пароля UI грузится
4) Ctrl+C корректно завершает оба процесса

✅ Записать результаты в LOG (блок D) и добавить “Acceptance checklist: PASS/FAIL”.

---

### STEP E — Git (коммиты)
Сделать коммиты в стиле Conventional Commits:

1) `feat(devtools): add run_tunnel_dev script (caddy basic auth + cloudflared http2)`
2) `docs(devtools): add tunnel dev readme + troubleshooting`
3) `chore(devtools): add tunnel dev implementation log`

✅ В LOG добавить список коммитов.

---

## 3) Deliverables (What you must provide)

1) Новый скрипт:
- `scripts/run_tunnel_dev.py`

2) Документация:
- `docs/devtools/TUNNEL_DEV_README.md`

3) Лог реализации:
- `docs/devtools/TUNNEL_DEV_IMPLEMENTATION_LOG.md`

4) В конце — краткое резюме:
- что готово
- что требует улучшений (если есть)
- известные ограничения quick tunnel

---

## 4) Anti-Scope (Do NOT do)

- Не менять `scripts/run_local.py`.
- Не добавлять Cloudflare аккаунт / named tunnel / Access — только Quick Tunnel (trycloudflare).
- Не хранить пароль/хэш в git.
- Не внедрять полноценную auth систему проекта (это только защита dev-линка).

---

## 5) Local Notes (Optional)

- Если в проекте уже есть утилиты для subprocess/логирования/CLI — можно переиспользовать, но:
  - не плодить дубли
  - обязательно задокументировать в LOG (что переиспользовано и почему).

---

**Start now with STEP A — Discovery** and begin filling the implementation log from the first command you run.
