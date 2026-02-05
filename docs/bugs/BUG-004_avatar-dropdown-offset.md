<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_BUGS_BUG_004_AVATAR_DROPDOWN_OFFSET_MD
  title: "BUG-004 — Avatar dropdown смещён от аватара"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

# BUG-004 — Avatar dropdown смещён от аватара

- **Area:** Topbar / Overlay
- **Severity:** Medium
- **Status:** OPEN
- **Date:** 2025-12-19
- **Reporter:** Codex (feature/profile-auth-v2.3.1)

## Problem
Avatar dropdown (portal+fixed) открывается заметно левее кнопки аватара и не прилипает к триггеру. Пользователь ожидает, что меню будет центроваться относительно аватара, но реальный сдвиг остаётся (см. скрин).

## Steps to Reproduce
1) Авторизоваться (demo).
2) Открыть `/dashboard/content/all`.
3) Нажать на аватар в правом верхнем углу.

## Expected
- Меню центрируется относительно аватара и визуально прилегает к триггеру, без горизонтального смещения.

## Actual
- Меню рендерится левее/правее аватара (значительный зазор). См. скриншот в задаче.

## Evidence
- Скрин: аватар в правом верхнем углу, меню открыто правее/ниже, заметный горизонтальный зазор (предоставлено пользователем).

## Notes / Suspected cause
- Вычисление позиции основано на `getBoundingClientRect()` + clamp; возможно, ширина меню/расчёт min/max не учитывает фактическое `offsetWidth` или padding контейнера topbar.
- Ветка: `feature/profile-auth-v2.3.1`.
- В приоритете после завершения UI задач — нужен дополнительный проход позиционирования (anchoring).

## Proposed next step
- Добавить юнит/визуальный тест якоря, пересчитать позицию с учётом `rect.left` и ширины меню, проверить на скролле/resize.
