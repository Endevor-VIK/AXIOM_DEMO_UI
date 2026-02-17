<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_DEVTOOLS_TUNNEL_DEV_README_MD
  title: "TUNNEL_DEV_README — туннель для Vite"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-17
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

# TUNNEL_DEV_README — туннель для Vite

Вспомогательный раннер: поднимает Caddy reverse-proxy и localtunnel поверх уже запущенного Vite dev сервера.
По умолчанию BasicAuth отключён (вход по публичному URL без браузерного диалога user/pass).

## Предпосылки
- Vite запущен отдельно (например, `python3 scripts/devtools/run_local.py` или `npm run dev`) на `http://127.0.0.1:5173` по умолчанию.
- На PATH доступны `caddy` (`caddy version`) и `npx` (Node.js) для запуска localtunnel.
- Для базового quick-start пароль не нужен (BasicAuth выключен).
- `auth.bcrypt` нужен только если вы специально включаете BasicAuth (`--basic-auth true`).

## Быстрый старт
1) Запустите Vite: `python3 scripts/devtools/run_local.py` (или аналог).  
2) Поднимите туннель: `python3 scripts/devtools/run_tunnel_dev.py`.  
3) Дождитесь вывода:
   - `Vite: http://127.0.0.1:5173 (OK)`
   - `Proxy: http://127.0.0.1:8080 (no auth)`
   - `Tunnel: https://....loca.lt` (или `localtunnel.me`)
   Остановить: `Ctrl+C` (localtunnel → caddy, удаляется временный Caddyfile).

## Частые примеры
- Генерация/хранение bcrypt (один раз):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/devtools/tunnel_auth_helper.py init`  
  или интерактивное меню: `python3 scripts/devtools/tunnel_auth_helper.py menu`  
  (по умолчанию пишет в `scripts/devtools/data/auth.bcrypt`, каталог gitignore).
- Включить BasicAuth и использовать готовый bcrypt:  
  `python3 scripts/devtools/run_tunnel_dev.py --basic-auth true --auth-hash-file ~/.axiom_tunnel_dev/auth.bcrypt`
- Другой порт Vite:  
  `python3 scripts/devtools/run_tunnel_dev.py --vite-port 5174`
- Свой URL Vite (заменяет host/port):  
  `python3 scripts/devtools/run_tunnel_dev.py --vite-url http://127.0.0.1:5173`
- Другой порт прокси:  
  `python3 scripts/devtools/run_tunnel_dev.py --proxy-port 8081`
- Отключить verify (не рекомендуется):  
  `python3 scripts/devtools/run_tunnel_dev.py --verify false`

## Автоматический запуск (Vite + Tunnel одним шагом)
- Подготовка хэша не обязательна.
- Запустите обёртку:  
  `python3 scripts/devtools/run_tunnel_dev_auto.py`
  - если Vite уже запущен и отвечает, скрипт его переиспользует (флаг `--reuse-if-running` включён по умолчанию);
  - если нет — сам стартует `run_local.py`, дождётся готовности, потом запустит `run_tunnel_dev.py`.
- Примеры:
  - Быстрый старт без BasicAuth:  
    `python3 scripts/devtools/run_tunnel_dev_auto.py`
  - Включить BasicAuth и использовать bcrypt:  
    `python3 scripts/devtools/run_tunnel_dev_auto.py --basic-auth true --auth-hash-file ~/.axiom_tunnel_dev/auth.bcrypt`
  - Поменять порты:  
    `python3 scripts/devtools/run_tunnel_dev_auto.py --vite-port 5174 --proxy-port 8081`

## Сабдомен/host localtunnel (опционально)
- Опциональный сабдомен:  
  `python3 scripts/devtools/run_tunnel_dev.py --subdomain axiom-dev`
- Переопределить host localtunnel:  
  `python3 scripts/devtools/run_tunnel_dev.py --lt-host https://localtunnel.me`

## Флаги (шпаргалка)
- `--basic-auth` по умолчанию `false`. Пока он `false`, браузерный user/pass диалог отключён.
- `--auth-user`/`--auth-pass`/`--auth-pass-env`/`--auth-hash-file`/`--write-hash-file` применяются только если `--basic-auth=true`.
- `--default-auth-pass` — fallback для BasicAuth режима (если включён, а пароль не передан через `--auth-pass`/ENV).
- `--reuse-if-running` (в авто-обёртке) — если Vite уже отвечает, не запускает run_local.py (по умолчанию включён).
- `--proxy-port` по умолчанию `8080` (Caddy reverse proxy).
- `--subdomain` — запросить конкретный сабдомен localtunnel (может быть занят).
- `--lt-host` — host localtunnel (по умолчанию `https://loca.lt`, можно переопределить через `AXIOM_TUNNEL_LT_HOST`).

## Troubleshooting
- **Vite не отвечает**: убедитесь, что dev сервер запущен на нужном host/port; проверьте `curl http://127.0.0.1:5173/`. Можно указать `--vite-url`. В крайнем случае `--verify false` (не рекомендуется).
- **WSL1**: Vite может падать с `WSL 1 is not supported`. Используйте WSL2 или другой хост и пробросьте `--vite-url`.
- **Порт 8080 занят**: выберите другой (`--proxy-port 8081`) или освободите порт.
- **Нет caddy**: установите caddy (https://caddyserver.com/docs/install). Проверьте `caddy version`.
- **Нет public URL**: localtunnel может задерживаться или быть недоступен; скрипт затаймаутит и покажет последние строки. Повторите позже или попробуйте другой `--lt-host`.
- **Видите форму username/password в браузере**: значит где-то включён `--basic-auth=true`. Для режима без панели логина запускайте без этого флага.
- **Запрос Tunnel password от loca.lt**: это отдельный gate сервиса localtunnel (не Caddy BasicAuth).

## Безопасность
- По умолчанию туннель теперь без BasicAuth. Это удобно для демо, но ссылка должна считаться публичной.
- Если нужна защита — включайте `--basic-auth=true` и используйте пароль/хэш.
- Секреты держим в окружении или локальном `.env.local` (уже в .gitignore); не коммитим. Если используете файл с bcrypt, храните его вне git (по умолчанию `scripts/devtools/data/auth.bcrypt` в gitignore).
- `scripts/devtools/run_local.py` не трогаем; туннель ожидает уже запущенный Vite.
