# docs/bugs/00_BUG_INDEX.md

# AXIOM_DEMO_UI — BUG INDEX

> Локация логов: `docs/bugs/`  
> Статус ветки bugfix: **FROZEN** (фикс-поток приостановлен, баги остаются активными)  
> Последнее обновление: 2025-12-19

## Active Bugs

| ID | Title | Area | Severity | Status | Evidence |
|---|---|---|---|---|---|
| [BUG-001](BUG-001_footer-scale-gap.md) | Footer (нижняя статус-плашка) не прижат к низу из-за `scale` | Dashboard / Layout | Medium | OPEN | Скрин 1 |
| [BUG-002](BUG-002_windowed-scale-break.md) | При выходе в оконный режим ломается `scale`: элементы наезжают/ломают форму | Responsive / Global Scale | High | OPEN | Скрин 2–4 |
| [BUG-003](BUG-003_reader-overlay-menu-scroll.md) | Reader: overlay + меню привязаны к “верхней точке”, не открываются корректно на любой позиции скролла | Reader / Overlay / Menu | Critical | OPEN | Скрин 5–7 |
| [BUG-004](BUG-004_avatar-dropdown-offset.md) | Avatar dropdown: меню рендерится заметно левее/правее аватара, не прилипает к кнопке | Topbar / Overlay | Medium | OPEN | Скрин (см. BUG-004) |
| [BUG-005](BUG-005_perf-animations-low-end.md) | Низкая плавность анимаций и лаги на слабых ноутбуках (blur, scanlines, ticker) | Global / Performance | High | OPEN | Воспроизведение на iGPU/low-power режимах |
| [BUG-006](BUG-006_scale-parity-windowed.md) | Несоответствие форм-фактора при windowed/zoom: карточки/боксы “плывут”, scale не совпадает с full window | Responsive / Scale | High | OPEN | Скрин/наблюдения при windowed 80–90% |

## Investigation References (ветки/коммиты)
- Commit: `47e57dc7ff1cea8ffba12f07e5ec5767ffe8de47`
- Commit: `0c540a67a6e4181eb0d2909edf0d2291d8a33ceb`
- Commit: `efa9d1d8d9bb7433581395a4e403500a7531057b`
- Branch commits: `feat/content-v2.3/content-hub-ui-redesign`

## Notes
- Все баги сейчас **OPEN**.  
- Ветка с багфиксами временно **заморожена** до закрытия задач по профилю/регистрации (новая ветка feature-потока).
