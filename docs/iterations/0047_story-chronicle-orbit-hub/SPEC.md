<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_0047_STORY_CHRONICLE_ORBIT_HUB_SPEC_MD
  title: "SPEC · 0047_story-chronicle-orbit-hub"
  status: DRAFT
  mode: Doc
  goal: "SPEC"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-19
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/0047_story-chronicle-orbit-hub/SPEC.md -->

# SPEC · 0047_story-chronicle-orbit-hub

**Title:** CHRONICLE HUB (ex-ROADMAP) — Narrative Orbit + Future Standalone Chapters  
**Owner:** CREATOR  
**Scope:** `apps/axiom-web-core-ui` + интеграционный слой `canon/v3`  
**Route target:** `/dashboard/chronicle` (замена текущего `/dashboard/roadmap`)  
**Status:** DRAFT (дизайн/архитектура + реализационный план)

---

## 0) Executive Summary

Текущая вкладка `ROADMAP` должна быть переосмыслена как **художественная зона проекта**:

1. `ROADMAP` заменяется на `CHRONICLE`.
2. `Orbit`-режим переносится из `CONTENT` в новую вкладку и становится главным способом выбора главы/арки.
3. `CONTENT` остаётся wiki/базой знаний (структурный контент, карточки, инспект, reader), без Orbit.
4. Новая вкладка с первого релиза показывает **4 карточки глав в статусе `draft`** (демо-макет), но архитектурно закладывает:
   - будущие полноценные главы;
   - собственный дизайн-стиль каждой главы;
   - связанность глав между собой и со всеми ключевыми разделами сайта.

Ключевая цель: увеличить глубину вовлечения и время на сайте за счёт «сценического» UX и ясной сюжетной траектории.

---

## 1) Контекст и проблема

### 1.1 Текущее состояние

- `ROADMAP` сейчас временно закрыт (`RouteHoldBanner`), фактически не решает задачу удержания.
- `Orbit` уже реализован в `CONTENT`, но там он концептуально лишний: `CONTENT` = база/реестр, не художественная витрина.
- Пользовательская идея: вынести Orbit в отдельную творческую вкладку, где происходит вход в сюжет.

### 1.2 Продуктовый разрыв

Сейчас нет единой «сюжетной сцены» (narrative front-door), где пользователь:

1. быстро понимает текущую фазу истории;
2. выбирает арку/главу;
3. получает интригу и причину остаться;
4. переходит в полноценную главу с уникальной подачей.

### 1.3 Почему делать сейчас

- Есть готовая технологическая база Orbit (`components/content/OrbitView.tsx`).
- Есть минимальный канонический каркас для пролога/глав (`canon/v3/04_STORY_STRUCTURE/*`).
- Есть явный UX-запрос на замену `ROADMAP` и разворачивание художественной части.

---

## 2) Видение и принципы

### 2.1 Продуктовое видение

`CHRONICLE HUB` — это не список документов, а **интерактивная сцена мира AXIOM**:

- центр: выбор сюжетной единицы (глава/арка/эпизод);
- боковые контуры: контекст (персонажи, события, риски, локации);
- связующая логика: каждая глава знает, откуда пользователь пришёл и куда может пойти дальше.

### 2.2 Визуальный ориентир

Референс по композиции и атмосфере: `itempire.com` (интерфейс «центральной сцены» + HUD/панельная обвязка).  
Важно: **не копировать**, а адаптировать под AXIOM Red Protocol и собственный narrative language.

### 2.3 UI-принципы

1. `Scene-first`: один главный фокус в центре (active chapter).
2. `HUD clarity`: вторичные блоки не спорят с центром.
3. `Short text`: только «крючок» + ключевые факты, без перегруза.
4. `Draft honesty`: чётко маркировать черновой статус карточек.
5. `Future proof`: каждая карточка уже содержит маршрут к самостоятельной главе.

---

## 3) Цели и KPI

### 3.1 Цели релиза R1 (MVP CHRONICLE HUB)

1. Перенести Orbit из `CONTENT` в `CHRONICLE`.
2. Сделать 4 демонстрационные сюжетные карточки (`draft`).
3. Дать пользователю быстрый обзор: hook, события, персонажи, локации.
4. Подготовить архитектуру под автономные страницы глав.

### 3.2 Цели перспективы (R2-R4)

1. Полноценные chapter-pages с уникальным дизайном на главу.
2. Граф связанности между главами, персонажами, событиями и другими разделами (`content/news/axchat`).
3. Автоподача данных из `canon/v3` через стабильный контракт.

### 3.3 Метрики успеха (предлагаемые)

- `chronicle_hub_open_rate` (доля сессий, где открыта вкладка CHRONICLE).
- `chronicle_hub_dwell_time` (среднее время в CHRONICLE).
- `chronicle_card_interaction_rate` (клики/drag/keyboard внутри Orbit).
- `chapter_open_rate` (переход в страницу главы).
- `chapter_to_chapter_flow_rate` (переходы между главами по внутренним link-graph).

---

## 4) Scope и релизные фазы

## 4.1 R0 — Discovery & Spec Hardening (0.5–1 неделя)

- Финализация этой спецификации.
- Подтверждение IA/названий/тональности.
- Утверждение 4 стартовых карточек (черновой контент).
- Утверждение контракта данных `chronicle manifest`.

**Deliverables:** финальный SPEC v1, макет структуры данных, согласованный copy-пак.

## 4.2 R1 — CHRONICLE HUB MVP (1.5–2 недели)

- Новый route `/dashboard/chronicle`.
- Перенос Orbit-stage в CHRONICLE.
- 4 карточки `draft` + quick info panel.
- Обновление навигации (`ROADMAP` -> `CHRONICLE`).
- Удаление Orbit-кнопки из `CONTENT` UI.

**Deliverables:** рабочий Chronicle Hub для desktop/mobile + базовые e2e сценарии.

## 4.3 R2 — Standalone Chapter Pages Foundation (2–3 недели)

- Route `/dashboard/chronicle/:chapterSlug`.
- Базовый chapter template.
- `styleProfile` (уникальная тема главы) + fallback theme.
- Связь с entity-моделями (персонажи/события/локации).

**Deliverables:** минимум 2 главы в автономном режиме + back/next narrative navigation.

## 4.4 R3 — Canon/v3 Integration Pipeline (2–3 недели)

- Импорт chapter metadata из `canon/v3` и/или export слоя.
- Схемная валидация chronicle-пакета.
- Разделение `draft/internal/public` для управляемой публикации.

**Deliverables:** chronicle-data из canon/v3 без ручного дублирования в UI.

## 4.5 R4 — Narrative Network & Deep Linking (3+ недели)

- Граф связей chapter <-> chapter <-> content.
- Рекомендательные переходы (что читать дальше).
- Сценарии событийного входа из `news`/`axchat` в конкретные главы.

**Deliverables:** связанная narrative экосистема сайта.

---

## 5) Информационная архитектура (IA)

### 5.1 Навигация

- Top nav: `HOME | CHRONICLE | AXCHAT | CONTENT | NEWS`
- `CHRONICLE` заменяет `ROADMAP` в меню, на dashboard quick actions, в HELP/NEWS cross-links.

### 5.2 Route map (план)

- `/dashboard/chronicle` — хаб (Orbit + карточки + контекст).
- `/dashboard/chronicle/:chapterSlug` — страница конкретной главы.
- `/dashboard/chronicle/:chapterSlug/:sceneSlug` — опционально в R3+.

### 5.3 Роли страниц

- `CHRONICLE HUB` = вход, выбор, контекст, интрига.
- `CHAPTER PAGE` = полноценное художественное раскрытие (уникальный стиль).
- `CONTENT` = энциклопедический/структурный слой.

---

## 6) UX-концепт вкладки CHRONICLE (MVP)

### 6.1 Общая сцена

1. Top status line: текущая narrative фаза, версия, статус сборки.
2. Left rail: режимы/фильтры (arc, focus, chapter state).
3. Center stage: Orbit с активной главой.
4. Right panel: быстрая аналитика выбранной главы.
5. Bottom control deck: линейка глав + системные индикаторы.

### 6.2 Orbit как основной селектор

- Drag / wheel / keyboard (`←`, `→`, `Enter`, `Esc`).
- Active card всегда синхронизируется с quick info panel.
- Карточки всегда кликабельны.
- Клик в MVP: `Open Chapter (Preview)`; в R2+: переход на полноценную chapter-page.

### 6.3 Карточка главы (MVP Draft)

Поля:

- `chapterCode`
- `title`
- `status` (`draft` на старте для всех)
- `hook` (1 строка)
- `keyEvents` (2-3)
- `mainCharacters` (2-4)
- `locations` (1-2)
- `tone`
- `targetRoute`

### 6.4 Mobile поведение

- Orbit fallback в horizontal strip при узких экранах.
- Right panel сворачивается в bottom sheet.
- CTA и chapter selector доступны без hover.

---

## 7) Контентный baseline: 4 стартовые карточки (все Draft)

Важно: ниже рабочий демонстрационный набор. Контент будет 100% итеративно уточняться.

1. `PROLOGUE_00` — Мир после Чёрного Солнца.
2. `INTRO_01` — Глухая Станция: первый сигнал.
3. `CHAPTER_01` — Осколки контроля.
4. `CHAPTER_02` — Протокол Ω (teaser).

Источники для стартовой сборки:

- `canon/v3/04_STORY_STRUCTURE/04.02_PROLOGUE.md`
- `canon/v3/04_STORY_STRUCTURE/04.01_FIRST_CHAPTER.md`
- связанные узлы из `canon/v3/02_LOCATIONS`, `03_CHARACTERS`, `06_FACTIONS`

---

## 8) Data Contract (проект)

### 8.1 Chronicle Manifest (UI-level draft schema)

```json
{
  "meta": {
    "version": 1,
    "generatedAt": "2026-02-19T00:00:00Z",
    "source": "manual-seed"
  },
  "chapters": [
    {
      "id": "STR-PROLOGUE-000",
      "slug": "prologue-world-after-black-sun",
      "chapterCode": "PROLOGUE_00",
      "title": "Мир после Чёрного Солнца",
      "status": "draft",
      "hook": "Мир пережил удар, но утратил память и контроль.",
      "summary": "Точка входа в новое состояние мира AXIOM.",
      "keyEvents": ["Black Sun", "Echelon rise", "Nexus sealed"],
      "mainCharacters": ["VIKTOR", "LIZA", "AXIOM"],
      "locations": ["ECHELON", "UNDERCITY", "NEXUS"],
      "tone": "cold-tense",
      "styleProfile": "prologue_ash_noir",
      "targetRoute": "/dashboard/chronicle/prologue-world-after-black-sun",
      "canonRefs": [
        "canon/v3/04_STORY_STRUCTURE/04.02_PROLOGUE.md"
      ],
      "siteLinks": [
        "/dashboard/content?tag=echelon",
        "/dashboard/news"
      ]
    }
  ]
}
```

### 8.2 Chapter Style Contract (R2+)

```json
{
  "styleProfile": "prologue_ash_noir",
  "tokens": {
    "bgGradient": "radial-gradient(...)",
    "accent": "#ff2438",
    "surface": "rgba(12,8,10,0.86)",
    "fog": 0.24,
    "grain": 0.12,
    "headlineFont": "var(--font-display)",
    "monoFont": "var(--font-mono)"
  },
  "motion": {
    "sceneIntroMs": 900,
    "cardSnapMs": 220,
    "reducedMotionFallback": "strip"
  }
}
```

### 8.3 Graph Links (R3+)

- `chapter -> previous/next chapter`
- `chapter -> character ids`
- `chapter -> location ids`
- `chapter -> related content cards`
- `chapter -> related news packets`

---

## 9) Техническая реализация (предметный план)

### 9.1 Переиспользование текущего Orbit

Текущая база:

- `components/content/OrbitView.tsx`
- `components/content/orbit-view.css`
- `components/content/orbitMath.ts`

План:

1. Выделить Orbit в нейтральный narrative-friendly контур (не жёстко привязанный к ContentItem).
2. Добавить адаптер `ChronicleChapter -> Orbit item`.
3. Сохранить e2e/keyboard/reduced-motion поведение.

### 9.2 Новые модули (предложение)

- `app/routes/dashboard/chronicle/page.tsx`
- `components/chronicle/ChronicleHub.tsx`
- `components/chronicle/ChronicleOrbitStage.tsx`
- `components/chronicle/ChronicleQuickPanel.tsx`
- `components/chronicle/ChronicleBottomDeck.tsx`
- `lib/chronicle/index.ts` (чтение chronicle manifest)
- `public/data/chronicle/manifest.json` (MVP seed)

### 9.3 Refactor в Content

- Убрать Orbit переключатель из `ContentFilters`.
- Удалить Orbit-ветки рендера из `ContentCategoryView`.
- Сохранить `browse/cards/inspect` без регрессий.

### 9.4 Feature flags

- `VITE_FEATURE_CHRONICLE_HUB=1`
- `VITE_FEATURE_CONTENT_ORBIT_VIEW=0` (после переноса)

---

## 10) Связанность с сайтом (важно)

### 10.1 Системные связи

- Из CHRONICLE в CONTENT: «узнать больше о сущности/локации».
- Из NEWS в CHRONICLE: «читать главу, связанную с release/update packet».
- Из AXCHAT в CHRONICLE: «контекстные ссылки на активную арку».

### 10.2 Связи между главами

Каждая глава должна хранить:

- `previousChapter`
- `nextChapter`
- `parallelChapters` (если нелинейный маршрут)
- `requiredContext` (что прочитать до открытия)

### 10.3 Глубокая интеграция (R4)

- Chronicle-узлы становятся частью общей навигационной карты продукта.
- Появляется единый narrative graph для рекомендаций и навигации.

---

## 11) Качество, доступность, перформанс

### 11.1 Performance

- Orbit: ограничение видимых карточек в сцене (`<= 24`).
- Motion строго через `transform`, без тяжёлых layout thrash.
- Lazy-load тяжёлых визуальных слоёв.

### 11.2 A11y

- Полная keyboard-навигация Orbit и chapter controls.
- Контраст и читаемость text overlays.
- `prefers-reduced-motion` обязателен.

### 11.3 Fallbacks

- Если chronicle manifest недоступен — graceful hold panel с диагностикой.
- Если chapter style отсутствует — fallback на базовую тему CHRONICLE.

---

## 12) QA-стратегия

### 12.1 Unit

- mapping chapter data
- styleProfile fallback
- graph link resolution

### 12.2 Integration

- `/dashboard/chronicle` загружает manifest.
- Orbit selection -> QuickPanel sync.
- click card -> route transition.
- feature flags корректно переключают сценарии.

### 12.3 E2E

- smoke desktop/mobile.
- reduced-motion режим.
- переходы CHRONICLE <-> CONTENT/NEWS.

---

## 13) Риски и ограничения

1. **Риск дрейфа визуала:** слишком сложная сцена перегрузит UX.
   - Митигировать: фиксировать token-систему и viewport budgets.
2. **Риск канон-рассинхронизации:** chapter texts расходятся с `canon/v3`.
   - Митигировать: явные `canonRefs` + этап R3 с автоматизацией.
3. **Риск разрыва навигации:** миграция ROADMAP -> CHRONICLE может сломать ссылки.
   - Митигировать: route redirects + audit cross-links.
4. **Риск продуктовой неоднозначности:** где wiki, где narrative.
   - Митигировать: чёткая роль вкладок в IA.

---

## 14) Ресурсы к изучению

## 14.1 Внешние референсы

1. `https://itempire.com` — главный визуальный референс композиции сцены (на момент проверки 2026-02-19 endpoint отдаёт `Framer 404`, поэтому baseline для сравнения фиксируем по скриншотам CREATOR и локально собранным reference-артефактам).
2. Скриншоты CREATOR (эталон текущего направления по атмосфере/HUD).
3. `https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style` — CSS 3D основа Orbit.
4. `https://developer.mozilla.org/en-US/docs/Web/CSS/perspective` — настройка глубины сцены.
5. `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion` — политика reduced-motion.
6. `https://www.w3.org/WAI/ARIA/apg/patterns/carousel/` — ориентир по доступности карусельных/орбитальных UI.
7. `https://reactrouter.com/en/main` — маршрутизация chapter pages и deep links.

## 14.2 Внутренние UI-ресурсы (обязательные)

1. `app/routes/_layout.tsx` — top nav, потребуется ROADMAP -> CHRONICLE.
2. `app/routes/dashboard/roadmap/index.tsx` — текущая заглушка/точка замены.
3. `app/routes/dashboard/content/ContentCategoryView.tsx` — текущий Orbit usage.
4. `components/content/OrbitView.tsx` — Orbit core.
5. `components/content/orbit-view.css` — стили Orbit.
6. `components/content/orbitMath.ts` — математика snapping/rotation.
7. `components/ContentFilters.tsx` — удаление Orbit из Content режимов.
8. `lib/vfs/index.ts` — паттерн загрузки манифестов.
9. `public/data/content/manifest.json` — пример агрегатной схемы контента.

## 14.3 Канон и narrative-источники

1. `canon/v3/04_STORY_STRUCTURE/04.02_PROLOGUE.md`
2. `canon/v3/04_STORY_STRUCTURE/04.01_FIRST_CHAPTER.md`
3. `canon/v3/04_STORY_STRUCTURE/04.00.n_NAV.json`
4. `canon/v3/02_LOCATIONS/02.02_NEXUS/02.02.00.r_README.md`
5. `canon/v3/02_LOCATIONS/02.04_ECHELON/02.04.01_ECHELON.md`
6. `canon/v3/03_CHARACTERS/03.03_AXIOM.html`
7. `canon/v3/03_CHARACTERS/03.01_VIKTOR.html`
8. `canon/v3/06_FACTIONS/06.01_ENDEAVOR.md`

## 14.4 Процесс и протоколы

1. `AGENTS.md` (root)
2. `apps/axiom-web-core-ui/AGENTS.md`
3. `apps/axiom-web-core-ui/ops/agent_ops/README.md`
4. `apps/axiom-web-core-ui/ops/agent_ops/logs/00_LOG_INDEX.md`

---

## 15) Open Questions (для финализации перед R1)

1. Нужен ли временный redirect `/dashboard/roadmap -> /dashboard/chronicle`?
2. Какие 4 карточки утверждаем как «официальный draft baseline» (названия + hook)?
3. Нужно ли в MVP сразу включать chapter route или оставить кнопку `Preview` без перехода?
4. Приоритет mobile: полноценный Orbit fallback или упрощённый cards-strip только для MVP?
5. Нужен ли отдельный canary-флаг для экспериментального motion-профиля CHRONICLE?

---

## 16) Definition of Done (по этапам)

### DoD R1

- Есть новая вкладка CHRONICLE в nav.
- Orbit работает в CHRONICLE и отсутствует в CONTENT.
- 4 карточки `draft` отображаются и кликаются.
- Пользователь видит quick info: события, персонажи, локации.
- Есть базовые e2e проверки и безошибочный build.

### DoD R2

- Открываются самостоятельные chapter pages.
- Каждая глава имеет индивидуальный `styleProfile`.
- Есть переходы previous/next и минимальная межглавная связанность.

### DoD R3+

- Chronicle-данные приходят из `canon/v3` по стабильному контракту.
- Сформирован narrative graph связей между разделами.

---

## 17) Перспектива на 3–6 месяцев

1. **Narrative OS:** CHRONICLE становится главным сюжетным интерфейсом сайта.
2. **Chapter-as-Experience:** каждая глава открывается как отдельный художественный опыт.
3. **Connected Universe:** связи между главами, контентом, новостями и AXCHAT строят единый мир, а не отдельные страницы.
4. **Live Narrative:** в будущем возможны time-based chapter states (например, phase windows, timed unlocks, event overlays).
