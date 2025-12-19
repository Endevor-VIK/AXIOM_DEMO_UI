# TUNNEL_DEV_README — защищённый Quick Tunnel для Vite

Вспомогательный раннер: поднимает Caddy с BasicAuth и Cloudflare Quick Tunnel поверх уже запущенного Vite dev сервера.

## Предпосылки
- Vite запущен отдельно (например, `python3 scripts/run_local.py` или `npm run dev`) на `http://127.0.0.1:5173` по умолчанию.
- На PATH доступны `cloudflared` (`cloudflared --version`) и `caddy` (`caddy version`).
- Пароль берём из окружения (по умолчанию `AXIOM_TUNNEL_PASS`) или передаём `--auth-pass`. Секреты в git не коммитим.

## Быстрый старт
1) Запустите Vite: `python3 scripts/run_local.py` (или аналог).  
2) Экспортируйте пароль: `export AXIOM_TUNNEL_PASS='StrongPassHere'`  
   или подготовьте bcrypt и сохраните в файле, затем:  
   `python3 scripts/run_tunnel_dev.py --auth-hash-file /path/to/bcrypt.txt`  
3) Поднимите туннель: `python3 scripts/run_tunnel_dev.py`.  
4) Дождитесь вывода:
   - `Vite: http://127.0.0.1:5173 (OK)`
   - `Proxy (BasicAuth): http://127.0.0.1:8080 (401 expected)`
   - `Tunnel: https://....trycloudflare.com`
   - `Auth user: axiom` (по умолчанию)  
   Остановить: `Ctrl+C` (cloudflared → caddy, удаляется временный Caddyfile).

## Частые примеры
- Генерация/хранение bcrypt (один раз):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/tunnel_auth_helper.py init`  
  (по умолчанию пишет в `~/.axiom_tunnel_dev/auth.bcrypt`, вне репозитория).
- Использовать готовый bcrypt без ввода пароля:  
  `python3 scripts/run_tunnel_dev.py --auth-hash-file ~/.axiom_tunnel_dev/auth.bcrypt`
- Другой порт Vite:  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --vite-port 5174`
- Свой URL Vite (заменяет host/port):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --vite-url http://127.0.0.1:5173`
- Другой порт прокси:  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --proxy-port 8081`
- Отключить verify (не рекомендуется):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --verify false`
- Протокол (по умолчанию http2; quic может быть нестабилен):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --protocol http2`

## Флаги (шпаргалка)
- `--auth-user` по умолчанию `axiom`; пароль через `--auth-pass` или env `--auth-pass-env` (по умолчанию `AXIOM_TUNNEL_PASS`).
- `--auth-hash-file` — путь к файлу с готовым bcrypt (пропускает ввод пароля/ENV). Если файл не указан, но существует `~/.axiom_tunnel_dev/auth.bcrypt`, он будет использован автоматически. Флаг `--write-hash-file` сохранит сгенерированный bcrypt в этот файл.
- `--proxy-port` по умолчанию `8080` (BasicAuth reverse proxy).
- `--edge-ip-version` по умолчанию `4`; оставляйте http2, если нет явной причины идти в quic.
- `--tunnel-url` — свой таргет для cloudflared (по умолчанию локальный прокси). Если меняете, убедитесь, что BasicAuth всё ещё защищает цель.

## Troubleshooting
- **Vite не отвечает**: убедитесь, что dev сервер запущен на нужном host/port; проверьте `curl http://127.0.0.1:5173/`. Можно указать `--vite-url`. В крайнем случае `--verify false` (не рекомендуется).
- **WSL1**: Vite может падать с `WSL 1 is not supported`. Используйте WSL2 или другой хост и пробросьте `--vite-url`.
- **Порт 8080 занят**: выберите другой (`--proxy-port 8081`) или освободите порт.
- **QUIC/UDP отваливается**: используйте дефолтный `--protocol http2`. Если quic флапает, вернитесь на http2.
- **Нет cloudflared/caddy**: установите caddy (https://caddyserver.com/docs/install) и cloudflared (Quick Tunnel бинарь по документации Cloudflare). Проверьте `caddy version` / `cloudflared --version`.
- **Нет публичного URL**: Quick Tunnel может задерживаться из-за сети/лимитов Cloudflare; скрипт затаймаутит и покажет последние строки. Повторите позже или проверьте VPN/фаервол.

## Безопасность
- Пароль не печатается в открытом виде (только маска).
- Секреты держим в окружении или локальном `.env.local` (уже в .gitignore); не коммитим. Если используете файл с bcrypt, храните его вне git (по умолчанию `~/.axiom_tunnel_dev/auth.bcrypt`).
- `scripts/run_local.py` не трогаем; туннель ожидает уже запущенный Vite.
