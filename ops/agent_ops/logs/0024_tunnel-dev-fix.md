<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0024_TUNNEL_DEV_FIX_MD
  title: "GLOBAL LOG — 0024_tunnel-dev-fix"
  status: DONE
  mode: Log
  goal: "Stabilize dev tunnel (host header + hash defaults)"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Append-only"
-->

# GLOBAL LOG — 0024_tunnel-dev-fix

- Старт: 2026-02-09T22:27:21+03:00
- Агент: Codex (GPT-5)
- Репозиторий: AXIOM WEB CORE UI
- Ветка: main
- Задача: Стабилизировать туннель devtools (BasicAuth + cloudflared)
- SPEC: —
- Статус: DONE

---

## Step A — Discovery
- 2026-02-09T22:27:21+03:00 — Действие: Зафиксировать запрос CREATOR и проверить скрипты devtools (run_tunnel_dev/run_tunnel_dev_auto). → Результат: OK
- 2026-02-09T22:27:21+03:00 — Действие: Выявить риски (Host header блокируется Vite; дефолтные пути bcrypt не совпадают между helper/runner). → Результат: OK

## Step B — Implementation
- 2026-02-09T22:27:21+03:00 — Действие: Обновить run_tunnel_dev.py: форсировать Host header на upstream, унифицировать поиск bcrypt, использовать 127.0.0.1 для cloudflared таргета. → Результат: OK

## Step C — Documentation
- 2026-02-09T22:27:21+03:00 — Действие: Документация без изменений (поведение теперь соответствует текущему README). → Результат: SKIP

## Step D — QA
- 2026-02-09T22:27:21+03:00 — Действие: `python3 -m py_compile scripts/devtools/run_tunnel_dev.py`. → Результат: OK
- 2026-02-09T22:27:21+03:00 — Действие: Локальный запуск cloudflared/caddy не выполнялся в среде агента. → Результат: SKIP

## Step E — Git
- 2026-02-09T22:27:21+03:00 — Commit: `d447e65` — `fix(devtools): stabilize tunnel host/hash defaults` — Файлы: `scripts/devtools/run_tunnel_dev.py`
- 2026-02-09T22:27:21+03:00 — Commit: `TBD` — `docs(ops): update tunnel dev log/index` — Файлы: `ops/agent_ops/logs/0024_tunnel-dev-fix.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`

---

## Заметки / Решения
- Caddy теперь принудительно устанавливает Host заголовок на upstream, чтобы Vite не блокировал запросы по trycloudflare домену.
- Поиск bcrypt теперь согласован с helper: сначала локальный файл, затем fallback в ~/.axiom_tunnel_dev.

## Риски / Открытые вопросы
- Требуется проверка в реальном окружении с установленными cloudflared/caddy.

## Чеклист приёмки
- [ ] Туннель отдаёт Vite без ошибки host-block
- [ ] Hash по умолчанию подхватывается из scripts/devtools/data/auth.bcrypt (если существует)
