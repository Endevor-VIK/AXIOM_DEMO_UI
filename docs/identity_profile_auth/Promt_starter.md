<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_IDENTITY_PROFILE_AUTH_PROMT_STARTER_MD
  title: "PROMPT_STARTER — AXIOM PROFILE & AUTH v2.3.1 (Agent Entry)"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!--docs/identity_profile_auth/Promt_starter.md-->
<!-- STARTER: docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_SPEC.md-->

# PROMPT_STARTER — AXIOM PROFILE & AUTH v2.3.1 (Agent Entry)

> **Branch:** `feature/profile-auth-v2.3.1`  
> **Repo:** `AXIOM_DEMO_UI`  
> **Mission:** Реализовать демо-профиль/авторизацию + избранное (pins/favorites) + dropdown по avatar + страницы профиля/настроек/избранного, строго по SoT и SPEC.  
> **Output:** Код + заполненный LOG + понятные коммиты.

---

## 0) 🔗 Mandatory Reference Files (Read First)

Агент **обязан** сначала открыть и прочитать эти документы (в репозитории):

1) **Source of Truth (главный документ цели):**  
   - `docs/identity_profile_auth/PROFILE_AUTH_SOT_v2.3.1.md`

2) **SPEC (ТЗ, подробные требования и критерии):**  
   - `docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_SPEC.md`

3) **LOG (вести в процессе выполнения):**  
   - `docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_LOG.md`

> Правило: если возникает конфликт между интерпретацией и документами — **SoT → SPEC → LOG** (в таком порядке).

---

## 1) Prime Rules (Non-negotiable)

1) **Ветка:** работать только в `feature/profile-auth-v2.3.1`.  
2) **Reader/scale баги не фиксить в этой ветке глубоко.**  
   - Вместо этого реализовать dropdown/overlay так, чтобы **не зависеть от transform/scale**:  
     ✅ Portal + `position: fixed` + anchor positioning через `getBoundingClientRect()`.  
3) **Никаких прямых записей в localStorage из UI.**  
   - Только через сервисный слой (`authService`, `favoritesService`).  
4) **Любой шаг → фиксировать в LOG:**  
   - статус, дата, файлы, что изменено, проблемы/риски.

---

## 2) Execution Strategy (Do in Order)

### STEP A — Discovery (обязательно)
**Цель:** найти точки интеграции в текущем коде.

1) Найти, где формируется topbar и где находится `User avatar` (кнопка-аватар).  
   - Поиск: `ax-avatar`, `User avatar`, `topbar`, `header`, `actions`.
2) Найти текущую реализацию pin/favorites (закрепить).  
   - Поиск: `pin`, `favorite`, `bookmark`, `star`, `закреп`, `избран`.
3) Найти роутинг/маршруты приложения.  
   - Поиск: `routes`, `router`, `react-router`, `createBrowserRouter`, `Route`.

✅ Все найденные пути и ключевые фрагменты занести в **LOG** (блок A).

---

### STEP B — UI Layer: Avatar → Dropdown (portal + fixed)
**Цель:** сделать стабильный dropdown, независимый от scale/transform.

1) Реализовать portal target:
   - использовать `#modal-root` (создать при отсутствии) или `document.body`.
2) Реализовать fixed positioning + anchor positioning:
   - вычисление позиции от `anchorEl.getBoundingClientRect()`
   - пересчет при open + `resize` + `scroll`.
3) Поведение:
   - open/close
   - close on outside click
   - close on ESC
   - close on select menu item
4) Состав меню — строго как в SoT/SPEC:
   - Profile → `/profile`
   - Favorites → `/favorites`
   - Personalization → `/settings/personalization`
   - Settings → `/settings`
   - Help → `/help`
   - Logout → demo logout

✅ Обновить **LOG** (блок B).

---

### STEP C — Pages (full layout routes)
Создать и подключить страницы:
- `/profile`
- `/favorites`
- `/settings`
- `/settings/personalization`
- `/help`

Минимальный UI в стиле Red Protocol, без визуальных выбросов.  
✅ Обновить **LOG** (блок C).

---

### STEP D — Data Layer (types/services/storage)
1) Типы:
- `User`, `Session`, `UserRole`
- `FavoriteItem`, `FavoriteType`

2) `authService` (demo):
- `getSession()`
- `loginDemo()` или `setDemoUser()`
- `logout()`
- localStorage key: `ax_session_v1`

3) `favoritesService` (demo):
- `list()`
- `add(item)`
- `remove(key)`
- `isPinned(key)`
- localStorage key: `ax_favorites_v1`

✅ Обновить **LOG** (блок D).

---

### STEP E — Integrate Existing Pin
Подключить существующую кнопку pin к `favoritesService`:
- pin добавляет `FavoriteItem`
- unpin удаляет
- pinned/unpinned состояние отображается корректно
- `/favorites` показывает актуальный список

✅ Обновить **LOG** (блок E).

---

### STEP F — QA & Final
Пройти сценарии:
- dropdown: open/close/esc/outside, scroll/resize устойчивость
- favorites: add/remove/persist после F5
- роуты открываются без ошибок

✅ Обновить **LOG** (блок F) и заполнить SUMMARY.

---

## 3) Deliverables (What you must provide)

1) Рабочий код в ветке `feature/profile-auth-v2.3.1`.
2) Заполненный лог:  
   - `docs/identity_profile_auth/AXIOM_PROFILE_AUTH_v2.3.1_LOG.md`
3) Коммиты с понятными сообщениями (пример):
   - `feat(profile): add avatar dropdown with portal positioning`
   - `feat(favorites): add favorites service + favorites page`
   - `feat(routes): add profile/settings/help routes`
4) В конце — краткое резюме:
   - какие файлы созданы/изменены
   - какие риски/открытые хвосты остались
   - что готово к backend интеграции

---

## 4) Anti-Scope (Do NOT do)

- Не чинить глубоко reader/scale баги в этой ветке.
- Не добавлять полноценный backend/админку (только подготовка и контракт).
- Не писать “напрямую” в localStorage из UI.

---

## 5) Local Notes (Optional)
Если в проекте уже есть существующие утилиты/хуки для:
- portal
- overlay
- routing
- storage
— использовать их вместо создания дублей, но **обязательно** задокументировать выбор в LOG.

---

**Start now with STEP A — Discovery** and begin filling the LOG from the first action.
