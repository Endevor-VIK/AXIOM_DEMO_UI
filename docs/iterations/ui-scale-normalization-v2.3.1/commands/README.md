<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_UI_SCALE_NORMALIZATION_V2_3_1_COMMANDS_README_MD
  title: "Команды (URL) для проверки масштаба"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/ui-scale-normalization-v2.3.1/commands/README.md -->

# Команды (URL) для проверки масштаба

Использовать в локальном/туннельном окружении, добавляя параметры к любому маршруту.

## Режимы масштаба (актуально)
- **Managed** — теперь режим по умолчанию (без параметров).
- **Legacy** — явно вызывается через `?scale=legacy`.
- Явный managed при необходимости: `?scale=managed`.

## Debug overlay
- Включение оверлея: `?debug=1`
- Поддерживаются варианты: `?debug`, `?debug=1`, `?debug=true`, `?debug=on`
- Можно совмещать с режимами: `?scale=legacy&debug=1`

## Быстрый старт (копируй/вставляй)
- Managed + Debug: `?debug=1`
- Legacy + Debug: `?scale=legacy&debug=1`
- Явный managed: `?scale=managed&debug=1`
- Legacy без debug: `?scale=legacy`

## Примеры маршрутов
- `/dashboard?debug=1`
- `/dashboard/content/all?debug=1`
- `/dashboard/content/all?scale=legacy&debug=1`
- `/dashboard/content/lore?debug=1`
- `/dashboard/content/read/CHR-AXIOM-0303?debug=1`
- `http://localhost:5173/dashboard/content/all?debug=1`

## Сравнение windowed vs fullscreen
1) Сделай два скрина **FS** и **windowed** на одном и том же URL.  
2) Важно: одинаковые `debug`/`scale` параметры и одинаковый browser zoom.  
3) На оверлее фиксируй: `mode`, `layout`, `density`, `viewport`, `composed`, `virtual`, `viewport`, `dpr`.

## Ключевые переменные (что на что влияет)
- `--ax-ui-scale-base` — базовый legacy‑скейл (FS).
- `--ax-ui-scale` — итоговый legacy‑скейл с учётом windowed.
- `--ax-density-scale` — плотность (managed).
- `--ax-viewport-scale` — масштаб окна (managed).
- `--ax-composed-scale` — итоговый composed scale.
- `--ax-virtual-w`, `--ax-virtual-h` — виртуальный размер макета.

## Зависимый код (пути)
- `lib/ui/scaleManager.ts` — режимы, debug‑флаг, расчёт масштабов.
- `components/ScaleViewport.tsx` — canvas/viewport, включение debug.
- `components/ScaleDebug.tsx` — UI оверлея.
- `styles/app.css` — legacy/managed CSS и scale‑переменные.
- `styles/tokens.css` — токены, завязанные на `--ax-scale`.
- `ax-design/tokens.css` — базовые токены и контейнеры.
- `styles/red-protocol-overrides.css` — корректировки layout при legacy.
- `app/main.tsx` — инициализация scaleManager + ScaleViewport.
