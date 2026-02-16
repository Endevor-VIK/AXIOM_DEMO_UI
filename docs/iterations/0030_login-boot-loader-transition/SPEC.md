<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_ITERATIONS_0030_LOGIN_BOOT_LOADER_TRANSITION_SPEC
  title: "0030 — Boot-sequence loader + переход на login"
  status: ACTIVE
  mode: Doc
  goal: "SPEC"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-16
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- docs/iterations/0030_login-boot-loader-transition/SPEC.md -->

# 0030 — Boot-sequence loader + переход на login

## 0) Цель
Стабилизировать login-сцену (boot-sequence + Orion background), закрыть технические долги по типам/QA и довести задачу до повторяемого production-ready состояния.

## 1) Область работ
- Страница `/login`: boot-sequence overlay, переход к панели логина, отсутствие звука.
- WebGL-фон: Orion city pipeline (`glb + ktx2 + basis`), устойчивый базовый ракурс и cursor-parallax.
- Доступность: корректная деградация при `prefers-reduced-motion`.
- Надёжность: отсутствие JS/network ошибок в smoke-сценарии.

## 2) Ограничения
- Не менять поведение других роутов.
- Не ломать текущий UX-ритм boot/login, согласованный с CREATOR.
- Не добавлять массовый refactor за пределами login-контура.

## 3) План вывода на новый уровень (S0-S5)
- S0 (30-60 мин): зафиксировать baseline, блокеры и критерии DONE в SPEC/AgentOps.
- S1 (2-4 часа): убрать блокирующие ошибки typecheck в login-контуре, сохранив текущий визуальный профиль.
- S2 (0.5-1 день): добавить детерминированный smoke/e2e для `/login` (boot ready, canvas, panel visible, no console/network errors).
- S3 (0.5-1 день): закрыть acceptance по `prefers-reduced-motion` и повторяемости boot-последовательности.
- S4 (0.5-1 день): стабилизировать performance/fallback для тяжёлых ассетов (чёткий graceful path при деградации GPU/ресурсов).
- S5 (1-2 часа): финальный QA, заполнение Step D/Step E, перевод задачи в DONE.

## 4) Текущие блокеры (срез на 2026-02-16)
- `npm run typecheck` падает в `components/login/OrionCityBackground.tsx` (`Material | undefined`, `scene.fog possibly null`).
- Нет выделенного автоматизированного e2e-теста именно на критерии login boot-sequence.
- Чеклист приёмки в логе 0030 остаётся незакрытым.

## 5) Quality Gates для закрытия 0030
- Gate 1: `npm run typecheck` = PASS.
- Gate 2: `npm run build` = PASS.
- Gate 3: smoke `/login` подтверждает `data-boot=ready`, наличие canvas и login-panel.
- Gate 4: smoke `/login` подтверждает `ERROR_COUNT=0` и `REQ_FAIL_COUNT=0`.
- Gate 5: сценарий `prefers-reduced-motion` не ломает переход и интерфейс логина.

## 6) Критерии DONE
- Все пункты чеклиста в `ops/agent_ops/logs/0030_login-boot-loader-transition.md` отмечены.
- Step D содержит полный QA-трейс по актуальным правкам.
- Step E содержит атомарные коммиты без смешивания чужих изменений.
- `00_LOG_INDEX.md` и GLOBAL LOG для 0030 переведены в `DONE`.
