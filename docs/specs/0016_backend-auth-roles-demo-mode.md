<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_SPECS_0016_BACKEND_AUTH_ROLES_DEMO_MODE
  title: "SPEC — Backend Auth + Roles (Local) + Demo Mode (GH Pages)"
  status: ACTIVE
  mode: Spec
  goal: "Define backend auth, role system, and demo mode for AXIOM WEB CORE UI"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-09
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

# SPEC — Backend Auth + Roles (Local) + Demo Mode (GH Pages)

## 0) Контекст
Backend как отдельный слой пока отсутствует. Нужен минимальный фундамент: auth, роли, сессии для локального запуска и демо‑режим для GitHub Pages без сервера.

## 1) Цели
### 1.1 Local (полноценный режим)
- регистрация/логин/логаут
- server‑side sessions (cookie HttpOnly)
- SQLite хранилище пользователей/сессий
- роли: `user` (default), `creator`, `test`
- guard’ы: public vs protected маршруты + роли

### 1.2 GitHub Pages (demo оболочка)
- demo auth через localStorage/IndexedDB
- роль всегда `user`
- creator/admin UI скрыт
- read‑only оболочка

## 2) Архитектура
### 2.1 Deploy target
`AX_DEPLOY_TARGET = local | ghpages`
- `local` → backend включён (cookie sessions + SQLite)
- `ghpages` → demo auth (без backend)

Определение режима:
- `import.meta.env.VITE_AX_DEPLOY_TARGET`
- fallback: hostname `.github.io`

### 2.2 Хранилище (Local)
SQLite файл: `apps/axiom-web-core-ui/runtime/auth.sqlite`  
`runtime/` в `.gitignore`.

## 3) Backend API (Local)
Endpoints:
- `POST /api/auth/register` (только при `AX_ALLOW_REGISTER=1`)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Admin (creator‑only):
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`

## 4) Модель данных
`users`, `user_roles`, `sessions` как в исходном SPEC.

## 5) Seeds
- `creator` создаётся только если заданы `AX_CREATOR_EMAIL` + `AX_CREATOR_PASSWORD`
- `test` создаётся при `AX_SEED_TEST=1` (default creds по env)

## 6) Security baseline
- `argon2id`, HttpOnly cookies, SameSite=Lax, Secure в prod
- TTL: `AX_SESSION_TTL_DAYS` (default 14)
- logout = revoke

## 7) Demo mode (GH Pages)
- localStorage auth
- роль всегда `user`
- admin UI скрыт/недоступен

## 8) UI Guarding
- `AuthGate` проверяет `/api/auth/me` (local) или demo session (ghpages)
- `RoleGate` скрывает creator/test

## 9) Integration
- Vite proxy `/api` → backend порт
- scripts: `dev:api`, `dev:full`
- `ui:walk`/e2e используют test creds при local (через env)

## 10) Definition of Done
Local:
- `dev:full` поднимает фронт+бек
- `/api/auth/login` работает (cookie)
- protected UI закрыт без логина
- SQLite лежит в runtime и не коммитится

GH Pages:
- build с `VITE_AX_DEPLOY_TARGET=ghpages`
- demo login/registration работает локально
- creator/admin UI скрыт
