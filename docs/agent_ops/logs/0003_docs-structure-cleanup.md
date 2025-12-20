<!-- docs/agent_ops/logs/0003_docs-structure-cleanup.md -->

# GLOBAL LOG — 0003_docs-structure-cleanup

- Старт: 2025-12-20T19:00:46+03:00
- Агент: Codex (ChatGPT, GPT-5)
- Репозиторий: AXIOM_DEMO_UI (ui)
- Ветка: feature/profile-auth-v2.3.1
- Задача: Рефакторинг структуры docs (iterations/releases/specs) без изменения кода
- SPEC: нет (операционная задача по структуре)
- Статус: ACTIVE

---

## Step A — Discovery
- 2025-12-20T19:00:46+03:00 — Действие: Зафиксировал старт сессии; цель — разнести рассыпанные docs по папкам задач/итераций/релизов и обновить ссылки. → Результат: OK

## Step B — Implementation
- 2025-12-20T19:04:10+03:00 — Действие: Создал структуру папок для итерации/релиза `content-v2.1-fix` и перенёс файлы: `docs/iterations/content-v2.1-fix/{content-v2.1-fix.md,content-v2.1-fix-prompt-tz.md}`, `docs/releases/content-v2.1-fix/release-checklist.md`; заменил не-ASCII дефисы на обычные. → Результат: OK
- 2025-12-20T19:06:20+03:00 — Действие: Рефакторил контент/интеграции/спеки: перенёс `AX_OPENAI_API_INTEGRATION_v0.1`, `ax-counter-wreath`, `binary-background`, `content-authoring-v2.1`, `GETTING_STARTED`, `ITERATION_PLAN_AXIOM DEMO_UI_v1.0` в тематические каталоги (`docs/integrations/...`, `docs/specs/...`, `docs/content/...`, `docs/guides/...`, `docs/plans/...`). → Результат: OK
- 2025-12-20T19:09:30+03:00 — Действие: Обновил пути и ссылки после переездов (SOP, SPEC, release checklist, guides, integration docs), синхронизировал комментарии и указатели. → Результат: OK

## Step C — Documentation
- 

## Step D — QA
- 

## Step E — Git
- 

---

## Notes / Decisions
- Статус/организация будет следовать подходу docs/devtools: отдельные директории под задачи, корректные относительные ссылки, обновление индекса AgentOps при необходимости.

## Risks / Open Points
- Нужно обновить все ссылки после переездов; возможны скрытые ссылки в других документах.

## Acceptance Checklist
- [ ] Созданы директории под выявленные документы (iterations/releases/specs)
- [ ] Файлы перемещены/переименованы в ASCII и структурированы
- [ ] Ссылки обновлены (SPEC/README/Prompt и др.)
- [ ] AgentOps индекс/лог дополнен (ID 0003)
- [ ] Статусы (ACTIVE/BLOCKED/DONE) проставлены при необходимости
