<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_DEVTOOLS_TUNNEL_DEV_README_MD
  title: "TUNNEL_DEV_README — защищённый туннель для Vite"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

# TUNNEL_DEV_README — защищённый туннель для Vite

Вспомогательный раннер: поднимает Caddy с BasicAuth и localtunnel поверх уже запущенного Vite dev сервера.

## Предпосылки
- Vite запущен отдельно (например, `python3 scripts/devtools/run_local.py` или `npm run dev`) на `http://127.0.0.1:5173` по умолчанию.
- На PATH доступны `caddy` (`caddy version`) и `npx` (Node.js) для запуска localtunnel.
- Пароль берём из окружения (по умолчанию `AXIOM_TUNNEL_PASS`) или передаём `--auth-pass`. Секреты в git не коммитим.

## Быстрый старт
1) Запустите Vite: `python3 scripts/devtools/run_local.py` (или аналог).  
2) Экспортируйте пароль: `export AXIOM_TUNNEL_PASS='StrongPassHere'`  
   или подготовьте bcrypt и сохраните в файле, затем:  
   `python3 scripts/devtools/run_tunnel_dev.py --auth-hash-file /path/to/bcrypt.txt`  
3) Поднимите туннель: `python3 scripts/devtools/run_tunnel_dev.py`.  
4) Дождитесь вывода:
   - `Vite: http://127.0.0.1:5173 (OK)`
   - `Proxy (BasicAuth): http://127.0.0.1:8080 (401 expected)`
   - `Tunnel: https://....loca.lt` (или `localtunnel.me`)
   - `Auth user: axiom` (по умолчанию)  
   Остановить: `Ctrl+C` (localtunnel → caddy, удаляется временный Caddyfile).

## Частые примеры
- Генерация/хранение bcrypt (один раз):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/devtools/tunnel_auth_helper.py init`  
  или интерактивное меню: `python3 scripts/devtools/tunnel_auth_helper.py menu`  
  (по умолчанию пишет в `scripts/devtools/data/auth.bcrypt`, каталог gitignore).
- Использовать готовый bcrypt без ввода пароля:  
  `python3 scripts/devtools/run_tunnel_dev.py --auth-hash-file ~/.axiom_tunnel_dev/auth.bcrypt`
- Другой порт Vite:  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/devtools/run_tunnel_dev.py --vite-port 5174`
- Свой URL Vite (заменяет host/port):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/devtools/run_tunnel_dev.py --vite-url http://127.0.0.1:5173`
- Другой порт прокси:  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/devtools/run_tunnel_dev.py --proxy-port 8081`
- Отключить verify (не рекомендуется):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/devtools/run_tunnel_dev.py --verify false`

## Автоматический запуск (Vite + Tunnel одним шагом)
- Подготовьте пароль/хэш один раз (см. выше или `scripts/devtools/tunnel_auth_helper.py init`).
- Запустите обёртку:  
  `python3 scripts/devtools/run_tunnel_dev_auto.py`
  - если Vite уже запущен и отвечает, скрипт его переиспользует (флаг `--reuse-if-running` включён по умолчанию);
  - если нет — сам стартует `run_local.py`, дождётся готовности, потом запустит `run_tunnel_dev.py`.
- Примеры:
  - Использовать готовый хэш по умолчанию:  
    `python3 scripts/devtools/run_tunnel_dev_auto.py`
  - Задать свой файл хэша и писать в него при генерации:  
    `AXIOM_TUNNEL_PASS='...' python3 scripts/devtools/run_tunnel_dev_auto.py --auth-hash-file ~/.axiom_tunnel_dev/auth.bcrypt --write-hash-file`
  - Поменять порты:  
    `python3 scripts/devtools/run_tunnel_dev_auto.py --vite-port 5174 --proxy-port 8081`

## Сабдомен/host localtunnel (опционально)
- Опциональный сабдомен:  
  `python3 scripts/devtools/run_tunnel_dev.py --subdomain axiom-dev`
- Переопределить host localtunnel:  
  `python3 scripts/devtools/run_tunnel_dev.py --lt-host https://localtunnel.me`

## Флаги (шпаргалка)
- `--auth-user` по умолчанию `axiom`; пароль через `--auth-pass` или env `--auth-pass-env` (по умолчанию `AXIOM_TUNNEL_PASS`).
- `--auth-hash-file` — путь к файлу с готовым bcrypt (пропускает ввод пароля/ENV). Если файл не указан, но существует `scripts/devtools/data/auth.bcrypt`, он будет использован автоматически. Флаг `--write-hash-file` сохранит сгенерированный bcrypt в этот файл.
- `--reuse-if-running` (в авто-обёртке) — если Vite уже отвечает, не запускает run_local.py (по умолчанию включён).
- `--proxy-port` по умолчанию `8080` (BasicAuth reverse proxy).
- `--subdomain` — запросить конкретный сабдомен localtunnel (может быть занят).
- `--lt-host` — host localtunnel (по умолчанию `https://loca.lt`, можно переопределить через `AXIOM_TUNNEL_LT_HOST`).

## Troubleshooting
- **Vite не отвечает**: убедитесь, что dev сервер запущен на нужном host/port; проверьте `curl http://127.0.0.1:5173/`. Можно указать `--vite-url`. В крайнем случае `--verify false` (не рекомендуется).
- **WSL1**: Vite может падать с `WSL 1 is not supported`. Используйте WSL2 или другой хост и пробросьте `--vite-url`.
- **Порт 8080 занят**: выберите другой (`--proxy-port 8081`) или освободите порт.
- **Нет caddy**: установите caddy (https://caddyserver.com/docs/install). Проверьте `caddy version`.
- **Нет public URL**: localtunnel может задерживаться или быть недоступен; скрипт затаймаутит и покажет последние строки. Повторите позже или попробуйте другой `--lt-host`.

## Безопасность
- Пароль не печатается в открытом виде (только маска).
- Секреты держим в окружении или локальном `.env.local` (уже в .gitignore); не коммитим. Если используете файл с bcrypt, храните его вне git (по умолчанию `scripts/devtools/data/auth.bcrypt` в gitignore).
- Авто-обёртка использует те же секреты/хэши; убеждайтесь, что путь к хэшу лежит вне репозитория.
- `scripts/devtools/run_local.py` не трогаем; туннель ожидает уже запущенный Vite.
