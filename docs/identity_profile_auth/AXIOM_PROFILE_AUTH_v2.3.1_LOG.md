<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_IDENTITY_PROFILE_AUTH_AXIOM_PROFILE_AUTH_V2_3_1_LOG_MD
  title: "AXIOM PROFILE & AUTH v2.3.1 — LOG"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!--docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_LOG.md-->
<!--docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_LOG.md-->
<!-- AXIOM_AGENT_LOG_START -->
# AXIOM PROFILE & AUTH v2.3.1 — LOG

- SoT: `docs/identity_profile_auth/PROFILE_AUTH_SOT_v2.3.1.md`
- Spec: `docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_SPEC.md`
- Log: `docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_LOG.md`
- Branch: `feature/profile-auth-v2.3.1`
- Agent: Codex
- Started: 2025-12-19 14:28 (MSK)
- Finished: —

## GLOBAL STATUS

| Block | Name                           | Status       | Comment |
|-------|--------------------------------|--------------|---------|
| A     | Setup & Discovery              | DONE         | Точки интеграции найдены; структура заведена |
| B     | Dropdown (portal+fixed)        | DONE         | Portal + fixed dropdown на аватаре, устойчив к scroll/resize |
| C     | Pages                          | DONE         | Добавлены страницы profile/favorites/settings/personalization/help |
| D     | Data Layer                     | DONE         | Типы + authService/favoritesService + хуки |
| E     | Pin/Favorites Integration      | DONE         | Контентный pin переведён на favoritesService, /favorites подключён |
| F     | QA & Final                     | IN_PROGRESS  | smoke/типизация проверены; финальные прогоны e2e pending; BUG-004 открытый |

## BLOCK A — Discovery

- [x] A.1.1 Найдены файлы topbar/avatar (пути зафиксированы)
- [x] A.1.2 Найден текущий pin/favorite код (пути зафиксированы)
- [x] A.1.3 Найден файл роутинга (путь зафиксирован)
- [x] A.2.1 Создать структуру profile/auth/favorites

### STEP A.1–A.3 · Topbar/Avatar, Pin/Favorites, Routing
- Status: DONE
- Date: 2025-12-19
- Description:
  - Topbar + avatar: `app/routes/_layout.tsx` содержит шапку `ax-topbar` с кнопкой переключения языка и статичный `<div className='ax-avatar' role='img' aria-label='User avatar'>AX</div>`. Внизу layout уже есть контейнер портала `<div id='modal-root' />`.
  - Pin/Favorites: текущий пин в CONTENT хранится напрямую в localStorage key `axiom.content.pins` (см. `app/routes/dashboard/content/_layout.tsx`); контекст `useContentHub` отдаёт `pinned`, `togglePin(id)`, `isPinned(id)`, а UI использует `onTogglePin`/`isPinned` в `components/ContentList.tsx` и превью `ContentCategoryView`. Сервисного слоя нет.
  - Routing: главный роутер в `app/main.tsx` через `createBrowserRouter`; защищённые `/dashboard/*` обёрнуты `AuthGate`, контент-деталка `/content/:id` тоже под `AuthGate`. Текущее логин/сессия держится в localStorage `axiom.auth` (см. `components/AuthGate.tsx`, `app/routes/login/page.tsx`).
- Files referenced:
  - `app/routes/_layout.tsx`
  - `app/routes/dashboard/content/_layout.tsx`
  - `app/routes/dashboard/content/ContentCategoryView.tsx`
  - `components/ContentList.tsx`
  - `app/main.tsx`
  - `components/AuthGate.tsx`
  - `app/routes/login/page.tsx`
- Problems / Risks:
  - Pin хранится напрямую в localStorage без сервиса (надо заменить на favoritesService `ax_favorites_v1`).
  - AuthGate/login используют `axiom.auth` напрямую — потребуется перейти на `ax_session_v1` и сервисный слой.

## BLOCK B — Dropdown

- [x] B.1.1 Реализован portal (modal-root/body)
- [x] B.1.2 Реализован fixed positioning + anchor rect
- [x] B.2.1 Close on outside click
- [x] B.2.2 Close on Escape
- [x] B.2.3 Close on select item
- [x] B.3.1 Визуал Red Protocol
- [x] B.3.2 ARIA attrs на avatar и меню

### STEP B · Avatar dropdown
- Status: DONE
- Date: 2025-12-19
- Description:
  - Добавлен `UserMenuDropdown` (portal → `#modal-root`, `position: fixed`) с пересчётом координат при open/resize/scroll и закрытием по клику вне/ESC/выбору пункта.
  - Аватар стал кнопкой с `aria-haspopup="menu"`/`aria-expanded`; меню содержит Profile/Favorites/Personalization/Settings/Help/Logout.
  - Контейнер портала теперь берётся из `index.html` (`#modal-root`), дублирующий `div` из layout убран.
- Files referenced:
  - `components/UserMenuDropdown.tsx`
  - `app/routes/_layout.tsx`
  - `styles/red-protocol-overrides.css`
- Problems / Risks:
  - Требуется ручной прогон на разных брейкпоинтах; анимация не добавлена (только fade/hover).

## BLOCK C — Pages

- [x] C.1 /profile страница создана и доступна
- [x] C.2 /favorites страница создана и работает (list/open/unpin)
- [x] C.3 /settings страница создана
- [x] C.4 /settings/personalization страница создана
- [x] C.5 /help страница создана

### STEP C · Pages
- Status: DONE
- Date: 2025-12-19
- Description:
  - Созданы страницы профиля/избранного/настроек/персонализации/справки в стиле Red Protocol, с минимальной демо-структурой.
  - Роутер перестроен: новые маршруты под AuthGate+Layout (`/profile`, `/favorites`, `/settings`, `/settings/personalization`, `/help`) + сохранены dashboard вложенные маршруты.
- Files referenced:
  - `app/routes/profile/page.tsx`
  - `app/routes/favorites/page.tsx`
  - `app/routes/settings/page.tsx`
  - `app/routes/settings/personalization/page.tsx`
  - `app/routes/help/page.tsx`
  - `app/main.tsx`
  - `styles/red-protocol-overrides.css`
- Problems / Risks:
  - Контент страниц демо/статический; для backend придётся подключать реальные данные/формы.

## BLOCK D — Data Layer

- [x] D.1 Types добавлены (User/Session/FavoriteItem)
- [x] D.2 authService использует `ax_session_v1`
- [x] D.3 favoritesService использует `ax_favorites_v1`
- [x] D.4 UI не пишет в localStorage напрямую

### STEP D · Data layer
- Status: DONE
- Date: 2025-12-19
- Description:
  - Добавлены типы `User/UserRole/Session/FavoriteItem/FavoriteType` + сервисы `authService` (demo session, migration с `axiom.auth`, subscribe) и `favoritesService` (list/add/remove/isPinned, migration с `axiom.content.pins`).
  - Созданы хуки `useSession` и `useFavorites`; AuthGate/Login переведены на `ax_session_v1` через сервисный слой.
- Files referenced:
  - `lib/identity/types.ts`
  - `lib/identity/authService.ts`
  - `lib/identity/favoritesService.ts`
  - `lib/identity/useSession.ts`
  - `lib/identity/useFavorites.ts`
  - `components/AuthGate.tsx`
  - `app/routes/login/page.tsx`
- Problems / Risks:
  - Сервисы используют localStorage (demo); для прод потребуется API-адаптер.

## BLOCK E — Pin/Favorites Integration

- [x] E.1 Pin action подключена к favoritesService
- [x] E.2 UI показывает pinned состояние
- [x] E.3 favorites отображаются на /favorites

### STEP E · Favorites integration
- Status: DONE
- Date: 2025-12-19
- Description:
  - Контент-хаб переведён на favoritesService: pinned-ids берутся из `ax_favorites_v1`, togglePin формирует FavoriteItem по контенту.
  - `/favorites` показывает сервисные записи (search + type filter + unpin/open). Bootstrap e2e обновлён на ключи `ax_session_v1`/`ax_favorites_v1`.
- Files referenced:
  - `app/routes/dashboard/content/_layout.tsx`
  - `app/routes/favorites/page.tsx`
  - `tests/e2e/utils.ts`
  - `styles/red-protocol-overrides.css`
- Problems / Risks:
  - Сортировка простая (новые сверху), drag/drop и бэкенд-синк не реализованы.

## BLOCK F — QA & Final

- [ ] F.1 Dropdown стабилен при scroll/resize
- [ ] F.2 Favorites сохраняются после F5
- [ ] F.3 Все роуты открываются без ошибок
- [ ] F.4 Финальный summary в LOG заполнен

### STEP F · QA
- Status: IN_PROGRESS
- Date: 2025-12-19
- Description:
  - Выполнен `tsc --noEmit` (через `node_modules/typescript/bin/tsc` из Windows node; `npm run typecheck` падает из-за UNC/CMD ограничений).
  - Dropdown позиция скорректирована (центрируется относительно аватара, clamped к viewport); стили обновлены ближе к референсу.
  - Актуальный дефект: меню всё ещё смещено от аватара (BUG-004); требуется доп. правка позиционирования.
- Files referenced:
  - `node_modules/typescript/bin/tsc`
  - `components/UserMenuDropdown.tsx`
  - `styles/red-protocol-overrides.css`
  - `docs/bugs/BUG-004_avatar-dropdown-offset.md`
- Problems / Risks:
  - E2E/ручные прогоны (dropdown scroll/resize, favorites persist, маршруты) ещё не выполнены; требуется повторный прогон после сборки.

## OPEN ITEMS / NEXT STEPS
- BUG-004: исправить позиционирование avatar dropdown (прилипание к аватару при scroll/resize).
- Полноценная регистрация: текущее демо-хранилище аккаунтов локальное; в будущих спринтах требуется persist/CRUD с бекендом и UX (логин/регистрация).
- Финальные QA: ручной прогон dropdown, favorites (add/remove/persist), все роуты; e2e прогнать после фикса BUG-004.
