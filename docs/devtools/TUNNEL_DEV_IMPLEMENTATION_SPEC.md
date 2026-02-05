<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_DEVTOOLS_TUNNEL_DEV_IMPLEMENTATION_SPEC_MD
  title: "AXIOM_DEMO_UI — run_tunnel_dev.py (WSL Protected Tunnel Runner) — SPEC v0.2.3.1"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!--docs/devtools/TUNNEL_DEV_IMPLEMENTATION_SPEC.md-->

# AXIOM_DEMO_UI — run_tunnel_dev.py (WSL Protected Tunnel Runner) — SPEC v0.2.3.1

## 0) Контекст
- В проекте уже есть `scripts/run_local.py` — **его НЕ трогаем**. Он запускает Vite dev server корректно.
- Нужен **отдельный** скрипт, который поднимает **защищённый** публичный туннель к локальному dev-серверу.
- Защита нужна простая и надёжная: **Basic Auth** (логин/пароль) перед доступом к UI.
- Quick Tunnel Cloudflare (`trycloudflare`) иногда падает на QUIC/UDP, поэтому по умолчанию используем **`--protocol http2`**.

---

## 1) Цель (Definition of Done)
Создать новый скрипт:
- `scripts/run_tunnel_dev.py`

Скрипт должен:
1) Проверить, что dev-сервер доступен локально (по URL, по умолчанию `http://127.0.0.1:5173/`).
2) Поднять локальный прокси с Basic Auth (через **Caddy**) на порту (по умолчанию `8080`), который проксирует на Vite (`5173`).
3) Поднять Cloudflare Quick Tunnel (`cloudflared tunnel --url http://localhost:8080 ...`) и вывести публичный URL вида:
   - `https://xxxx.trycloudflare.com`
4) Требовать логин/пароль при заходе по публичной ссылке.
5) Корректно завершать процессы (Caddy + cloudflared) по Ctrl+C.

---

## 2) Ограничения (Non-negotiable)
- `scripts/run_local.py` **не изменяем**.
- Скрипт **не должен хранить пароль в репозитории** в открытом виде.
- Скрипт **не должен коммитить** секреты/пароли/хэши, если они уникальны для владельца.
- Скрипт должен работать в **WSL Ubuntu** (без systemd).

---

## 3) Пути и артефакты (Deliverables)
### 3.1 Код
- ✅ `scripts/run_tunnel_dev.py`

### 3.2 Документация
- ✅ `docs/devtools/TUNNEL_DEV_README.md`
  - как запускать
  - как задавать пароль
  - типовые ошибки (QUIC/UDP, 8080 занят, нет caddy/cloudflared)

### 3.3 Лог выполнения работ агентом
- ✅ `ops/agent_ops/logs/0002_tunnel-dev-implementation.md`
  - что создано/изменено/проверено
  - команды теста
  - какие проблемы обнаружены

---

## 4) CLI интерфейс (обязательный)
Скрипт должен поддерживать аргументы:

### 4.1 Источник (Vite)
- `--vite-host` (default: `127.0.0.1`)
- `--vite-port` (default: `5173`)
- `--vite-url` (optional; если задан — переопределяет host/port)

### 4.2 Защитный прокси (Caddy)
- `--proxy-port` (default: `8080`)
- `--auth-user` (default: `axiom`)
- `--auth-pass` (optional; если не задан — читаем из ENV `AXIOM_TUNNEL_PASS`)
- `--auth-pass-env` (default: `AXIOM_TUNNEL_PASS`) — имя env переменной

### 4.3 Tunnel (cloudflared)
- `--protocol` (default: `http2`)  # важно из-за QUIC/UDP проблем
- `--edge-ip-version` (default: `4`) # optional, но желательно в WSL окружениях
- `--no-autoupdate` (default: true)
- `--tunnel-url` (optional; если задан — cloudflared направлять на него; иначе на `http://localhost:<proxy-port>`)

### 4.4 Поведение
- `--verify` (default: true) — проверять, что Vite отвечает до запуска прокси/туннеля
- `--timeout` (default: 20) — сколько секунд ждать доступности Vite
- `--quiet` (default: false) — меньше логов, только ключевые строки

Примеры:
```bash
# стандартный кейс: Vite уже запущен run_local.py
python3 scripts/run_tunnel_dev.py

# другой порт Vite
python3 scripts/run_tunnel_dev.py --vite-port 5174

# другой пароль через env
AXIOM_TUNNEL_PASS='MyStrongPass' python3 scripts/run_tunnel_dev.py

# принудительно без verify (не рекомендуется)
python3 scripts/run_tunnel_dev.py --verify false
````

---

## 5) Логика работы (по шагам)

### Step A — Preflight checks

Скрипт должен проверить:

1. установлен ли `cloudflared` (`cloudflared --version`)
2. установлен ли `caddy` (`caddy version`)
3. доступен ли Vite по `http://<vite-host>:<vite-port>/` (если `--verify=true`)

Если чего-то нет:

* вывести понятную инструкцию установки (коротко)
* завершиться с exit code != 0

### Step B — Запуск Caddy (BasicAuth reverse proxy)

1. Сформировать **временный** Caddyfile (не коммитить), например в:

   * `/tmp/axiom_caddyfile_dev_auth_<pid>.caddyfile`

2. Caddyfile должен:

* слушать `:<proxy-port>`
* включать `basicauth` с bcrypt-хэшем
* проксировать на `http://<vite-host>:<vite-port>`

Пример структуры (важно: bcrypt без угловых скобок):

```caddyfile
:8080 {
  basicauth /* {
    axiom $2a$14$....
  }
  reverse_proxy 127.0.0.1:5173
}
```

3. Если пароль дан plain-text, скрипт должен:

* получить bcrypt через `caddy hash-password --plaintext "<pass>"`
* вставить bcrypt в Caddyfile

4. Запустить Caddy как subprocess:

```bash
caddy run --config <temp_caddyfile> --adapter caddyfile
```

5. Проверить, что прокси поднялся:

* `curl -I http://127.0.0.1:<proxy-port>` → ожидается `401 Unauthorized`

### Step C — Запуск cloudflared tunnel

1. Собрать команду:

```bash
cloudflared tunnel \
  --url http://localhost:<proxy-port> \
  --no-autoupdate \
  --protocol <protocol> \
  --edge-ip-version <edge-ip-version>
```

2. Парсить stdout и вытащить публичный URL:

* `https://*.trycloudflare.com`

3. Как только URL найден — вывести блок:

* Local target (vite)
* Protected local proxy
* Public URL
* Auth user
* Подсказка: “Press Ctrl+C to stop”

### Step D — Shutdown handling

По Ctrl+C скрипт обязан:

* завершить cloudflared
* завершить caddy
* удалить временный Caddyfile (если создан)
* выйти с кодом 0

---

## 6) Безопасность (обязательные требования)

1. Пароль:

* НЕ должен попадать в git
* НЕ должен печататься в stdout целиком (можно печатать маску `******`)

2. Рекомендованный способ:

* пароль задаётся через env `AXIOM_TUNNEL_PASS`
* файл `.env.local` можно использовать, но он должен быть в `.gitignore`

3. Документация должна включать:

* как безопасно задавать пароль
* предупреждение “не коммить секреты”

---

## 7) UX вывода (стандартизировать)

Скрипт должен печатать ключевые строки (минимум):

* `Vite: http://127.0.0.1:5173 (OK)`
* `Proxy (BasicAuth): http://127.0.0.1:8080 (401 expected)`
* `Tunnel: https://xxxx.trycloudflare.com`
* `Auth user: axiom`
* `Press Ctrl+C to stop`

---

## 8) Тест-план (обязательный)

### 8.1 Нормальный сценарий

1. Запустить Vite (через `run_local.py`)
2. Запустить `run_tunnel_dev.py`
3. Открыть `https://xxxx.trycloudflare.com`
4. Проверить:

* без логина: 401 / запрос пароля
* с логином: UI грузится

### 8.2 Сервер не запущен

* выключить Vite
* запустить `run_tunnel_dev.py`
* ожидаем: понятное сообщение и exit != 0

### 8.3 Порт 8080 занят

* занять 8080 или поменять `--proxy-port`
* ожидаем: скрипт сообщает, что порт занят, предлагает выбрать другой

### 8.4 QUIC/UDP проблема

* убедиться, что по умолчанию стоит `--protocol http2`
* если указать `--protocol quic` и оно ломается — скрипт должен:

  * не падать без причины
  * печатать рекомендацию “use --protocol http2”

---

## 9) Структура кода (рекомендации для агента)

* Не делать монолит.
* Рекомендуемые функции:

  * `is_command_available(cmd)`
  * `run(cmd: list[str])` / `start_process(...)`
  * `wait_http_ok(url, timeout)`
  * `caddy_hash_password(plaintext)`
  * `build_temp_caddyfile(user, bcrypt, upstream_url, proxy_port)`
  * `parse_trycloudflare_url(line)`
  * `graceful_shutdown(procs)`

---

## 10) Коммиты (Conventional Commits)

Ожидаемые коммиты:

1. `feat(devtools): add run_tunnel_dev script (caddy basic auth + cloudflared http2)`
2. `docs(devtools): add tunnel dev readme + troubleshooting`
3. `chore(devtools): add implementation log`

---

## 11) Формат implementation log (обязательный)

`ops/agent_ops/logs/0002_tunnel-dev-implementation.md` должен включать:

* что сделано по шагам A/B/C/D
* какие файлы созданы/изменены
* команды для проверки
* результат тестов
* открытые хвосты/риски

---

## 12) Definition of Done (чеклист)

* [ ] `scripts/run_tunnel_dev.py` создан и запускается в WSL
* [ ] Скрипт НЕ требует прав systemd/systemctl
* [ ] Внешний URL trycloudflare появляется и открывается
* [ ] Запрос BasicAuth реально защищает доступ
* [ ] Ctrl+C корректно гасит процессы и чистит temp файлы
* [ ] README и Implementation log добавлены
* [ ] Нет утечек паролей в репозиторий

```
