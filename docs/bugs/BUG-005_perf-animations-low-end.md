<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_BUGS_BUG_005_PERF_ANIMATIONS_LOW_END_MD
  title: "BUG-005 — Лаги анимаций и тяжёлые эффекты на слабых ноутбуках"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

# BUG-005 — Лаги анимаций и тяжёлые эффекты на слабых ноутбуках

- **Area:** Global / Performance
- **Severity:** High
- **Status:** OPEN
- **Date:** 2025-12-19
- **Reporter:** Codex (feature/profile-auth-v2.3.1)

## Problem
На ноутбуках с интегрированной графикой (iGPU) и/или в режиме энергосбережения наблюдаются рывки/лаги в анимациях (ticker, scanlines, blur/gradients, hover-глоу). FPS падает, переходы выглядят дергано, интерфейс ощущается “тяжёлым”.

## Steps to Reproduce
1) Запустить панель на ноутбуке с iGPU (Intel UHD/AMD Vega) или включить battery saver.
2) Открыть `/dashboard` или `/dashboard/content/all`.
3) Наблюдать ticker, hover-эффекты кнопок/чипов, скролл контента.

## Expected
- Анимации плавные (60 fps или близко), без заметных лагов даже на low-power.
- Эффекты (blur/glow/gradients/scanlines) не блокируют перерисовку при взаимодействиях.

## Actual
- Подлагивания ticker и hover, просадки FPS при скролле, особенно на фоне blur/scanlines.
- Эффекты выглядят “тяжёлыми” на слабом железе.

## Notes / Suspected cause
- Обилие CSS blur/backdrop-filter, box-shadow, градиентов и scanlines с opacity анимациями.
- Нет профилированного режима `prefers-reduced-motion`; fallback не снижает нагрузку.
- Отсутствует throttling/RAF для анимаций ticker и кастомных эффектов.

## Proposed next step
- Добавить строгий режим `prefers-reduced-motion` (отключать blur/scanlines/ticker трансформации).
- Оптимизировать ticker (requestAnimationFrame + step easing или CSS-only с меньшей нагрузкой).
- Пересмотреть интенсивность box-shadow/blur, заменить на лёгкие градиенты/opacity.
- Провести профилирование (Performance tab) на low-power профиле и зафиксировать метрики.
