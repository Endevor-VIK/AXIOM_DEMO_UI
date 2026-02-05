<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_IDENTITY_PROFILE_AUTH_PROFILE_AUTH_SOT_V2_3_1_MD
  title: "AXIOM_DEMO_UI — PROFILE & AUTH v2.3.1 — SOURCE OF TRUTH"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!--docs/identity_profile_auth/PROFILE_AUTH_SOT_v2.3.1.md-->
<!-- AXIOM SOURCE OF TRUTH -->
# AXIOM_DEMO_UI — PROFILE & AUTH v2.3.1 — SOURCE OF TRUTH

> **Goal Directory (docx):** `docx/identity_profile_auth/`  
> **Truth File (md for integration):** `docs/identity_profile_auth/PROFILE_AUTH_SOT_v2.3.1.md`  
> **Status:** DRAFT (Source of Truth)  
> **Branch:** `feature/profile-auth-v2.3.1`  
> **Scope:** Demo UX now → Full auth/profile later (backend-ready)

---

## 00 — PURPOSE & OUTCOME

Цель спринта: зафиксировать **единый файл-источник правды (SoT)** по внедрению **User Profile / Auth / Favorites** в AXIOM_DEMO_UI.

Результат: документ, который определяет:
- UX-логику профиля (demo и full)
- структуру UI: что является **слоем** (overlay/dropdown), а что **полной страницей**
- архитектуру данных и подготовку к backend
- требования по устойчивости к текущим проблемам `scale/transform` и scroll (важно для overlay/menus)

---

## 01 — CURRENT STATE

### 01.1 Existing
- В topbar присутствует **кнопка user avatar** (`User avatar`) — сейчас демо/референс.
- Уже есть функционал **закрепления в избранное (pin/favorites)** в контенте.
- Есть проблемы с `scale` и поведением элементов при resize/оконном режиме (см. баг-лог `docs/bugs/`).

### 01.2 Problem
Overlay/menus ломаются, если:
- рендерятся внутри контейнера с `transform: scale(...)`
- позиционируются как `absolute` в документе, а не фиксируются к viewport

---

## 02 — PRINCIPLES (MUST)

1) **Portal-first для overlay**  
Все UI-слои (dropdown, overlay, modal) рендерятся через portal в корневой слой (`#modal-root` или `document.body`), чтобы не зависеть от `transform/scale`.

2) **Fixed positioning для меню и overlay**  
Dropdown и overlay должны использовать `position: fixed` и вычисление координат якоря через `getBoundingClientRect()`.

3) **Demo now, Backend-ready later**  
На текущем этапе всё работает в DEMO-режиме (localStorage + store), но структура данных и сервисы проектируются так, чтобы заменить на API без переписывания UI.

4) **Чёткое разделение: Layer vs Page**  
Быстрые действия → слой (dropdown).  
Редактирование/настройки/списки → отдельные страницы.

---

## 03 — UX STRUCTURE

### 03.1 Entry Point
- `UserAvatarButton` в topbar → открывает `UserMenuDropdown` сверху-вниз.

### 03.2 UserMenuDropdown (Layer)
**Вид:** dropdown, якорится к avatar, раскрывается **сверху вниз**.  
**Закрытие:** клик вне, ESC.

**Состав (v1):**
- Header:
  - `displayName` (например: CREATOR)
  - `handle` (например: @endeavor_prime)
  - (опционально) badge: DEV/DEMO
- Actions:
  1) **Profile** → `/profile`
  2) **Favorites** → `/favorites`
  3) **Personalization** → `/settings/personalization`
  4) **Settings** → `/settings`
  5) **Help** → `/help`
  — divider —
  6) **Logout** → demo: reset session (clear local state) + redirect `/`

> Future slot:
- `Admin` (если role=admin) → `/admin`
- `AXIOM CHAT` → `/axiom-chat` (disabled/coming soon)

---

## 04 — PAGES (Full layouts)

### 04.1 `/profile` — Profile Page (Full page)
**Назначение:** центр идентичности пользователя.

**v1 Sections (demo):**
- Overview (карточка пользователя)
- Quick stats (optional)
- Shortcuts (to favorites/settings)

**v2 Sections (full):**
- Account (email/username)
- Security (password, sessions)
- Preferences (language/theme/mode)
- Integrations (future)

### 04.2 `/favorites` — Favorites Page (Full page)
**Назначение:** быстрый доступ к закреплённым сущностям.

**v1 Features (demo, must):**
- List/cards of pinned items
- Search by title/tags
- Filter by type (ALL / Characters / Locations / Tech / Factions / Events / Lore)
- Actions: `Open`, `Unpin`
- Persistence: **localStorage**

**v2 Features (full):**
- manual ordering (drag&drop)
- folders/collections
- notes per item
- sync with backend

### 04.3 `/settings` — Settings Page (Full page)
**v1:** заглушка + структура секций.  
**v2:** полноценная (profile preferences, interface, security)

### 04.4 `/settings/personalization` — Personalization (Full page)
UI-режимы, визуальные параметры, возможно: плотность, анимации, режимы.

### 04.5 `/help` — Help (Full page)
Справка, ссылки на docs/roadmap, контакты/feedback.

---

## 05 — WHAT IS LAYER vs WHAT IS PAGE

### 05.1 Layer (portal + fixed)
- `UserMenuDropdown` (из topbar)
- (future) Modals (confirm logout, delete favorites, etc.)

### 05.2 Full Pages
- `/profile`
- `/favorites`
- `/settings`
- `/settings/personalization`
- `/help`

---

## 06 — DATA MODEL (DEMO → FULL)

### 06.1 User (demo)
```ts
type UserRole = "guest" | "user" | "admin";

type User = {
  id: string;               // demo uuid or "demo-user"
  displayName: string;      // "CREATOR"
  handle: string;           // "@endeavor_prime"
  avatarUrl?: string;       // optional
  role: UserRole;           // "user" in demo
  lang?: "RU" | "EN";
};

```

# LINK

[AXIOM_PROFILE_AUTH_v2.3.1_SPEC.md](AXIOM_PROFILE_AUTH_v2.3.1_SPEC.md)
[AXIOM_PROFILE_AUTH_v2.3.1_LOG.md](AXIOM_PROFILE_AUTH_v2.3.1_LOG.md)