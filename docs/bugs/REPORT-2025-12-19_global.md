# AXIOM_DEMO_UI — Global Bug/Optimization Report (2025-12-19)

## Scope
- Объединённый список открытых багов и найденных проблем (performance, scale, overlay).
- Основан на текущем состоянии ветки `feature/profile-auth-v2.3.1` и существующих баг-логах.

## Active Bugs (summary)
- BUG-001 — Footer не прижат из-за `scale` (Dashboard/Layout)
- BUG-002 — Windowed режим ломает `scale` и форму (Responsive/Global Scale)
- BUG-003 — Reader overlay/menu привязан к top, не работает на scroll (Reader/Overlay)
- BUG-004 — Avatar dropdown смещён относительно аватара (Topbar/Overlay)
- BUG-005 — Лаги анимаций/blur/scanlines на слабых ноутбуках (Global/Performance)
- BUG-006 — Форм-фактор/scale отличается в windowed/zoom (Responsive/Scale)

## New/Updated Findings
- Performance: тяжёлые эффекты (blur/backdrop-filter/scanlines/box-shadow) + ticker → лаги на iGPU/battery saver (BUG-005).
- Scale parity: при zoom 80–90% и windowed ширине <1440px заметно “плывут” бордеры/карточки; проблема отдельна от, но связана с BUG-002 (BUG-006).
- Avatar dropdown: несмотря на центрирование, реальный offset остаётся (BUG-004) — требуется доп. привязка к якорю.

## Proposed Mitigations (high level)
1) Scale/Transform:
   - Убрать `transform: scale` из layout-контейнеров; переход на clamp/rem токены, согласованные бордеры/теневые значения.
   - Проверить sticky/portal слои без наследования масштабов; снапшоты DPI/zoom.
2) Overlays:
   - Доисправить привязку avatar dropdown (recalc с учётом фактической ширины меню и контейнера topbar, прижатие к якорю).
   - Reader overlay/menu — привязка к viewport scroll (BUG-003).
3) Performance/Animations:
   - Добавить строгий `prefers-reduced-motion` и lightweight режим (отключать blur/scanlines, упрощать тени).
   - Оптимизировать ticker (CSS-only + eased speed; throttle/RAF).
   - Профилировать на low-power профиле, снизить сложные box-shadow/filters.

## Next Steps
- Приоритизировать BUG-002/006 (scale parity) и BUG-005 (perf) в отдельном спринте.
- Добавить визуальные regression-тесты (Playwright/Loki) для разных zoom/DPR.
- Зафиксировать метрики FPS/CPU до и после оптимизаций.
