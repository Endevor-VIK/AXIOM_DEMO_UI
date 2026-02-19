<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_0030_LOGIN_BOOT_LOADER_TRANSITION_SPEC
  title: "0030 — Boot-sequence loader + Orion login-scene quality track"
  status: ACTIVE
  mode: Doc
  goal: "SPEC"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-19
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/0030_login-boot-loader-transition/SPEC.md -->

# 0030 — Boot-sequence loader + Orion login-scene quality track

## 0) Цель
Стабилизировать login-сцену (boot-sequence + Orion background), закрыть технические долги по типам/QA и вывести визуальный уровень Orion-login к профессиональному cinematic cyberpunk quality, максимально близкому к целевому референсу.

## 1) Область работ
- Страница `/login`: boot-sequence overlay, переход к панели логина, отсутствие звука.
- WebGL-фон: Orion city pipeline (`glb + ktx2 + basis`), устойчивый базовый ракурс и cursor-parallax.
- Архитектурная композиция skyline: плотность, глубина, читаемость слоёв, контроль перекрытий.
- Неоновые слои: структурный свет фасадов, hero-биллборды, рекламные панели, туманно-световая атмосфера.
- Доступность: корректная деградация при `prefers-reduced-motion`.
- Надёжность: отсутствие JS/network ошибок в smoke-сценарии.

## 2) Ограничения
- Не менять поведение других роутов.
- Не ломать текущий UX-ритм boot/login, согласованный с CREATOR.
- Не добавлять массовый refactor за пределами login-контура.
- Сохранять стабильность ultra-профиля без регрессии по boot/e2e контракту.

## 3) План вывода на новый уровень (S0-S5)
- S0 (30-60 мин): зафиксировать baseline, блокеры и критерии DONE в SPEC/AgentOps.
- S1 (2-4 часа): убрать блокирующие ошибки typecheck в login-контуре, сохранив текущий визуальный профиль.
- S2 (0.5-1 день): добавить детерминированный smoke/e2e для `/login` (boot ready, canvas, panel visible, no console/network errors).
- S3 (0.5-1 день): закрыть acceptance по `prefers-reduced-motion` и повторяемости boot-последовательности.
- S4 (0.5-1 день): стабилизировать performance/fallback для тяжёлых ассетов (чёткий graceful path при деградации GPU/ресурсов).
- S5 (1-2 часа): финальный QA, заполнение Step D/Step E, перевод задачи в DONE.

## 4) Текущий статус (срез на 2026-02-19)
- Базовые stability-gates закрыты: `typecheck/build/e2e login boot` = PASS.
- Выполнен forensic-патч Orion-сцены:
  - устранены прямые наложения billboard-плоскостей (`billboard overlapPairCount=0`);
  - уменьшены грубые пересечения footprint зданий (`67 -> 23`);
  - добавлен runtime-diagnostics канал `window.__AX_ORION_DIAG__`.
- Текущие визуальные остаточные проблемы:
  - `building_footprint_overlap` остаётся (`overlapPairCount=23`);
  - `billboard_occluded` остаётся (source-слой частично закрыт зданиями);
  - animated billboard video-atlas не стабилен в runtime (`video atlas error code 4` на части сред), поэтому по умолчанию выключен.

## 5) Quality Gates для закрытия 0030
- Gate 1: `npm run typecheck` = PASS.
- Gate 2: `npm run build` = PASS.
- Gate 3: smoke `/login` подтверждает `data-boot=ready`, наличие canvas и login-panel.
- Gate 4: smoke `/login` подтверждает `ERROR_COUNT=0` и `REQ_FAIL_COUNT=0`.
- Gate 5: сценарий `prefers-reduced-motion` не ломает переход и интерфейс логина.

## 6) Критерии DONE (baseline track)
- Все пункты чеклиста в `ops/agent_ops/logs/0030_login-boot-loader-transition.md` отмечены.
- Step D содержит полный QA-трейс по актуальным правкам.
- Step E содержит атомарные коммиты без смешивания чужих изменений.
- `00_LOG_INDEX.md` и GLOBAL LOG для 0030 переведены в `DONE`.

## 7) Продолжение SPEC: Orion Visual Parity Track (OVP)

### 7.1 Цель OVP
Довести визуальную сцену `/login` до уровня "professional neon cyberpunk city", максимально близкого к референсу, с сохранением production-стабильности и управляемой производительности.

### 7.2 Целевой уровень достижимости на текущих ресурсах
- Реалистичная цель без новых 3D-паков: 85-90% от референса по атмосфере/глубине/свету.
- Для 95-100% потребуются дополнительные уникальные ассеты (hero-геометрия, расширенные рекламные атласы, FX-карты объёма).

### 7.3 OVP non-goals
- Не воспроизводить референс 1:1.
- Не переносить gameplay-логику оригинального Orion в login-фон.
- Не усложнять UX логина в ущерб читаемости формы.

## 8) Gap-анализ относительно референса

### 8.1 Что уже хорошо
- Есть плотная база skyline и погодный слой (дождь).
- Есть рабочие emissive-фасады, статические hero-биллборды, атмосферный тон.
- Контур загрузки ассетов и fallback-механики стабилизирован.

### 8.2 Что проседает
- Архитектурная иерархия сцены: не хватает выраженных hero-silhouette доминант.
- Световая многослойность: недостаточно "мягкой" объёмной засветки между дальними планами.
- Billboard read-through: часть source-биллбордов окклюдируется зданиями.
- Остаточные пересечения зданий ухудшают "чистоту" композиции.
- Видео-слой экранов не имеет стабильного кросс-платформенного decode-профиля.

### 8.3 Измеримые текущие факты (из runtime-diag)
- `building overlapPairCount=23`
- `billboard overlapPairCount=0`
- `billboard occludedByBuildings=4`
- `failed_requests=[]` (в стабильном preset)
- `issues=[building_footprint_overlap,billboard_occluded]`

## 9) Ресурсный аудит Orion (что есть и что не используется)

### 9.1 В наличии и в использовании
- `high/level.glb`, `high/building1..10.glb`
- `BG-Buildings-Set1/2*`, `main-*`, `Arcade.ktx2`, `building4-*`, `flying-car.ktx2`
- `sky-512-HDR.exr`, `sky4k-75.avif`
- basis/draco декодеры (`public/basis/*`, `public/draco/gltf/draco_decoder.js`)

### 9.2 В наличии, но ограниченно задействовано
- `video-atlas.mp4`, `video-atlas-ultra.mp4` (отключены в default ultra из-за decode нестабильности).
- `index-D8gu6TPK.js`, `index-DQ_z74h1.css` (используются как forensic reference, не как runtime-бандл).

### 9.3 Отсутствует/не подтягивается из оригинального runtime для login-сцены
- `assets/music.mp3`, `assets/rain.mp3`
- `assets/fonts/Bank Gothic*.woff2`
- `js/libs/draco/gltf/draco_wasm_wrapper.js`, `draco_decoder.wasm`
- `js/libs/nipplejs/nipplejs.min.js`

## 10) Roadmap до референсного уровня (OVP-P0..P6)

### P0 — Baseline Freeze + KPI Lock (0.5 дня)
- Зафиксировать reproducible seed/camera/profile для сравнения кадров.
- Зафиксировать KPI-порог для каждого этапа.
- Подготовить пакет контрольных скринов (desktop + mobile frame).

Deliverables:
- baseline report + screenshot pack в `ops/artifacts/ui_scan/*_orion_ovp_p0`.

### P1 — Skyline Layout Cleanup (1 день)
- Ужесточить anti-overlap алгоритм для footprint-коллизий зданий.
- Ввести композиционную иерархию: foreground / mid / distant wall.
- Ручные hero-якоря для ключевых башен, процедурная добивка только вокруг.

Target KPI:
- `building overlapPairCount <= 12` (переходный порог).

### P2 — Billboard Visibility & Hierarchy (1 день)
- Устранить окклюзию source/orion-слоёв через новый placement offset и depth-priority.
- Сохранить `overlapPairCount=0` для billboard plane.
- Ввести три уровня billboard-интенсивности: source, hero, ambient.

Target KPI:
- `billboard occludedByBuildings <= 1`
- `billboard overlapPairCount = 0`.

### P3 — Material Profile Pass (1 день)
- Развести материал-профили по классам зданий (set1/set2/original-heavy).
- Убрать остаточные "грязные" фасады (alpha-cut artifacts, dark patches).
- Повысить микро-контраст emissive окон без overburn.

Target KPI:
- визуальный дефектный кластер "грязных фасадов" отсутствует на контрольных ракурсах.

### P4 — Atmosphere & Post FX Pass (1 день)
- Добавить контролируемый cinematic post stack:
  - bloom (умеренный),
  - лёгкий chromatic split,
  - distance haze/fog tuning,
  - мягкий vignette/film-noise.
- Усилить глубину дождя по z-слоям.

Target KPI:
- perceptual depth score по ревью CREATOR: PASS.
- без ухудшения читаемости login-панели.

### P5 — Media Layer Stabilization (0.5-1 день)
- Подготовить совместимый codec-profile для `video-atlas` (перекод + fallback matrix).
- Runtime-логика выбора: `video -> static atlas`, без пустых экранов.

Target KPI:
- `video_atlas_unavailable` не возникает в целевых браузерах.
- отсутствие сетевых/медиа ошибок в smoke.

### P6 — Final Polish + Sign-off Pack (0.5 дня)
- Финальные A/B кадры `before/after`.
- Финальные метрики diag + QA gates.
- Документация visual profile и preset-параметров.

## 11) OVP Quality Gates

### Gate O1 — Stability
- `npm run typecheck` PASS
- `npm run build` PASS
- `test:e2e:preview tests/e2e/login-boot.spec.ts` PASS

### Gate O2 — Runtime Integrity
- `failed_requests=[]` в диагностическом прогоне `/login?debug=1`.
- `ERROR_COUNT=0`, `REQ_FAIL_COUNT=0`.

### Gate O3 — Composition
- `building overlapPairCount <= 5` (финальный порог).
- `billboard overlapPairCount = 0`.
- `billboard occludedByBuildings <= 1`.

### Gate O4 — Visual Acceptance
- CREATOR подтверждает достижение целевого уровня по контрольному пакету кадров:
  - depth,
  - neon hierarchy,
  - skyline readability,
  - cinematic coherence.

## 12) Риски и mitigation
- Риск: over-processing (мыльный bloom/пережог).
  - Mitigation: жёсткие upper-bound на post FX + side-by-side контрольные кадры.
- Риск: регресс boot/perf из-за новых FX.
  - Mitigation: staged flags + e2e/smoke после каждого P-этапа.
- Риск: codec variability видео-атласа между браузерами.
  - Mitigation: multi-encode стратегия + static fallback без артефактов.

## 13) Финальные критерии DONE для OVP
- Все O-gates (O1-O4) закрыты.
- В AgentOps зафиксированы шаги P0-P6 и соответствующие артефакты.
- Визуальные регрессии (перекрытия/окклюзии/грязные фасады) закрыты или формально зафиксированы как сознательные компромиссы.
- CREATOR принимает финальный пакет `before/after + diagnostics + commit trail`.
