# docs/bugs/BUG-003_reader-overlay-menu-scroll.md

---
id: BUG-003
title: Reader: overlay + меню не открываются корректно на любой позиции страницы (привязка к “верхней точке”)
status: OPEN
severity: Critical
area: Reader / Overlay / Menu
created: 2025-12-19
updated: 2025-12-19
---

## Summary
В Reader-режиме (просмотр файла/страницы) боковое меню `AXIOM FILES` и overlay визуально могут выглядеть “нормально” в верхней части, но при скролле проявляется ошибка: **overlay и меню остаются привязанными к позиции**, и **не открываются корректно из любой точки страницы**, где пользователь находится по скроллу.

Ключ: меню/overlay должны открываться и быть видимыми **в текущем viewport**, независимо от того, на какой глубине страницы мы находимся.

## Environment
- Page: Reader (пример: просмотр `03.01_VIKTOR`, open source/reader)
- UI elements: overlay (`axr-overlay`) + меню (`axr-menu`)

## Steps to Reproduce
1) Открыть reader-страницу (любой длинный документ)
2) Прокрутить вниз (не находиться в верхней части страницы)
3) Открыть `AXIOM FILES` (левое меню)
4) Наблюдать: поведение overlay/меню не соответствует ожидаемому (привязка/позиция/видимость/покрытие viewport)

## Expected
- Overlay покрывает **весь текущий viewport** (`position: fixed; inset: 0`)
- Меню появляется **в текущей области просмотра** и доступно пользователю, даже если он на середине/внизу страницы
- При открытом меню фон не скроллится (или скролл корректно залочен), и не возникает “съезда” слоев

## Actual
- Overlay/меню визуально “стоят на месте” относительно страницы и не гарантируют корректное открытие на любой глубине скролла

## Evidence
- Скрин 5: как будто “всё нормально” (в верхней зоне)
- Скрин 6: демонстрация проблемы после скролла
- Скрин 7: DevTools (видно структуру классов)
  - `.axr-overlay.axr-overlay--open`
  - `.axr-menu.axr-menu--open`

## Notes / Hypothesis (draft)
Типовые причины:
- overlay/меню имеют `position: absolute` вместо `fixed`
- overlay/меню находятся внутри контейнера с `transform` (scale), из-за чего `fixed` начинает вести себя как “локальный fixed”
- неверная логика блокировки скролла (`body { overflow: hidden; }`) + компенсация scrollY не применяется
- z-index/stacking context ломается из-за transform/filter/backdrop

## Proposed Fix (draft)
- Зафиксировать overlay:
  - `position: fixed; inset: 0; height: 100dvh;`
- Зафиксировать меню:
  - `position: fixed; top: var(--safe-top, 0); left: 0; height: 100dvh;`
- Убедиться, что слой overlay/menu рендерится в “чистый” портал:
  - `#modal-root` должен быть **вне** scaled/transform контейнера
- Скролл-лок:
  - при open: сохранить `scrollY`, поставить `body` в `position: fixed; top: -scrollYpx; width: 100%`
  - при close: восстановить scrollY

## Investigation References
- Branch commits: `feat/content-v2.3/content-hub-ui-redesign`
- Commit: `47e57dc7ff1cea8ffba12f07e5ec5767ffe8de47`
- Commit: `0c540a67a6e4181eb0d2909edf0d2291d8a33ceb`
- Commit: `efa9d1d8d9bb7433581395a4e403500a7531057b`

## Acceptance Criteria
- Открыть меню на любой глубине страницы → меню и overlay всегда видимы и корректны.
- Overlay покрывает viewport полностью, клики вне меню закрывают меню.
- Нет “скачка” страницы при open/close меню.
- Нет конфликтов с global scale / transform.
