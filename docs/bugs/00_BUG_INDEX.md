# docs/bugs/00_BUG_INDEX.md

# AXIOM_DEMO_UI — BUG INDEX

> Локация логов: `docs/bugs/`  
> Статус ветки bugfix: **FROZEN** (фикс-поток приостановлен, баги остаются активными)  
> Последнее обновление: 2025-12-22 (bugfix v2.3.1)

## Audit Reports
- [AUDIT_FULL_PROJECT_v2.3.1.md](AUDIT_FULL_PROJECT_v2.3.1.md)

### Top problems (Critical/High)
| ID | Title | Area | Severity | Status |
|---|---|---|---|---|
| [SEC-001](SEC-001_preview-sandbox-same-origin.md) | Sandbox-превью запускает скрипты с правами origin | Reader / Content Preview | Critical | OPEN |
| [BUG-003](BUG-003_reader-overlay-menu-scroll.md) | Reader overlay/menu ломается при скролле | Reader / Overlay / Menu | Critical | DONE |
| [SEC-002](SEC-002_reader-unsanitized-html.md) | Reader вставляет HTML без санитайза | Reader | High | OPEN |
| [BUG-007](BUG-007_reader-legacy-dataset.md) | Reader сидит на legacy-индексе, VFS записи не открывает | Reader / Content Hub | High | OPEN |
| [ARCH-001](ARCH-001_dual-content-pipeline.md) | Две пайплайны контента (legacy vs VFS) → рассинхрон | Architecture / Content | High | OPEN |
| [SEC-003](SEC-003_markdown-allows-javascript-protocol.md) | Markdown санитайз пропускает javascript:/data: ссылки | Reader / Content Preview | High | OPEN |
| [BUG-005](BUG-005_perf-animations-low-end.md) | Тяжёлые анимации лагают на low-end | Global / Performance | High | OPEN |
| [BUG-002](BUG-002_windowed-scale-break.md) | Windowed mode ломает scale/layout | Responsive / Global Scale | High | OPEN |
| [BUG-006](BUG-006_scale-parity-windowed.md) | Несовпадение масштаба при windowed/zoom | Responsive / Scale | High | IN_PROGRESS |

## Active Bugs

| ID | Title | Area | Severity | Status | Evidence |
|---|---|---|---|---|---|
| [BUG-001](BUG-001_footer-scale-gap.md) | Footer (нижняя статус-плашка) не прижат к низу из-за `scale` | Dashboard / Layout | Medium | OPEN | Скрин 1 |
| [BUG-002](BUG-002_windowed-scale-break.md) | При выходе в оконный режим ломается `scale`: элементы наезжают/ломают форму | Responsive / Global Scale | High | OPEN | Скрин 2–4 |
| [BUG-003](BUG-003_reader-overlay-menu-scroll.md) | Reader: overlay + меню привязаны к “верхней точке”, не открываются корректно на любой позиции скролла | Reader / Overlay / Menu | Critical | DONE | Скрин 5–7 |
| [BUG-004](BUG-004_avatar-dropdown-offset.md) | Avatar dropdown: меню рендерится заметно левее/правее аватара, не прилипает к кнопке | Topbar / Overlay | Medium | OPEN | Скрин (см. BUG-004) |
| [BUG-005](BUG-005_perf-animations-low-end.md) | Низкая плавность анимаций и лаги на слабых ноутбуках (blur, scanlines, ticker) | Global / Performance | High | OPEN | Воспроизведение на iGPU/low-power режимах |
| [BUG-006](BUG-006_scale-parity-windowed.md) | Несоответствие форм-фактора при windowed/zoom: карточки/боксы “плывут”, scale не совпадает с full window | Responsive / Scale | High | IN_PROGRESS | Скрин/наблюдения при windowed 80–90% |
| [BUG-007](BUG-007_reader-legacy-dataset.md) | Reader использует legacy-индекс, новые VFS записи не открываются | Reader / Content Hub | High | OPEN | Код + переход `/content/{id}` |

## Architecture / Security / Performance
- [ARCH-001](ARCH-001_dual-content-pipeline.md) — Две пайплайны контента (VFS vs legacy) → рассинхрон/битые переходы — **High**, OPEN.
- [SEC-001](SEC-001_preview-sandbox-same-origin.md) — Sandbox-превью с правами origin — **Critical**, OPEN.
- [SEC-002](SEC-002_reader-unsanitized-html.md) — Reader вставляет HTML без санитайза — **High**, OPEN.
- [SEC-003](SEC-003_markdown-allows-javascript-protocol.md) — Markdown санитайз пропускает javascript:/data: — **High**, OPEN.
- [PERF-001](PERF-001_avatar-menu-reflow.md) — Аватар-меню пересчитывается на каждый scroll/resize — **Medium**, OPEN.

## Investigation References (ветки/коммиты)
- Commit: `47e57dc7ff1cea8ffba12f07e5ec5767ffe8de47`
- Commit: `0c540a67a6e4181eb0d2909edf0d2291d8a33ceb`
- Commit: `efa9d1d8d9bb7433581395a4e403500a7531057b`
- Branch commits: `feat/content-v2.3/content-hub-ui-redesign`

## Notes
- BUG-003 закрыт; остальные баги остаются **OPEN**.  
- Ветка с багфиксами временно **заморожена** до закрытия задач по профилю/регистрации (новая ветка feature-потока).
