<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_0030_LOGIN_BOOT_LOADER_TRANSITION
  title: "GLOBAL LOG — 0030_login-boot-loader-transition"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-12
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
- SPEC: none
- Статус: ACTIVE

---

## Step A — Discovery
- 2026-02-10T19:41:16+03:00 — Действие: Зафиксированы вводные CREATOR (настроение референса, показывать при каждом логине, без звуков, без ограничений) → Результат: OK
- 2026-02-11T02:49:10+03:00 — Действие: Уточнено у CREATOR: разрешение на перенос моделей с `https://orion.adrianred.com/` есть; фон нужен только на `/login`; вариант — урезанный/лёгкий → Результат: OK
- 2026-02-11T19:12:10+03:00 — Действие: Снят network trace Orion (`orion_source_requests.json`) → Результат: OK
  - Подтверждено: текстуры и материалы не встроены в `level.glb`; рендер собирается из `level.glb` + `*.ktx2` + `building1..10.glb` + basis transcoder.
  - Артефакты: `ops/artifacts/ui_scan/manual/orion_source_requests.json`, `ops/artifacts/ui_scan/manual/orion_source_probe.png`
- 2026-02-12T00:38:11+03:00 — Действие: По запросу CREATOR уточнено ограничение: движение камеры не менять (оставить parallax от курсора), требуется только правильный базовый ракурс на центр города. → Результат: OK

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

## Step C — Documentation
- 2026-02-10T19:50:03+03:00 — Действие: Документация не требуется → Результат: SKIP

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
- 2026-02-12T00:38:11+03:00 — Действие: Сверка локального набора Orion-ассетов против `orion_source_requests.json`. → Результат: PARTIAL
  - Итого: `26/27` запрошенных ресурсов покрыты локально.
  - Отсутствует: `assets/sky4k-75.avif` (фон preloader-сцены оригинального приложения; для login-фона не критичен).

## Step E — Git
- 2026-02-10T19:52:49+03:00 — Commit: `d761090` — `feat(login): add boot loader transition` — Файлы: `app/routes/login/page.tsx`, `styles/login-boot.css`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`, `ops/agent_ops/logs/00_LOG_INDEX.md`
- 2026-02-10T19:55:30+03:00 — Commit: `ab71a5e` — `chore(agent-ops): update log 0030` — Файлы: `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-10T21:22:00+03:00 — Commit: `06a6594` — `feat(login): refine boot transition` — Файлы: `app/routes/login/page.tsx`, `styles/login-bg.css`, `styles/login-boot.css`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-10T22:49:10+03:00 — Commit: `a36a97a` — `feat(login): add layered background` — Файлы: `app/routes/login/page.tsx`, `styles/login-bg.css`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-11T00:20:20+03:00 — Commit: `abd2ef1` — `chore(agent-ops): trace task updates` — Файлы: `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-11T02:52:40+03:00 — Commit: `23db653` — `feat(login-bg): integrate Orion city model background` — Файлы: `components/login/OrionCityBackground.tsx`, `public/assets/orion/level.glb`, `public/draco/gltf/draco_decoder.js`, `app/routes/login/page.tsx`, `styles/login-cyber.css`, `package.json`, `package-lock.json`, `node_modules/.package-lock.json`, `ops/agent_ops/logs/0030_login-boot-loader-transition.md`
- 2026-02-11T19:34:26+03:00 — Действие: Подготовлен новый пакет textured-ассетов Orion + рефактор `OrionCityBackground`; коммит не выполнен (ожидает проверки CREATOR) → Результат: IN_PROGRESS

---

## Заметки / Решения
- Визуальный стиль: boot-sequence + scanline + glitch/scan wipe, далее чистая панель логина.

## Риски / Открытые вопросы
- Нужны параметры точного тайминга/интенсивности после первого просмотра.

## Чеклист приёмки
- [ ] Есть loader-экран с boot-sequence
- [ ] Переход в login без звуков
- [ ] Повтор при каждом логине
- [ ] Уважение prefers-reduced-motion
