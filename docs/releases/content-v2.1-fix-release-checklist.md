# Release Checklist — `content-v2.1-fix`

## 1. Overview
- **Branch:** `feat/content-v2.1-fix/content-hub-redesign`
- **Scope:** schema/vfs upgrades, hybrid preview isolation, redesigned content hub UI, accessibility tooling, authoring docs.
- **Primary CHG IDs:** CHG-2025-09-30-001 … CHG-2025-10-23-003 (see §13 for full history).

## 2. Code Review Package (AC: §12.12-P0)
- Confirm reviewers receive:
  - Link to this checklist and `docs/content-authoring-v2.1.md`.
  - Summary of core changes:
    - VFS/schema strict validation (`renderMode`, `assetsBase`, `lang`, `version`, `links`).
    - PrefixStyles/resolveAssets hybrid pipeline + `PreviewPane`/`PreviewBar` rework.
    - ReadRoute/full reader, ContentHub redesign, token refresh.
    - Playwright axe/E2E harness improvements.
  - Test evidence (section 3).
  - Outstanding risks & follow-ups (section 7).
- Ensure Conventional Commit series references the relevant §12 items + CHG IDs.
- Prepare squash message template:
  ```
  feat(content): merge content-v2.1-fix iteration

  refs:
  - §12.2–§12.12
  - CHG-2025-09-30-001 … CHG-2025-10-23-003
  ```
- Branch status: `feat/content-v2.1-fix/content-hub-redesign` (ahead of origin by 2 commits; clean working tree). Review `git log -5` for latest updates.
- Reviewer focus areas:
  - Hybrid preview sandbox isolation (no leaked styles, DOMPurify usage).
  - Playwright axe harness stability; ensure `tmp-playwright-log.txt` historical failures are resolved.
  - Telemetry adapter integration plan (see section 5) and absence of sensitive data in payloads.
  - Performance impact of scoped CSS and sandbox rendering (check devtools screenshots if available).
- Pre-merge checklist:
  - [ ] Confirm Preview smoke + telemetry adapter tasks are complete (sections 4–5).
  - [ ] Re-run Lighthouse once Chrome is available.
  - [ ] Ensure conventional commits are squashed with the template above.

## 3. Test Evidence
- `npm run test -- --runInBand` — ✅ (2025-10-12, 5 files / 21 tests).
- `npm run test:e2e -- --project=chromium tests/e2e/accessibility.spec.ts` — ✅ (2025-10-23).
- `npm run test:e2e -- --project=chromium tests/e2e/content.spec.ts` — ✅ (2025-10-23, chromium+firefox).
- `npm run test:e2e -- --project=firefox tests/e2e/accessibility.spec.ts` — ✅ (2025-10-23).
- `npm run test:e2e -- --project=firefox tests/e2e/content.spec.ts` — ✅ (2025-10-23).
- `npm run typecheck` — ✅ (part of CHG-2025-10-22-002).
- `npm run test:lighthouse` — ⛔ blocked: Chrome binary not available in current environment. Needs rerun on CI/Preview runner with Chrome/Chromium installed.

## 4. Smoke Test Plan (AC: §12.12-P0)
| Environment | Checklist | Status |
| ----------- | --------- | ------ |
| **DEV** | Launch `npm run dev`; verify `/dashboard/content` loads, list renders, PreviewPane toggles between plain/hybrid/sandbox, ReadRoute navigation works. | ✅ `npm run test:e2e -- --project=chromium tests/e2e/content.spec.ts` (2025-10-23) exercises full flow against Vite dev server; no regressions observed. |
| **Preview** | Deploy branch build, repeat DEV checklist, confirm assets load over CDN path, run axe quick scan (Playwright or browser extension). | ⏳ _Requires Preview deploy after code review._ |
| **Prod** | Post-merge smoke: Content hub list, filters, reader, sandbox iframe, telemetry endpoints (see §6). | ⏳ _To be scheduled post-release._ |

## 5. Telemetry Plan (AC: §12.12-P1)
- Required events per §12.12: `content_view`, `reader_open`, `mode_switch`.
- Current status: instrumentation shipped via `lib/analytics.ts` (console fallback) with hooks in `ContentCategoryView`, `ReadRoute`, and `PreviewPane`.
- Remaining steps:
  1. Wire analytics adapter for target provider (`window.AX.analytics.track` or equivalent PostHog/GA bridge).
  2. Append event schema + payload examples to `docs/content-authoring-v2.1.md` (appendix pending).
  3. Optionally extend Playwright coverage to assert `mode_switch` emission (mock endpoint or console capture).
- Action items:
  - [ ] Confirm target analytics provider (GA4/PostHog) and event naming scheme.
  - [ ] Provide production adapter implementation / configuration snippet.
  - [x] Update authoring guide appendix with telemetry payload reference.

## 6. Post-Release Monitoring (AC: §12.12-P2)
- Metrics to watch (first 48h):
  - 5xx/4xx rates on `public/data/content/**`.
  - Frontend JS errors with tag `content-hub`.
  - Performance: LCP/TTI on `/dashboard/content`.
  - Telemetry delivery success (from §5 once implemented).
  - axe/Lighthouse regression (schedule nightly Playwright/a11y run).
- Alerts:
  - Set up Sentry (frontend) alert for new issues >2 per hour tagged `content-hub`.
  - Configure uptime check for `/dashboard/content` returning 200 and containing `ax-content-list`.
- Rollback plan:
  - If hybrid sandbox fails, toggle fallback to `renderMode="plain"` via manifest hotfix (use `scripts/migrate-v2.1.js` to ensure defaults).
  - Maintain backup of `public/data/content/manifest.json` pre-merge (`git tag content-v2.1-fix-premerge`).

## 7. Outstanding Risks / Follow-ups
- Telemetry adapter integration + documentation pending (section 5).
- Lighthouse automation blocked by missing Chrome binary; rerun in CI or local environment with Chrome installed.
- Smoke tests require environment access; schedule with QA immediately after review sign-off.
- Ensure no unmerged changes remain on branching strategy (`feat/content-v2.1-fix/content-hub-redesign` vs final target).

## 8. Sign-offs
- **Engineering:** _pending_
- **QA:** _pending_
- **Product/Content:** _pending_
- **Telemetry/Analytics:** _pending_

> Update this checklist as tasks complete; link final version in §13 (CHG-2025-10-23-003).
