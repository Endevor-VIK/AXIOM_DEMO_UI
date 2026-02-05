<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_BUGS_AUDIT_FULL_PROJECT_V2_3_1_MD
  title: "AXIOM_DEMO_UI — Полный аудит (v2.3.1)"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

# AXIOM_DEMO_UI — Полный аудит (v2.3.1)

## 1) Overview
- Область: весь фронтенд (routing/UI/content/reader/build). Цель — найти регрессии, риски, производительность, безопасность.
- Диагностика: `npm run typecheck` не выполнен — в текущем шелле нет `node` (`/bin/bash: node: command not found`). Нужен повтор в окружении Node 18.18+ (потом прогнать lint/test/e2e).
- Новые карточки: BUG-007, ARCH-001, SEC-001, SEC-002, SEC-003, PERF-001. Активны ранее: BUG-001…BUG-006.

## 2) Project Map
- Вход/роутер: `app/main.tsx` (React 18, react-router-dom v6). Layout: `app/routes/_layout.tsx`, AuthGate, topbar + ticker + footer.
- Модули: Content Hub (`app/routes/dashboard/content/*`, `lib/vfs`, `components/PreviewPane.tsx`); Reader (легаси `src/features/content/*`, `/content-html/*`); Roadmap/Audit (статический HTML, `dangerouslySetInnerHTML`), News (`components/news/HeadlinesTicker.tsx`, `lib/useNewsManifest.ts`), Login (`app/routes/login/page.tsx`).
- Данные: новый VFS `public/data/content/*` + `lib/vfs/index.ts`; легаси индекс `src/features/content/data/content-index.json` + `public/content-html/*`; новости `public/data/news/manifest.json`; аудиты/roadmap под `public/data/...`.
- UI/стили: `ax-design/*`, `styles/*.css`, `components/*` (StatusLine, PanelNav, dropdowns, preview).
- Инфраструктура: Vite, Vitest, Playwright, content build `scripts/build-content.ts`, экспорт `tools/export.ts`.

## 3) Findings Summary
| Severity | Count | IDs |
|---|---|---|
| Critical | 2 | SEC-001, BUG-003 |
| High | 7 | SEC-002, SEC-003, BUG-002, BUG-005, BUG-006, BUG-007, ARCH-001 |
| Medium | 3 | BUG-001, BUG-004, PERF-001 |
| Low | 0 | — |

## 4) Top 10 Issues
1) [SEC-001](SEC-001_preview-sandbox-same-origin.md) — Sandbox-превью запускает скрипты с правами origin.  
2) [SEC-002](SEC-002_reader-unsanitized-html.md) — Reader вставляет сырой HTML без санитайза.  
3) [SEC-003](SEC-003_markdown-allows-javascript-protocol.md) — Markdown санитайз пропускает `javascript:/data:` ссылки.  
4) [BUG-003](BUG-003_reader-overlay-menu-scroll.md) — Overlay/меню Reader привязаны к верхней точке, ломаются при скролле.  
5) [BUG-007](BUG-007_reader-legacy-dataset.md) — Reader сидит на легаси-индексе, новые VFS записи не открываются.  
6) [ARCH-001](ARCH-001_dual-content-pipeline.md) — Две пайплайны контента (VFS vs legacy) → рассинхрон.  
7) [BUG-005](BUG-005_perf-animations-low-end.md) — Тяжёлые эффекты (blur/scanlines/ticker) лагают на слабых устройствах.  
8) [BUG-002](BUG-002_windowed-scale-break.md) — Scale ломается в оконном режиме.  
9) [BUG-006](BUG-006_scale-parity-windowed.md) — Несовпадение масштаба при windowed/zoom.  
10) [PERF-001](PERF-001_avatar-menu-reflow.md) — Аватар-меню пересчитывается на каждый scroll/resize.

## 5) Performance Findings
- PERF-001: глобальные scroll/resize (capture) без троттлинга в аватар-меню → layout thrash (`components/UserMenuDropdown.tsx:66-80`).  
- BUG-005 (активный): тяжёлые blur/scanlines/ticker на low-power GPU.  
- HeadlinesTicker создаёт большие клоны DOM при длинной ленте; мониторить на узких/низких частотах (`components/news/HeadlinesTicker.tsx`).  
- Content Hub фильтры: debounce 200ms ок, но ререндер списка/превью при каждом вводе — держать в фокусе при дальнейших оптимизациях.

## 6) Architecture Risks
- ARCH-001: разделение VFS и легаси стека приводит к дублированию данных и битым переходам (Reader не видит новые записи).  
- SEC-001: sandbox без изоляции (allow-same-origin) — риск XSS/утечки сессии.  
- SEC-003: конфиг DOMPurify допускает опасные протоколы.  
- SEC-002: легаси Reader без санитайза. Совокупно — высокий риск безопасности/каноничности данных.

## 7) Build/CI/Dev Findings
- Проверки не выполнены из-за отсутствия `node`. Требуется: `npm run typecheck && npm run test && npm run test:e2e` в среде Node 18.18+.  
- Скрипты: `npm run build` (content → vite), `npm run validate:content` (schema), `npm run export` (static).  
- Логи dev-сервера/линтера не проверены в этой сессии — прогнать после поднятия Node.

## 8) Recommendations / Roadmap
- Быстрые (≤1ч): убрать `allow-same-origin`/запретить скрипты в sandbox, санитизировать Reader HTML (SEC-001/002), троттлинг scroll/resize в аватар-меню (PERF-001).  
- Короткие (≤1 день): перевести `/content/:id` на VFS и выкинуть легаси индекс (BUG-007 + ARCH-001); добавить e2e на переход из Content Hub; закрыть SEC-003 (вернуть строгий DOMPurify).  
- Долгие: общий рефактор контент-пайплайна (единый артефакт), пересмотр тяжёлых FX/анимаций (BUG-005), доработка масштабирования (BUG-002/006/001/004).  
- Порядок спринта: (1) SEC-001/002/003, (2) BUG-007 + ARCH-001, (3) PERF-001 + BUG-005, (4) масштаб/оверлеи.

## 9) Appendix
- Команды: `ls`, чтение маршрутов/компонентов; попытка `npm run typecheck` → fail (нет node).  
- Ключевые ссылки на код: `app/main.tsx`, `app/routes/_layout.tsx`, `app/routes/dashboard/content/_layout.tsx`, `components/PreviewPane.tsx`, `src/features/content/pages/ReaderPage.tsx`, `components/UserMenuDropdown.tsx`.
