<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0043_TUNNEL_NO_AUTH_DEFAULT_MD
  title: "GLOBAL LOG — 0043_tunnel-no-auth-default"
  status: DONE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-17
  editable_by_agents: true
  change_policy: "Append-only"
-->

<!-- ops/agent_ops/logs/0043_tunnel-no-auth-default.md -->

# GLOBAL LOG — 0043_tunnel-no-auth-default

- Старт: 2026-02-17T23:55:06+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Убрать браузерную панель user/pass при входе через tunnel и сделать no-auth режим постоянным default
- SPEC: —
- Статус: DONE

---

## Step A — Discovery

- 2026-02-17T23:55:06+03:00 — Действие: Получен запрос CREATOR убрать панель браузерного логина (`BasicAuth`) при входе по tunnel и сделать быстрый доступ без ввода данных. → Результат: OK
- 2026-02-17T23:56:00+03:00 — Действие: Проверен текущий pipeline `run_tunnel_dev_auto.py -> run_tunnel_dev.py`; подтверждено, что Caddy всегда включает `basicauth`, что и даёт browser prompt user/pass. → Результат: OK

## Step B — Implementation

- 2026-02-17T23:58:00+03:00 — Действие: Обновлён `scripts/devtools/run_tunnel_dev.py`:
  - BasicAuth выключен по умолчанию (`--basic-auth=false`),
  - Caddyfile теперь собирается без `basicauth` блока, если auth не включён явно,
  - readiness-check прокси разведен по режимам (`401` для auth и `2xx/3xx` для no-auth),
  - summary/log output синхронизирован под no-auth режим.
  → Результат: OK
- 2026-02-17T23:59:00+03:00 — Действие: Обновлён `scripts/devtools/run_tunnel_dev_auto.py`:
  - быстрый старт по умолчанию без BasicAuth,
  - добавлен явный переключатель `--basic-auth` для custom-режима,
  - изменены подсказки меню/summary, чтобы не обещать login/password при default запуске.
  → Результат: OK
- 2026-02-17T23:59:40+03:00 — Действие: Обновлён `docs/devtools/TUNNEL_DEV_README.md` под новую модель (no-auth default, BasicAuth только опционально). → Результат: OK

## Step C — Documentation

- 2026-02-17T23:59:55+03:00 — Действие: Создан GLOBAL LOG `0043_tunnel-no-auth-default.md`, индекс `ops/agent_ops/logs/00_LOG_INDEX.md` обновлён. → Результат: OK

## Step D — QA

- 2026-02-17T23:59:58+03:00 — Действие: `python3 -m py_compile scripts/devtools/run_tunnel_dev.py scripts/devtools/run_tunnel_dev_auto.py`. → Результат: PASS.
- 2026-02-17T23:59:59+03:00 — Действие: Локальный smoke: поднят `run_tunnel_dev.py` в no-auth режиме и проверены ответы прокси:
  - `curl http://127.0.0.1:18093/login` → `200`,
  - `curl http://127.0.0.1:18093/assets/orion/original/high/main-diffuse.ktx2` → `200`,
  - `curl -u axiom:wrong http://127.0.0.1:18093/login` → `200`.
  → Результат: PASS (подтверждено отсутствие BasicAuth-челленджа).
- 2026-02-17T23:59:59+03:00 — Действие: Проверка localtunnel URL получения. → Результат: SKIP/INFRA (в среде периодически нет ответа от localtunnel host, но no-auth прокси подтверждён локально).

## Step E — Git

- 2026-02-17T23:59:59+03:00 — Commit: SKIP (в этом сообщении выполнены только рабочие правки в дереве; коммит не запрошен CREATOR).
