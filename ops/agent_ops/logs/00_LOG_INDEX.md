<!--
AXS_HEADER_META:
  id: AXS.AXUI.OPS_AGENT_OPS_LOGS_00_LOG_INDEX_MD
  title: "GLOBAL LOG INDEX"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-17
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

<!-- ops/agent_ops/logs/00_LOG_INDEX.md -->

# GLOBAL LOG INDEX

| ID   | Дата/Start              | Задача                                            | Ветка                       | SPEC                                        | GLOBAL LOG                                         | Статус |
| ---- | ----------------------- | ------------------------------------------------- | --------------------------- | -------------------------------------------- | -------------------------------------------------- | ------ |
| 0001 | 2025-12-20T17:33:06+03:00 | Внедрение AgentOps лог-системы (TUNNEL_DEV spec) | feature/profile-auth-v2.3.1 | docs/devtools/TUNNEL_DEV_IMPLEMENTATION_SPEC.md | ops/agent_ops/logs/0001_tunnel-dev-implementation.md | DONE |
| 0002 | 2025-12-19T18:36:56+03:00 | TUNNEL_DEV защищённый туннель (run_tunnel_dev)   | feature/profile-auth-v2.3.1 | docs/devtools/TUNNEL_DEV_IMPLEMENTATION_SPEC.md | ops/agent_ops/logs/0002_tunnel-dev-implementation.md | BLOCKED |
| 0003 | 2025-12-20T19:00:46+03:00 | Рефакторинг структуры docs (iterations/releases/specs) | feature/profile-auth-v2.3.1 | нет                                          | ops/agent_ops/logs/0003_docs-structure-cleanup.md  | DONE
| 0004 | 2025-12-20T19:21:33+03:00 | README для каталога docs (структура/навигация)   | feature/profile-auth-v2.3.1 | нет                                          | ops/agent_ops/logs/0004_docs-readme.md            | DONE |
| 0005 | 2025-12-20T20:15:29+03:00 | Баг/фикс кампания v2.3.1 (backlog docs/bugs)     | bugfix/v2.3.1-bugs-sweep    | docs/iterations/bugfix-v2.3.1-bugs-sweep/spec.md | ops/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md | ACTIVE |
| 0006 | 2025-12-22T11:16:28+03:00 | DEMO CONTENT PACK v1.0                           | feat/demo-content-pack      | docs/content/demo-content-pack/DEMO_CONTENT_PACK_SPEC_v1.0.md | ops/agent_ops/logs/0006_demo-content-pack.md      | DONE |
| 0007 | 2026-02-05T15:47:30+03:00 | Ребейз docs/ops/agent/integrations под формат AXS | main                        | —                                          | ops/agent_ops/logs/0007_docs-ops-rebase.md      | DONE |
| 0008 | 2026-02-05T16:40:28+03:00 | Фикс/стабилизация UI тестов и пинов              | main                        | —                                          | ops/agent_ops/logs/0008_ui-stabilization.md      | DONE |
| 0009 | 2026-02-05T18:57:34+03:00 | Unit tests + README про Lighthouse CHROME_PATH  | main                        | —                                          | ops/agent_ops/logs/0009_ui-qa-readme.md          | DONE |
| 0010 | 2026-02-05T19:27:27+03:00 | AI UI scan (Playwright screenshots)             | main                        | —                                          | ops/agent_ops/logs/0010_ui-ai-scan.md            | DONE |
| 0011 | 2026-02-09T15:27:32+03:00 | UI walkthrough (registration + screenshots)     | main                        | —                                          | ops/agent_ops/logs/0011_ui-walkthrough-screenshots.md | DONE |
| 0012 | 2026-02-09T16:02:26+03:00 | Scale/viewport review + preview card fix        | main                        | —                                          | ops/agent_ops/logs/0012_ui-scale-debug-review.md | DONE |
| 0013 | 2026-02-09T16:27:40+03:00 | Reader window fix (legacy vs ReadRoute styles)  | main                        | —                                          | ops/agent_ops/logs/0013_reader-window-fix.md     | DONE |
| 0014 | 2026-02-09T16:45:00+03:00 | Restore legacy reader behavior                  | main                        | —                                          | ops/agent_ops/logs/0014_reader-restore-legacy.md | DONE |
| 0015 | 2026-02-09T17:05:00+03:00 | Image checks (reader/preview)                   | main                        | —                                          | ops/agent_ops/logs/0015_image-checks.md          | DONE |
| 0016 | 2026-02-09T18:38:46+03:00 | Playwright: existing dev server mode            | main                        | —                                          | ops/agent_ops/logs/0016_playwright-existing-server.md | DONE |
| 0017 | 2026-02-09T19:51:24+03:00 | Playwright: auth stub + auto-detect             | main                        | —                                          | ops/agent_ops/logs/0017_playwright-auth-stub-autodetect.md | DONE |
| 0018 | 2026-02-09T20:02:56+03:00 | README: Playwright e2e auth stub                | main                        | —                                          | ops/agent_ops/logs/0018_readme-playwright-e2e-auth.md | DONE |
| 0019 | 2026-02-09T19:54:16+03:00 | Playwright webServer typing fix                 | main                        | —                                          | ops/agent_ops/logs/0019_playwright-webserver-typing.md | DONE |
| 0020 | 2026-02-09T21:10:12+03:00 | Fix remaining typecheck errors                  | main                        | —                                          | ops/agent_ops/logs/0020_typecheck-fixes.md | DONE |
| 0016 | 2026-02-09T18:33:46+03:00 | Backend auth + roles + demo mode                | main                        | docs/specs/0016_backend-auth-roles-demo-mode.md | ops/agent_ops/logs/0016_backend-auth-roles-demo-mode.md | DONE |
| 0021 | 2026-02-09T21:07:10+03:00 | run_local.py default full (UI+API)              | main                        | —                                          | ops/agent_ops/logs/0021_run-local-full-default.md | DONE |
| 0022 | 2026-02-09T21:40:10+03:00 | Login shadow fix (login handler)                | main                        | —                                          | ops/agent_ops/logs/0022_login-shadow-fix.md | DONE |
| 0023 | 2026-02-09T21:40:10+03:00 | Admin ops guide (DB/roles/sessions)             | main                        | —                                          | ops/agent_ops/logs/0023_admin-ops-guide.md | DONE |
| 0024 | 2026-02-09T22:27:21+03:00 | Tunnel dev fix (host header + hash defaults)    | main                        | —                                          | ops/agent_ops/logs/0024_tunnel-dev-fix.md | DONE |
| 0025 | 2026-02-09T22:49:21+03:00 | Tunnel dev full check + password reset          | main                        | —                                          | ops/agent_ops/logs/0025_tunnel-dev-full-check.md | DONE |
| 0026 | 2026-02-09T23:14:46+03:00 | Open 7844 + tunnel verification                 | main                        | —                                          | ops/agent_ops/logs/0026_tunnel-dev-7844-open.md | PAUSED |
| 0027 | 2026-02-09T23:32:54+03:00 | Localtunnel fallback for WSL                    | main                        | —                                          | ops/agent_ops/logs/0027_tunnel-localtunnel-fallback.md | PAUSED |
| 0028 | 2026-02-10T15:58:43+03:00 | AXCHAT (ECHO AXIOM) — замена вкладки AUDIT      | main                        | docs/iterations/axchat-echo-axiom/spec.md   | ops/agent_ops/logs/0028_axchat-echo-axiom.md | DONE |
| 0029 | 2026-02-10T16:02:27+03:00 | NEWS Signal Center (редизайн вкладки NEWS)      | main                        | docs/iterations/0011_news-signal-center/SPEC.md | ops/agent_ops/logs/0029_news-signal-center.md | ACTIVE |
| 0030 | 2026-02-10T19:41:16+03:00 | Boot-sequence loader + переход на login         | main                        | docs/iterations/0030_login-boot-loader-transition/SPEC.md | ops/agent_ops/logs/0030_login-boot-loader-transition.md | ACTIVE |
| 0031 | 2026-02-10T22:35:53+03:00 | CONTENT LIBRARY — Orbit View + UI De-Mix        | main                        | docs/iterations/0031_content-orbit-view-ui-demix/SPEC.md | ops/agent_ops/logs/0031_content-orbit-view-ui-demix.md | ACTIVE |
| 0032 | 2026-02-10T22:46:00+03:00 | NEWS v2 (Dispatch + Signal Center, Feed rework) | main                        | docs/iterations/0012_news-v2-dispatch-signal-center/SPEC.md | ops/agent_ops/logs/0032_news-v2-dispatch-signal-center.md | ACTIVE |
| 0033 | 2026-02-11T02:28:36+03:00 | NEWS: Signal Center Rework v1 (autoplay + density) | main                     | docs/iterations/0013_news-signal-center-rework-v1/SPEC.md | ops/agent_ops/logs/0033_news-signal-center-rework-v1.md | ACTIVE |
| 0034 | 2026-02-11T04:12:44+03:00 | Content Hub View Modes Stabilization v2         | main                        | docs/iterations/0034_content-hub-viewmodes-stabilization-v2/SPEC.md | ops/agent_ops/logs/0034_content-hub-viewmodes-stabilization-v2.md | ACTIVE |
| 0035 | 2026-02-17T16:40:28+03:00 | Seed tester account Staxov_test (role test)     | main                        | —                                          | ops/agent_ops/logs/0035_tester-account-staxov-seed.md | DONE |
| 0036 | 2026-02-17T16:56:42+03:00 | Fix IDE Node types for server config.ts         | main                        | —                                          | ops/agent_ops/logs/0036_server-tsconfig-node-types.md | DONE |
| 0037 | 2026-02-17T17:06:54+03:00 | Full custom admin console + run_local admin mode | main                       | —                                          | ops/agent_ops/logs/0037_admin-console-bootstrap-run-local.md | DONE |
| 0038 | 2026-02-17T18:06:25+03:00 | Auth reliability + backend-down checks (site/admin) | main                     | —                                          | ops/agent_ops/logs/0038_auth-reliability-admin-backend-down-tests.md | DONE |
| 0039 | 2026-02-17T19:49:53+03:00 | Admin auth/session isolation fix (`/admin` vs site auth) | main                   | —                                          | ops/agent_ops/logs/0039_admin-auth-session-isolation-fix.md | DONE |
| 0040 | 2026-02-17T20:19:12+03:00 | Admin control center: user/system split + credentials + history + live console + logout reliability | main | — | ops/agent_ops/logs/0040_admin-control-center-user-history.md | DONE |
| 0041 | 2026-02-17T20:31:36+03:00 | Admin history/logout hardening (safe audit + reliable redirect) | main | — | ops/agent_ops/logs/0041_admin-history-logout-hardening.md | DONE |
| 0042 | 2026-02-17T21:43:57+03:00 | Admin force re-auth after logout + section defaults + dev log visibility | main | — | ops/agent_ops/logs/0042_admin-logout-force-reauth-sections.md | DONE |
| 0043 | 2026-02-17T23:55:06+03:00 | Tunnel no-auth default (remove browser login prompt) | main | — | ops/agent_ops/logs/0043_tunnel-no-auth-default.md | DONE |
| 0044 | 2026-02-18T01:17:24+03:00 | Admin URL command reference panel (`?debug=1` and related params) | main | — | ops/agent_ops/logs/0044_admin-url-command-reference-panel.md | ACTIVE |
> Добавляй новые строки сверху или снизу, сохраняя сортировку по ID (4 цифры).
