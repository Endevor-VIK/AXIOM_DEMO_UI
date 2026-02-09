<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0027_TUNNEL_LOCALTUNNEL_FALLBACK_MD
  title: "GLOBAL LOG — 0027_tunnel-localtunnel-fallback"
  status: PAUSED
  mode: Log
  goal: "Перевести dev tunnel на localtunnel"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0027_tunnel-localtunnel-fallback

- Старт: 2026-02-09T23:32:54+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Переписать devtools туннель на localtunnel (WSL-friendly)
- SPEC: —
- Статус: PAUSED

---

## Step A — Discovery
- 2026-02-09T23:32:54+03:00 — Действие: Зафиксировать запрос CREATOR (альтернативный туннель для WSL). → Результат: OK

## Step B — Implementation
- 2026-02-09T23:32:54+03:00 — Действие: Переписать `run_tunnel_dev.py` и `run_tunnel_dev_auto.py` под localtunnel (Caddy BasicAuth + npx localtunnel). → Результат: OK
- 2026-02-09T23:32:54+03:00 — Действие: Обновить `docs/devtools/TUNNEL_DEV_README.md` под localtunnel. → Результат: OK

## Step C — Documentation
- 2026-02-09T23:32:54+03:00 — Действие: Обновление README туннеля (WSL fallback). → Результат: OK

## Step D — QA
- 2026-02-09T23:32:54+03:00 — Действие: `python3 -m py_compile` для `run_tunnel_dev.py`, `run_tunnel_dev_auto.py`. → Результат: OK
- 2026-02-09T23:32:54+03:00 — Действие: Запуск `run_tunnel_dev.py` (localtunnel) → URL получен `*.loca.lt`, локальный proxy=401. → Результат: OK
- 2026-02-09T23:32:54+03:00 — Действие: Внешний probe URL дал `503 Tunnel Unavailable` (localtunnel не держит подключение). → Результат: PARTIAL

## Step E — Git
- 2026-02-09T23:32:54+03:00 — Commit: `<hash>` — `<message>` — Файлы: `scripts/devtools/run_tunnel_dev.py`, `scripts/devtools/run_tunnel_dev_auto.py`, `docs/devtools/TUNNEL_DEV_README.md`, `ops/agent_ops/logs/0027_tunnel-localtunnel-fallback.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`

---

## Заметки / Решения
- localtunnel не требует Cloudflare edge 7844; основной путь для WSL.

## Риски / Открытые вопросы
- Внешний доступ зависит от доступности сервиса localtunnel; в WSL наблюдается `503 Tunnel Unavailable` при обращении к URL.

## Чеклист приёмки
- [x] Localtunnel URL выдаётся
- [ ] URL доступен извне (ожидаем 401/200 через BasicAuth)
