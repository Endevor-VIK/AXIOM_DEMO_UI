<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0026_TUNNEL_DEV_7844_OPEN_MD
  title: "GLOBAL LOG — 0026_tunnel-dev-7844-open"
  status: PAUSED
  mode: Log
  goal: "Open outbound 7844 + verify tunnel end-to-end"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0026_tunnel-dev-7844-open

- Старт: 2026-02-09T23:14:46+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Открыть исходящий 7844 и проверить туннель (включая проверку URL)
- SPEC: —
- Статус: PAUSED

---

## Step A — Discovery
- 2026-02-09T23:14:46+03:00 — Действие: Зафиксировать запрос CREATOR (открыть 7844, тесты, проверка URL). → Результат: OK

## Step B — Implementation
- 2026-02-09T23:14:46+03:00 — Действие: Локальный фаервол (ufw/iptables/nft) отсутствует; добавлены outbound правила Windows Firewall через `netsh` для 7844/tcp и 7844/udp. → Результат: OK
- 2026-02-09T23:14:46+03:00 — Действие: Проверка доступа к `region1.v2.argotunnel.com:7844` через `openssl s_client` (TCP доступен). → Результат: OK

## Step C — Documentation
- 2026-02-09T23:14:46+03:00 — Действие: Документация без изменений. → Результат: SKIP

## Step D — QA
- 2026-02-09T23:14:46+03:00 — Действие: Прогон `run_tunnel_dev_auto.py` с bcrypt; Vite=200, Proxy=401, Quick Tunnel URL получен. → Результат: OK
- 2026-02-09T23:14:46+03:00 — Действие: Headless probe trycloudflare URL не выполнен из WSL (DNS: Name or service not known). → Результат: PARTIAL

## Step E — Git
- 2026-02-09T23:14:46+03:00 — Commit: `<hash>` — `<message>` — Файлы: `ops/agent_ops/logs/0026_tunnel-dev-7844-open.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`

---

## Заметки / Решения
- Пароль не логируется. Проверка URL выполняется headless (curl), GUI браузер недоступен в среде агента.

## Риски / Открытые вопросы
- DNS `*.trycloudflare.com` не резолвится внутри WSL; проверка URL требуется из Windows/другой сети.

## Чеклист приёмки
- [x] Исходящий 7844 доступен (tcp)
- [ ] Tunnel URL доступен извне (HTTP 401 без BasicAuth, 200 с BasicAuth)
