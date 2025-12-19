<!--docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_SPEC.md-->

# AXIOM_DEMO_UI · PROFILE & AUTH v2.3.1 + FAVORITES (Pins) — SPEC
Техническое задание (Часть 1 — план работ)

## 0. Общие положения

1. Под «ROOT» в этом документе всегда понимается корень репозитория `AXIOM_DEMO_UI`.
2. Все действия выполняются в ветке: `feature/profile-auth-v2.3.1`.
3. Скоуп этой ветки — **профиль/авторизация (demo→backend-ready) + избранное (pins/favorites) + UI-вход (avatar dropdown) + страницы профиля/настроек/избранного**.
4. В рамках этой ветки **не делаем глубокий фикс Reader/scale багов**. Мы проектируем меню/оверлеи так, чтобы **не зависеть от transform/scale** (portal + fixed), тем самым избегая регрессий.
5. Все изменения кода должны сопровождаться понятными коммит-сообщениями в стиле:
   - `feat(profile): ...`
   - `feat(auth): ...`
   - `feat(favorites): ...`
   - `refactor(ui): ...`
   - `chore(docs): ...`
6. При выполнении каждого пункта этого ТЗ агент обязан:
   - фиксировать **созданные** и **изменённые** файлы;
   - указывать **относительный путь от ROOT**;
   - кратко описывать, что было сделано в каждом файле;
   - вести лог в отдельном документе (см. Часть 2).

---

## 1. Цель и результат

### 1.1. Цель
Реализовать полноценный **User Entry Point** через avatar в topbar и базовую структуру **Profile/Auth/Favorites**:

- Avatar кнопка → dropdown меню (сверху вниз).
- Пункты меню ведут на отдельные **страницы** (full layout):
  - `/profile`
  - `/favorites`
  - `/settings`
  - `/settings/personalization`
  - `/help`
- Favorites (pins) должны работать уже сейчас в DEMO-режиме и быть готовыми к backend.

### 1.2. Критерий успеха (кратко)
- Dropdown стабилен при scroll/resize и **не ломается transform/scale**.
- Избранное сохраняется в localStorage и переживает F5.
- Все страницы существуют и доступны из меню.
- Архитектура содержит сервисный слой/типы/хранилище так, чтобы backend интегрировался без переписывания UI.

---

## 2. Входная точка и UX: Avatar → UserMenuDropdown

### 2.1. Где искать текущую кнопку
На текущем UI уже есть элемент аватара (пример: `div.ax-avatar`, `aria-label="User avatar"`).  
Агент обязан найти место в коде, где формируется topbar (поиск по строкам/классам):

- `ax-topbar__actions`
- `ax-avatar`
- `aria-label="User avatar"`

И на базе этого места внедрить dropdown.

### 2.2. Поведение dropdown (обязательно)
1. Открывается по клику на avatar.
2. Открывается **сверху вниз**, привязан к avatar.
3. Закрывается:
   - по клику вне dropdown,
   - по `Escape`,
   - по выбору пункта меню (после навигации).
4. Доступность (минимум):
   - avatar имеет `aria-haspopup="menu"` и `aria-expanded`.
   - dropdown имеет корректную роль (`role="menu"`/`role="dialog"` допустимо, но предпочтительно `menu`).
   - пункты меню фокусируемы.

### 2.3. Визуальный стиль
- В стиле Red Protocol (как существующий UI).
- Dropdown не “всплывает снизу”, а раскрывается вниз от avatar.
- Никаких лишних теней/градиентов, которые ломают общий стиль.

### 2.4. Состав dropdown (v1)
**Header:**
- `displayName` (например `CREATOR`)
- `handle` (например `@endeavor_prime`)
- (опционально) `badge`: `DEV` / `DEMO`

**Actions:**
1) Profile → `/profile`  
2) Favorites → `/favorites`  
3) Personalization → `/settings/personalization`  
4) Settings → `/settings`  
5) Help → `/help`  
— divider —  
6) Logout → DEMO-logout (очистка demo session) → redirect на безопасный экран (например `/` или `/dashboard`)

**Future slots (не реализовывать в этом спринте):**
- Admin (role=admin)
- AXIOM CHAT (disabled / coming soon)

---

## 3. Архитектурный MUST: Portal + Fixed (чтобы не повторить баги Reader/scale)

### 3.1. Запрещённый подход
Нельзя рендерить dropdown внутри контейнеров, которые используют `transform: scale(...)`, иначе:
- позиционирование ломается,
- overlay “плывёт” при скролле,
- возникает эффект “меню приклеено не туда”.

### 3.2. Обязательный подход
Dropdown/overlay должны быть реализованы через:
- **Portal** в `#modal-root` или `document.body`
- позиционирование `position: fixed`
- координаты вычислять через `anchorEl.getBoundingClientRect()`

Агент обязан:
- создать/использовать `modal-root` (если нет) или утвердить использование `document.body`;
- реализовать `useAnchorPosition(anchorEl)` (или аналог), который пересчитывает позицию:
  - при открытии,
  - на `resize`,
  - на `scroll` (желательно на window).

---

## 4. Страницы (Full layout)

### 4.1. `/profile` — Profile Page
**v1 (demo):**
- Карточка пользователя:
  - displayName
  - handle
  - role badge (user/admin)
  - (опционально) avatar preview
- Блок быстрых ссылок:
  - Favorites
  - Settings
- Секции-заглушки:
  - Account (read-only)
  - Security (coming soon)

**v2 (future):**
- Редактирование профиля (name/avatar)
- Смена пароля
- Сессии устройств

### 4.2. `/favorites` — Favorites Page
**Обязательный минимум (v1 demo):**
- список избранного (cards/list)
- search по `title/tags`
- filter по type (ALL/Characters/Locations/Tech/…)
- действия:
  - Open (переход по `route`)
  - Unpin (удалить)
- Persist в localStorage

**Дополнительно (необязательно, v1.5):**
- сортировка: newest/oldest/title
- пустое состояние (no favorites) в стиле Red Protocol

### 4.3. `/settings` — Settings Page
**v1:**
- структура секций + заглушки:
  - Interface
  - Account
  - Security
- ссылки на personalization

### 4.4. `/settings/personalization` — Personalization
**v1:**
- язык (RU/EN) — если уже есть переключатель языка, интегрировать с ним, иначе сделать заглушку.
- режим/тема — только если в проекте есть соответствующая логика (иначе placeholder).

### 4.5. `/help` — Help
**v1:**
- статическая страница: ссылки на docs/roadmap/issue reporting (placeholder допускается).

---

## 5. Data model (DEMO → Backend-ready)

### 5.1. User / Session
Агент обязан создать типы (TS) для:
- `UserRole = "guest" | "user" | "admin"`
- `User { id, displayName, handle, avatarUrl?, role, lang? }`
- `Session { isAuthenticated, user? }`

### 5.2. Favorites (pins)
Модель избранного (минимум):
- `FavoriteItem.key` — стабильный ключ (`${type}:${id}`)
- `id`, `type`, `title`, `route`
- `tags?`
- `createdAt`, `updatedAt`
- (future) `order`, `note`

---

## 6. Storage & Services (обязательно)

### 6.1. localStorage keys (v1)
- `ax_session_v1`
- `ax_favorites_v1`

### 6.2. Service layer
Агент обязан внедрить абстракции, чтобы UI не зависел напрямую от localStorage:

- `authService`:
  - `getSession()`
  - `loginDemo()` (или `setDemoUser()`)
  - `logout()`

- `favoritesService`:
  - `list()`
  - `add(item)`
  - `remove(key)`
  - `isPinned(key)`
  - (optional) `clear()`

Важно:
- UI компонентов не должен напрямую писать в localStorage.
- localStorage — только внутри services/storage adapters.

---

## 7. Интеграция с существующей кнопкой Pin

В проекте уже есть действие “закрепить/избранное”.  
Агент обязан:

1. Найти текущее место, где формируется pin:
   - по ключевым словам: `pin`, `favorite`, `bookmark`, `star`, `закреп`, `избран`.
2. Перевести логику на новый `favoritesService`/store так, чтобы:
   - pin добавлял `FavoriteItem`
   - unpin удалял по `key`
   - UI корректно отображал состояние (pinned/unpinned)

Если pin логика сейчас “локальная” внутри компонента — вынести её в общий слой `favorites`.

---

## 8. Routing / Navigation

Агент обязан добавить/обновить маршруты приложения в существующем роутере проекта:

- `/profile`
- `/favorites`
- `/settings`
- `/settings/personalization`
- `/help`

Требования:
- Навигация из dropdown должна работать.
- Переходы не должны ломать существующие разделы (`HOME/ROADMAP/AUDIT/CONTENT/NEWS`).

---

## 9. QA / Acceptance Criteria

### 9.1. Dropdown
- Открывается/закрывается корректно
- Не отрывается от avatar при scroll/resize
- Не ломается при изменении масштаба/оконного режима
- ESC закрывает
- Клик вне закрывает

### 9.2. Favorites
- Pin в контенте → появляется в `/favorites`
- Unpin → удаляется
- Переживает F5 (localStorage)
- Search/Filter работают

### 9.3. Pages
- Все страницы доступны
- Визуально соответствуют Red Protocol и не выбиваются по шрифтам/отступам

---

## 10. Deliverables

1) UI:
- Avatar dropdown (portal+fixed)
- Pages: profile/favorites/settings/personalization/help

2) Data layer:
- types: user/session/favorites
- services: authService + favoritesService
- storage: localStorage adapter

3) Integration:
- существующая кнопка pin подключена к favoritesService

4) Docs:
- Log ведётся агентом по шаблону (Часть 2)
- Фиксация файлов и коммитов

---

Если структура и уровень детализации ок — ниже добавлена ЧАСТЬ 2: логирование и чек-листы (агент ведёт сам).

---

# ЧАСТЬ 2 · ЛОГИКА ОТЧЁТНОСТИ И ЧЕК-ЛИСТЫ

## 11. Система статусов

- `TODO` — шаг не начат
- `IN_PROGRESS` — в работе
- `DONE` — выполнено
- `BLOCKED` — заблокировано (указать причину)
- `SKIPPED` — пропущено осознанно (обосновать)

---

## 12. Глобальный чек-лист по блокам

- `BLOCK A` — Setup & Discovery
  - A.1 — поиск текущего avatar/pin/роутинга
  - A.2 — подготовка структуры файлов для profile/auth/favorites

- `BLOCK B` — Dropdown (portal+fixed)
  - B.1 — anchor positioning
  - B.2 — open/close/escape/outside click
  - B.3 — меню и стили

- `BLOCK C` — Pages
  - C.1 — /profile
  - C.2 — /favorites
  - C.3 — /settings
  - C.4 — /settings/personalization
  - C.5 — /help

- `BLOCK D` — Data Layer
  - D.1 — types
  - D.2 — authService + storage
  - D.3 — favoritesService + storage
  - D.4 — store/state integration (если нужно)

- `BLOCK E` — Integration with existing Pin
  - E.1 — внедрение favoritesService
  - E.2 — UI state pinned/unpinned
  - E.3 — тест кейсы

- `BLOCK F` — QA & Final
  - F.1 — smoke тесты
  - F.2 — сборка/линт (если есть)
  - F.3 — финальный summary

---

## 13. Подробные чек-листы (для отметок)

### 13.1. BLOCK A — Setup & Discovery
- [ ] A.1.1 Найдены файлы topbar/avatar (зафиксированы пути в LOG)
- [ ] A.1.2 Найден текущий pin/favorite код (зафиксированы пути в LOG)
- [ ] A.1.3 Найден файл роутинга (зафиксирован путь в LOG)
- [ ] A.2.1 Создана структура `profile/auth/favorites` (пути зафиксированы)

### 13.2. BLOCK B — Dropdown
- [ ] B.1.1 Реализован portal (modal-root/body)
- [ ] B.1.2 Реализован fixed positioning + anchor rect
- [ ] B.2.1 Close on outside click
- [ ] B.2.2 Close on Escape
- [ ] B.2.3 Close on select item
- [ ] B.3.1 Визуал Red Protocol
- [ ] B.3.2 ARIA attrs на avatar и меню

### 13.3. BLOCK C — Pages
- [ ] C.1 /profile страница создана и доступна
- [ ] C.2 /favorites страница создана и работает (list/open/unpin)
- [ ] C.3 /settings страница создана
- [ ] C.4 /settings/personalization страница создана
- [ ] C.5 /help страница создана

### 13.4. BLOCK D — Data Layer
- [ ] D.1 Types добавлены (User/Session/FavoriteItem)
- [ ] D.2 authService использует `ax_session_v1`
- [ ] D.3 favoritesService использует `ax_favorites_v1`
- [ ] D.4 UI не пишет в localStorage напрямую

### 13.5. BLOCK E — Pin integration
- [ ] E.1 Pin action подключена к favoritesService
- [ ] E.2 UI показывает pinned состояние
- [ ] E.3 favorites отображаются на /favorites

### 13.6. BLOCK F — QA
- [ ] F.1 Dropdown стабилен при scroll/resize
- [ ] F.2 Favorites сохраняются после F5
- [ ] F.3 Все роуты открываются без ошибок
- [ ] F.4 Финальный summary в LOG заполнен

---

## 14. Требования к ведению лога
Лог вести по шаблону файла `AXIOM_PROFILE_AUTH_v2.3.1_LOG.md`.

Ниже этой строки агент не пишет.
