# docs/bugs/BUG-001_footer-scale-gap.md

---
id: BUG-001
title: Footer (нижняя статус-плашка) не прижат к низу из-за глобального scale
status: OPEN
severity: Medium
area: Dashboard / Layout
created: 2025-12-19
updated: 2025-12-19
---

## Summary
На главной странице (`/dashboard`) нижняя статус-плашка (footer/status bar) визуально **не прижата к самому низу экрана** — снизу остается пустое пространство (черное поле). По ощущениям проблема связана с системой **глобального `scale`**.

## Environment
- Page: `/dashboard`
- Mode: Desktop
- Repro: стабильный (по скрину)

## Steps to Reproduce
1) Открыть `/dashboard`
2) Дойти взглядом до нижней статус-плашки (MODE/SECTION слева и ENV/VER/ONLINE справа)
3) Наблюдать отступ снизу: плашка не “в ноль” у нижней границы окна

## Expected
Footer/status bar всегда прижат к нижней границе viewport (без пустого поля ниже).

## Actual
Footer визуально “висит выше”, под ним остается пустая область.


## Notes / Hypothesis (draft)
Частая причина: `transform: scale(...)` на родителе создает новый containing block — и элементы с `position: fixed` начинают вести себя как привязанные к трансформированному контейнеру, а не к viewport. Итог — “съезжает” низ.

## Proposed Fix (draft)
- Вариант A (предпочтительно): вынести footer/status bar **вне** контейнера, на который применяется `transform/scale`.
- Вариант B: отказаться от `transform: scale` в пользу адаптивной верстки (clamp, vw/vh, container queries) или “zoom-подобного” решения, которое не ломает fixed.
- Вариант C: если scale обязателен — пересчитать высоты/позиции и/или использовать отдельный “не-scaled” слой для fixed-элементов.

## Acceptance Criteria
- При любом размере окна footer всегда прижат к низу (0px gap).
- При смене масштаба/resize не появляется “черная полоса” ниже footer.
