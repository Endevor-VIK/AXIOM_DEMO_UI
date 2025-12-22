<!-- docs/content/demo-content-pack/stub_cleanup_report.md -->

# Отчёт об удалении заглушек — DEMO CONTENT PACK

## Удалённые заглушки (файлы)

### content-src (Content Hub v2)
- `content-src/01.01_CENTRAL_NODE.md`
- `content-src/03.00_CHARACTER_TEMPLATE.md`
- `content-src/04.00_TECH_TEMPLATE.md`
- `content-src/05.00_FACTION_TEMPLATE.md`
- `content-src/06.00_EVENT_TEMPLATE.md`

### public/assets/content
- `public/assets/content/placeholder_01.png`

### public/data/content (VFS)
- `public/data/content/locations/2025-09-06__content-demo.html`
- `public/data/content/characters/2025-09-22__character-placeholder.md`
- `public/data/content/technologies/2025-09-22__technology-placeholder.md`
- `public/data/content/factions/2025-09-22__faction-placeholder.md`
- `public/data/content/events/2025-09-22__event-placeholder.md`

## Обновления манифестов
- `public/data/content/manifest.json` (удалены placeholder-элементы, пересчитаны counts)
- `public/data/content/locations/manifest.json`
- `public/data/content/characters/manifest.json`
- `public/data/content/technologies/manifest.json`
- `public/data/content/factions/manifest.json`
- `public/data/content/events/manifest.json`

## Примечания
- Генерация `public/content-html/*` и `src/features/content/data/content-index.json` будет выполнена вручную на финальном этапе, так как `node` отсутствует в окружении (невозможно запустить `build:content`).
