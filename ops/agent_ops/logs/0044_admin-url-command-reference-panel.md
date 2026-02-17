<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0044_ADMIN_URL_COMMAND_REFERENCE_PANEL_MD
  title: "GLOBAL LOG — 0044_admin-url-command-reference-panel"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-18
  editable_by_agents: true
  change_policy: "Append-only"
-->

<!-- ops/agent_ops/logs/0044_admin-url-command-reference-panel.md -->

# GLOBAL LOG — 0044_admin-url-command-reference-panel

- Старт: 2026-02-18T01:17:24+03:00
- Агент: Codex GPT-5
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Добавить в админку панель-справочник URL-команд UI (`?debug=1` и др.) с детальным описанием по страницам
- SPEC: —
- Статус: ACTIVE

---

## Step A — Discovery

- 2026-02-18T01:02:00+03:00 — Действие: По запросу CREATOR выполнен аудит query-параметров по боевому UI-коду (`app/`, `components/`, `lib/`, `src/`) через `rg`, исключая документацию и бандлы. → Результат: OK
- 2026-02-18T01:08:00+03:00 — Действие: Подтверждён набор активных параметров:
  - глобальные: `debug`, `scale`,
  - login: `orionQuality`,
  - content hub: `q`, `tag`, `status`, `lang`, `mode`, `item`, legacy `layout`, `view`,
  - news: `autoplay`,
  - legacy (не смонтировано в текущем router): `id`.
  → Результат: OK

## Step B — Implementation

- 2026-02-18T01:14:00+03:00 — Действие: Создан источник данных `lib/admin/urlCommandReference.ts` с полным справочником параметров (команда, страницы, значения, описание, пример, legacy-метка). → Результат: OK
- 2026-02-18T01:15:00+03:00 — Действие: В `app/routes/admin/page.tsx` добавлен новый блок `Командная панель (URL справочник)` с таблицей и поддержкой сворачивания/разворачивания. → Результат: OK
- 2026-02-18T01:16:00+03:00 — Действие: В `styles/admin-console.css` добавлены стили для табличного вывода команд и бейджа `legacy`. → Результат: OK

## Step C — Documentation

- 2026-02-18T01:17:24+03:00 — Действие: Создан GLOBAL LOG 0044 и добавлена запись в индекс `ops/agent_ops/logs/00_LOG_INDEX.md`. → Результат: OK

## Step D — QA

- 2026-02-18T01:16:34+03:00 — Действие: `npm run build -- --emptyOutDir`. → Результат: PASS.
- 2026-02-18T01:16:42+03:00 — Действие: `npm run test:run -- tests/adminAuthIsolation.spec.ts`. → Результат: PASS (3/3).

## Step E — Git

- 2026-02-18T01:17:24+03:00 — Commit: _pending_ (изменения в рабочем дереве, коммит не выполнен).

