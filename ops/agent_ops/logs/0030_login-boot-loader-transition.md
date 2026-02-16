<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0030_LOGIN_BOOT_LOADER_TRANSITION
  title: "GLOBAL LOG — 0030_login-boot-loader-transition"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-16
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- ops/agent_ops/logs/0030_login-boot-loader-transition.md -->

# GLOBAL LOG — 0030_login-boot-loader-transition

- Старт: 2026-02-10T19:41:16+03:00
- Агент: Codex (GPT-5)
- Репозиторий: axiom-web-core-ui
- Ветка: main
- Задача: Boot-sequence loader + переход на login (стилизованный)
- SPEC: docs/iterations/0030_login-boot-loader-transition/SPEC.md
- Статус: ACTIVE

---

## Step A — Discovery
- 2026-02-10T19:41:16+03:00 — Действие: Зафиксированы вводные CREATOR (настроение референса, показывать при каждом логине, без звуков, без ограничений) → Результат: OK
- 2026-02-11T02:49:10+03:00 — Действие: Уточнено у CREATOR: разрешение на перенос моделей с `https://orion.adrianred.com/` есть; фон нужен только на `/login`; вариант — урезанный/лёгкий → Результат: OK
- 2026-02-11T19:12:10+03:00 — Действие: Снят network trace Orion (`orion_source_requests.json`) → Результат: OK
  - Подтверждено: текстуры и материалы не встроены в `level.glb`; рендер собирается из `level.glb` + `*.ktx2` + `building1..10.glb` + basis transcoder.
  - Артефакты: `ops/artifacts/ui_scan/manual/orion_source_requests.json`, `ops/artifacts/ui_scan/manual/orion_source_probe.png`
- 2026-02-12T00:38:11+03:00 — Действие: По запросу CREATOR уточнено ограничение: движение камеры не менять (оставить parallax от курсора), требуется только правильный базовый ракурс на центр города. → Результат: OK
- 2026-02-16T20:03:44+03:00 — Действие: по запросу CREATOR подготовлен план S0-S5 для вывода 0030 на новый уровень и отдельный SPEC с quality gates; зафиксированы блокеры (typecheck + отсутствие выделенного e2e login gate) → Результат: OK

## Step B — Implementation
- 2026-02-10T19:50:03+03:00 — Действие: Добавлен boot-sequence overlay и переход в login, подключены стили → Результат: OK
- 2026-02-10T20:32:50+03:00 — Действие: уточнены тайминги boot-перехода и бэкграунд login (city + frame), добавлен glitch-акцент → Результат: OK
  - Обновлено: `app/routes/login/page.tsx`, `styles/login-boot.css`, `styles/login-bg.css`
- 2026-02-10T22:48:20+03:00 — Действие: добавлены фоновые слои (sky/haze/beams) в login и связаны со стилями → Результат: OK
  - Обновлено: `app/routes/login/page.tsx`, `styles/login-bg.css`
- 2026-02-10T23:34:20+03:00 — Действие: зафиксированы незакоммиченные правки login (OrionCityBackground WebGL, обновлён cyber overlay, совместимость шаблонов boot-lines, добавлены three deps) → Результат: OBSERVED
  - Обновлено: `app/routes/login/page.tsx`, `components/login/OrionCityBackground.tsx`, `styles/login-cyber.css`, `package.json`, `package-lock.json`, `node_modules/.package-lock.json`
- 2026-02-11T02:47:40+03:00 — Действие: Интегрирован Orion city model + flying transport в WebGL фон логина → Результат: OK
  - Добавлено: `public/assets/orion/level.glb` (город + `flying-car*` + `air-traffic-*` маркеры)
  - Добавлено: `public/draco/gltf/draco_decoder.js` (DRACO decoder для GLTFLoader)
  - Обновлено: `components/login/OrionCityBackground.tsx` (GLTFLoader+DRACOLoader, материал-оверрайд под «окна», air-traffic по маркерам, дождь привязан к камере)
- 2026-02-11T19:33:20+03:00 — Действие: Переведён login background на исходную схему Orion (KTX2 + building assets + shared PBR materials) → Результат: OK
  - Добавлено: `public/assets/orion/original/high/*` (оригинальные high-ассеты: `level.glb`, `building1..10.glb`, `*.ktx2`)
  - Добавлено: `public/assets/orion/original/sky-512-HDR.exr`, `public/assets/orion/original/index-D8gu6TPK.js`, `public/assets/orion/original/index-DQ_z74h1.css` (reference/forensics)
  - Добавлено: `public/basis/basis_transcoder.js`, `public/basis/basis_transcoder.wasm`
  - Обновлено: `components/login/OrionCityBackground.tsx`
    - подключён `KTX2Loader` + basis transcoder path
    - загрузка `main-diffuse/main-alpha`, `BG-Buildings-Set*`, `flying-car`, `building4-*` текстур
    - `Main`/animated meshes переведены на реальные карты
    - добавлена загрузка `building1..10.glb` и расстановка custom-инстансов (как в Orion runtime)
    - транспорт и rain сохранены, камера привязана к `Preloader-Camera` / `City-Center`
- 2026-02-12T00:38:11+03:00 — Действие: Обновлён базовый login-ракурс Orion: убрана экспериментальная привязка к `Spawn -> Spawn-End`, оставлен стабильный `Preloader-Camera -> City-Center` с небольшим cinematic-оффсетом; parallax-движение от курсора сохранено без изменений. → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx`
- 2026-02-12T00:59:49+03:00 — Действие: По запросу CREATOR усилен parallax от курсора и дополнительно поднята линия взгляда камеры (при небольшой просадке позиции камеры по Y), чтобы минимизировать видимость нижнего пола/текстур в login-кадре. → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx` (блоки `baseCam/lookTarget` + коэффициенты `panX/panY`)
- 2026-02-12T01:30:38+03:00 — Действие: Выполнен второй тюнинг cinematic-ракурса login по референсу CREATOR: камера сдвинута вперёд, вертикальный прицел к центру усилен (x2.5 с clamp), увеличен диапазон cursor-parallax; добавлен post-process стек `FXAA + depth-grade` для глубины/мягкого подавления нижнего пола; снижены bloom/emissive-пики и расширен corridor/near-camera keepout для устранения боковых перекрытий и бликов при движении. → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx`
- 2026-02-12T01:49:47+03:00 — Действие: По уточнению CREATOR поднята базовая высота камеры при сохранении текущего ракурса: увеличен вертикальный offset камеры и подняты/расширены Y-clamp для `camera.position` и `lookTarget`, чтобы вернуть объём города, видимость макушек и дальних зданий. → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx`
- 2026-02-12T11:00:13+03:00 — Действие: По новому уточнению CREATOR выполнен rollback высоты камеры к «старому» уровню (как на предыдущем удачном скрине): возвращены значения `verticalOffset`, `lookLift` и Y-clamp камеры/взгляда до профиля до последнего подъёма высоты. → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx`
- 2026-02-12T12:01:16+03:00 — Действие: Проведён разбор «почему не видно изменений» по истории и runtime-снимкам. Подтверждено: визуальный провал объёма связан не с высотой камеры, а с затемняющим post-process (`depth-grade`) + ослабленными значениями fog/bloom/emissive. Выполнен целевой rollback этого блока к прежнему диапазону, сохранив актуальный профиль камеры. → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx`
- 2026-02-16T20:16:34+03:00 — Действие: закоммичен пакет retune для Orion login-background (rollback depth-grade, усиление bloom/света и подъём читаемости глубины сцены) → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx`
- 2026-02-16T20:24:55+03:00 — Действие: закрыт S1-блокер typecheck для login background (null/material guards без изменения визуальной логики рендера) → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx`
- 2026-02-16T22:41:12+03:00 — Действие: переведён псевдо-loader в boot coordinator с реальными readiness-гейтами (`auth`/`data`/`orion`) и watchdog-fallback; добавлен post-ready warmup для ключевых vfs-индексов, чтобы убрать видимые догрузки после входа → Результат: OK
  - Обновлено: `app/routes/login/page.tsx`, `styles/login-boot.css`
- 2026-02-16T22:48:27+03:00 — Действие: усилена устойчивость Orion stage в boot-фазе — добавлен `onReady/onError` handshake с рендер-фона, fade-in canvas по фактической готовности первого кадра, fallback-фон до готовности WebGL → Результат: OK
  - Обновлено: `components/login/OrionCityBackground.tsx`, `styles/login-bg.css`
- 2026-02-16T22:55:18+03:00 — Действие: добавлен стабильный e2e-режим `preview` (без HMR) и отдельный запуск `test:e2e:preview`; расширен e2e-спек по login boot gate/timeout/fallback/reduced-motion → Результат: OK
  - Обновлено: `playwright.config.ts`, `package.json`, `tests/e2e/login-boot.spec.ts`
- 2026-02-16T23:05:56+03:00 — Действие: обеспечен гарантированный перезапуск boot-цикла при повторном входе на `/login` внутри SPA через зависимость `location.key` в инициализационном boot-effect → Результат: OK
  - Обновлено: `app/routes/login/page.tsx`
- 2026-02-16T23:33:18+03:00 — Действие: добавлена telemetry фиксация `login_boot` (time-to-ready, reveal-duration, fallback reason, gate states) через существующий analytics bridge + локальный debug-buffer `window.__AX_LOGIN_BOOT_METRICS__`; расширен post-ready warmup на данные частых dashboard-сценариев и `axchat/status` (local) для снижения видимых догрузок после входа → Результат: OK
  - Обновлено: `app/routes/login/page.tsx`, `lib/analytics.ts`
- 2026-02-17T00:32:18+03:00 — Действие: переведены основные приватные route-экраны на lazy loading (`React.lazy + Suspense`) для реального code-splitting; синхронизирован `warmPrimaryRoutes` на prefetch route-chunks после `boot=ready` → Результат: OK
  - Обновлено: `app/main.tsx`, `app/routes/login/page.tsx`

## Step C — Documentation
- 2026-02-10T19:50:03+03:00 — Действие: Документация не требуется → Результат: SKIP
- 2026-02-16T20:03:44+03:00 — Действие: создан SPEC для 0030 и LOG LINK, обновлены индекс задач и портал iterations → Результат: OK
  - Добавлено: `docs/iterations/0030_login-boot-loader-transition/SPEC.md`, `docs/iterations/0030_login-boot-loader-transition/SPEC_LOG_LINK.md`
  - Обновлено: `ops/agent_ops/logs/00_LOG_INDEX.md`, `docs/iterations/README.md`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`

## Step D — QA
- 2026-02-10T19:50:03+03:00 — Действие: Локально не запускал, нужна проверка CREATOR → Результат: SKIP
- 2026-02-10T20:32:58+03:00 — Действие: доп. QA не запускался → Результат: SKIP
- 2026-02-10T23:34:30+03:00 — Действие: QA для обнаруженных правок не запускался → Результат: SKIP
- 2026-02-10T22:48:30+03:00 — Действие: доп. QA не запускался → Результат: SKIP
- 2026-02-11T02:49:35+03:00 — Действие: Playwright smoke `/login` (скрин) → Результат: OK
  - Артефакт: `ops/artifacts/ui_scan/manual/2026-02-11_login_orion.png`
- 2026-02-11T02:50:10+03:00 — Действие: `npm run typecheck` → Результат: FAIL (несвязанные ошибки в `app/routes/dashboard/axchat/index.tsx`, `app/routes/dashboard/news/page.tsx`, `app/routes/dashboard/page.tsx`)
- 2026-02-11T19:30:45+03:00 — Действие: `npm run build` → Результат: PASS
- 2026-02-11T19:32:20+03:00 — Действие: Playwright smoke `/login` + network audit textured pipeline → Результат: OK
  - Артефакты: `ops/artifacts/ui_scan/manual/login_orion_textured_attempt.png`, `ops/artifacts/ui_scan/manual/login_orion_textured_attempt.log`
  - Подтверждено загрузкой (HTTP 200): `basis_transcoder.js/.wasm`, `main-diffuse.ktx2`, `main-alpha.ktx2`, `BG-Buildings-Set1/2*.ktx2`, `flying-car.ktx2`, `level.glb`, `building1..10.glb`.
- 2026-02-12T00:38:11+03:00 — Действие: Smoke `/login` на активном dev-порту `127.0.0.1:5173` (без fallback на 4173) после фикса ракурса. → Результат: OK
  - Артефакт: `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v3_5173_cdp.png`
  - Проверка: `data-boot`/canvas присутствуют, `ERROR_COUNT=0`, `REQ_FAIL_COUNT=0`.
- 2026-02-12T00:59:49+03:00 — Действие: Повторный smoke `/login` на `127.0.0.1:5173` после тюнинга parallax + поднятия линии взгляда. → Результат: OK
  - Артефакты: `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v4_5173_cdp.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v5_5173_cdp.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v6_5173_cdp.png`
  - Проверка: сборка PASS, рендер canvas активен, ошибок сети/JS в smoke не зафиксировано.
- 2026-02-12T01:30:38+03:00 — Действие: QA после cinematic-тюнинга (`npm run build` + smoke `/login` на `127.0.0.1:5173`) → Результат: OK
  - Артефакты: `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v7_5173_cdp.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v7_5173_wait6s.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v8_5173_wait12s.png`
  - Проверка: `ERROR_COUNT=0`, `REQ_FAIL_COUNT=0`, `data-boot=ready`, boot-overlay скрыт, login-панель отображается.
- 2026-02-12T01:49:47+03:00 — Действие: QA после подъёма камеры (`npm run build` + smoke `/login` на `127.0.0.1:5173`) → Результат: OK
  - Артефакты: `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v9_cam_higher_5173_wait12s.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v10_cam_higher_5173_wait10s.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v11_cam_higher_noglitch_5173.png`
  - Проверка: `BOOT=ready`, `GLITCH=false` (для контрольного кадра), `ERROR_COUNT=0`, `REQ_FAIL_COUNT=0`.
- 2026-02-12T11:00:13+03:00 — Действие: QA после rollback высоты камеры (`npm run build` + smoke `/login` на `127.0.0.1:5173`) → Результат: OK
  - Артефакт: `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v12_cam_height_restored_5173.png`
  - Проверка: `BOOT=ready`, `GLITCH=false`, `ERROR_COUNT=0`, `REQ_FAIL_COUNT=0`.
- 2026-02-12T12:01:16+03:00 — Действие: QA после rollback post-process/light-параметров (`npm run build` + инструментальный smoke `/login` на `127.0.0.1:5173`) → Результат: OK
  - Артефакты: `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v13_baseline_before_ab_5173.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v14_brightness_restored_5173.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_orion_center_rig_v15_brightness_restored_noglitch_5173.png`, `ops/artifacts/ui_scan/manual/2026-02-12_login_debug_t12000.png`
  - Проверка: `BOOT=ready`, `GLITCH=false`, `ERROR_COUNT=0`, `REQ_FAIL_COUNT=0`; карточка login присутствует (`opacity=1`, `display=grid`) после завершения boot-фазы.
- 2026-02-12T00:38:11+03:00 — Действие: Сверка локального набора Orion-ассетов против `orion_source_requests.json`. → Результат: PARTIAL
  - Итого: `26/27` запрошенных ресурсов покрыты локально.
  - Отсутствует: `assets/sky4k-75.avif` (фон preloader-сцены оригинального приложения; для login-фона не критичен).
- 2026-02-16T20:03:44+03:00 — Действие: `npm run typecheck` на текущем дереве → Результат: FAIL
  - Ошибки: `app/routes/dashboard/page.tsx:76`, `components/login/OrionCityBackground.tsx:662`, `components/login/OrionCityBackground.tsx:1021`.
- 2026-02-16T20:03:44+03:00 — Действие: `npm run build` → Результат: PASS
- 2026-02-16T20:03:44+03:00 — Действие: инструментальный smoke `/login` (Playwright headless, ожидание 12s) → Результат: OK
  - Проверка: `data-boot=ready`, `hasCanvas=true`, `hasLoginPanel=true`, `failedCount=0`, `errorCount=0`.
- 2026-02-16T20:24:55+03:00 — Действие: `npm run typecheck` → Результат: PASS
- 2026-02-16T20:24:55+03:00 — Действие: `npm run build` → Результат: PASS
- 2026-02-16T20:24:55+03:00 — Действие: инструментальный smoke `/login` (Playwright headless, ожидание 12s) → Результат: OK
  - Проверка: `data-boot=ready`, `hasCanvas=true`, `hasLoginPanel=true`, `failedCount=0`, `errorCount=0`.
- 2026-02-16T22:57:42+03:00 — Действие: `npm run test:e2e:preview -- --project=chromium tests/e2e/login-boot.spec.ts` → Результат: FAIL
  - Падения: 2/4 (`shows boot loader then transitions...`, `restarts boot sequence...`) из-за таймаута 15s при фазе `data-boot=reveal` на медленном рендере Orion.
- 2026-02-16T23:01:19+03:00 — Действие: увеличен e2e timeout для ожидания `data-boot=ready` до 30s (реалистичный запас для слабого CPU/GPU и heavy WebGL init) → Результат: OK
  - Обновлено: `tests/e2e/login-boot.spec.ts`
- 2026-02-16T23:02:53+03:00 — Действие: повторный прогон `npm run test:e2e:preview -- --project=chromium tests/e2e/login-boot.spec.ts` → Результат: PASS
  - Итого: `4 passed` (`1.5m`), включая задержку `level.glb` и `prefers-reduced-motion`.
- 2026-02-16T23:03:34+03:00 — Действие: `npm run typecheck` на актуальном дереве после e2e-фикса → Результат: PASS
- 2026-02-16T23:10:57+03:00 — Действие: повторный прогон `npm run test:e2e:preview -- --project=chromium tests/e2e/login-boot.spec.ts` после правки `location.key` → Результат: PASS
  - Итого: `4 passed` (`1.4m`), контракт boot/restart/reduced-motion сохранён.
- 2026-02-16T23:11:45+03:00 — Действие: `npm run typecheck` после правки `location.key` → Результат: PASS
- 2026-02-16T23:39:44+03:00 — Действие: `npm run typecheck` после добавления telemetry/warmup → Результат: PASS
- 2026-02-16T23:41:12+03:00 — Действие: `npm run test:e2e:preview -- --project=chromium tests/e2e/login-boot.spec.ts` после telemetry/warmup → Результат: PASS
  - Итого: `4 passed` (`1.6m`), boot-контракт сохранён.
- 2026-02-16T23:46:57+03:00 — Действие: повторный `npm run test:e2e:preview -- --project=chromium tests/e2e/login-boot.spec.ts` после чистки no-op dynamic imports из warmup → Результат: PASS
  - Итого: `4 passed` (`1.4m`), сборка без предупреждений о mixed static/dynamic import для dashboard-модулей.
- 2026-02-16T23:47:54+03:00 — Действие: финальный `npm run typecheck` после чистки warmup → Результат: PASS
- 2026-02-17T00:34:20+03:00 — Действие: `npm run typecheck` после lazy-route рефактора → Результат: PASS
- 2026-02-17T00:42:06+03:00 — Действие: `npm run test:e2e:preview -- --project=chromium tests/e2e/login-boot.spec.ts` после lazy-route рефактора → Результат: PASS
  - Итого: `4 passed` (`1.6m`), boot-контракт сохранён.
  - Подтверждено: production build разрезан на route-chunks (news/content/profile/settings/favorites/reader и др.), без предупреждений mixed static/dynamic import для этих модулей.

## Step E — Git
- 2026-02-10T19:52:49+03:00 — Commit: `d761090` — `feat(login): add boot loader transition` — Файлы: `app/routes/login/page.tsx`, `styles/login-boot.css`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`
- 2026-02-10T19:55:30+03:00 — Commit: `ab71a5e` — `chore(agent-ops): update log 0030` — Файлы: `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-10T21:22:00+03:00 — Commit: `06a6594` — `feat(login): refine boot transition` — Файлы: `app/routes/login/page.tsx`, `styles/login-bg.css`, `styles/login-boot.css`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-10T22:49:10+03:00 — Commit: `a36a97a` — `feat(login): add layered background` — Файлы: `app/routes/login/page.tsx`, `styles/login-bg.css`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-11T00:20:20+03:00 — Commit: `abd2ef1` — `chore(agent-ops): trace task updates` — Файлы: `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-11T02:52:40+03:00 — Commit: `23db653` — `feat(login-bg): integrate Orion city model background` — Файлы: `components/login/OrionCityBackground.tsx`, `public/assets/orion/level.glb`, `public/draco/gltf/draco_decoder.js`, `app/routes/login/page.tsx`, `styles/login-cyber.css`, `package.json`, `package-lock.json`, `node_modules/.package-lock.json`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-11T19:34:26+03:00 — Действие: Подготовлен новый пакет textured-ассетов Orion + рефактор `OrionCityBackground`; коммит не выполнен (ожидает проверки CREATOR) → Результат: IN_PROGRESS
- 2026-02-16T20:08:33+03:00 — Commit: `2ed8d4b` — `docs(0030): create spec and sync log index links` — Файлы: `docs/iterations/0030_login-boot-loader-transition/SPEC.md`, `docs/iterations/0030_login-boot-loader-transition/SPEC_LOG_LINK.md`, `docs/iterations/README.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-16T20:16:34+03:00 — Commit: `c51a323` — `feat(login-bg): retune Orion scene depth and lighting` — Файлы: `components/login/OrionCityBackground.tsx`
- 2026-02-16T20:24:55+03:00 — Commit: `8b3d328` — `fix(login-bg): guard material and fog typings` — Файлы: `components/login/OrionCityBackground.tsx`
- 2026-02-17T00:04:04+03:00 — Commit: `c633c8a` — `feat(login): implement readiness boot gate and telemetry` — Файлы: `app/routes/login/page.tsx`, `components/login/OrionCityBackground.tsx`, `styles/login-bg.css`, `styles/login-boot.css`, `playwright.config.ts`, `package.json`, `lib/analytics.ts`, `tests/e2e/login-boot.spec.ts`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-17T00:04:04+03:00 — Commit: `c5a4d4d` — `chore(agent-ops): record login boot commit` — Файлы: `ops/agent_ops/logs/0030_login-boot-loader-transition.md`

---

## Заметки / Решения
- Визуальный стиль: boot-sequence + scanline + glitch/scan wipe, далее чистая панель логина.

## Риски / Открытые вопросы
- Нужны параметры точного тайминга/интенсивности после первого просмотра.
- E2E-gate добавлен, но upper-bound для `data-boot=ready` зависит от производительности WebGL init; на части устройств возможна длительная фаза `reveal` перед финальным `ready`.
- Роутинг пока статический (`app/main.tsx`), поэтому route-code prefetch не даёт выигрыш в чанкинге; реальный выигрыш сейчас достигается data/API warmup. Для code-prefetch потребуется переход на lazy routes.

## Чеклист приёмки
- [x] Есть loader-экран с boot-sequence
- [x] Переход в login без звуков
- [x] Повтор при каждом логине
- [x] Уважение prefers-reduced-motion
