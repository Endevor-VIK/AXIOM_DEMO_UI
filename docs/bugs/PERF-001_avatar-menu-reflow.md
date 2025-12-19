id: PERF-001
title: Avatar dropdown пересчитывается на каждом scroll/resize без троттлинга
status: OPEN
severity: Medium
area: Topbar / Overlay
confidence: Medium

## Summary
При открытом пользовательском меню навешиваются глобальные `scroll`/`resize` (capture) и сразу дергается `getBoundingClientRect` для пересчёта координат. На длинных списках это срабатывает на каждый кадр скролла без троттлинга/дебаунса → layout thrash и лаги, особенно на слабых машинах с уже тяжёлыми эффектами.

## Steps to reproduce
1) Открыть дашборд, кликнуть аватар (меню открыто).  
2) Прокручивать Content Hub или быстро ресайзить окно.  
3) Наблюдать подлагивания/рост нагрузки при каждом событии.

## Expected vs Actual
- Ожидаемо: пересчёт позиции через rAF/дебаунс, минимальное влияние на scroll/resize.  
- Фактически: синхронный пересчёт на каждое событие, дергает layout.

## Evidence
- Слушатели без троттлинга: `components/UserMenuDropdown.tsx:66-80` (capture, вызывает `computeCoords` с `getBoundingClientRect`).

## Root cause hypothesis
- Логика позиционирования оставлена “в лоб”, без учёта частоты scroll/resize; capture-режим усугубляет нагрузку.

## Proposed fix
- Обернуть обновление позиции в rAF/дебаунс, убрать capture для scroll, использовать `ResizeObserver` или CSS `position: fixed` там, где возможно.  
- Прогнать профилирование на low-end для подтверждения прироста.

## Acceptance criteria
- При открытом меню скролл/ресайз остаётся плавным на слабом железе; счётчик вызовов обработчика снижен.  
- Позиционирование меню корректно после троттлинга.  
- Без регрессий в закрытии/кликах.

## References
- components/UserMenuDropdown.tsx:66-80
