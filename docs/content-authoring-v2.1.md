# Content v2.1 Authoring Guide

This guide explains how to create and maintain content items for the AXIOM Content Hub after the v2.1 refactor. It complements the SOP in `docs/iterations/content‑v2.1‑fix.md` and focuses on three areas:

1. Manifest schema requirements (new fields, validation rules).
2. Hybrid markup conventions and `data-*` hooks that replace inline scripts.
3. CLI tooling that supports migration, linting, and scaffolding.

Follow this document whenever you add or update content so that previews, the reader, and automated checks stay green.

---

## 1. Manifest schema essentials

Every content entry lives inside `public/data/content/<category>/<ID>/` and must be declared in its category manifest plus the aggregate `public/data/content/manifest.json`. The schema lives at `_schema/content.schema.json` and enforces the fields below.

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `id` | string | ✅ | Format `PREFIX-XXXX` (see pattern in schema). Must stay unique across all categories. |
| `category` | enum | ✅ | One of `locations`, `characters`, `technologies`, `factions`, `events`, `lore`. |
| `title` | string | ✅ | Display name shown in list and reader. |
| `summary` | string | ➖ | Optional short description (used in list). |
| `date` | string | ✅ | ISO date `YYYY-MM-DD`. |
| `tags` | string[] | ➖ | Up to three tags are surfaced in the card UI. |
| `file` | string | ✅ | Relative path to the source file (`index.md`, `index.html`, etc.). No Windows separators. |
| `format` | enum | ✅ | One of `md`, `markdown`, `html`, `txt`. Controls parser path. |
| `renderMode` | enum | ✅ | `plain`, `hybrid`, or `sandbox`. Determines how PreviewPane wraps the content. |
| `assetsBase` | string | ✅ | Directory under the item folder for images/CSS. Empty string allowed. |
| `version` | string | ➖ | Semantic version (`v2.1`, `2.1.0`, etc.). Shown in StatusLine. |
| `status` | enum | ✅ | `draft`, `published`, or `archived`. Drives filters and badges. |
| `lang` | string | ➖ | BCP-47 language code (`en`, `ru-RU`, etc.). |
| `links` | array | ➖ | Machine-readable cross-links. Each entry needs `type` and `ref`; `label` or `href` is optional. |
| `meta.v` | const | ✅ | Must stay `2` for v2.1 files. |

**Validation workflow**

```bash
npm run validate:content           # checks JSON syntax and bad escapes
pnpm content-agent validate        # same as npm run content-agent -- validate
pnpm content-agent diff            # sanity-check counters before committing
```

The content agent reads per-category manifests, normalises ordering, and warns about duplicate IDs or missing files. Run `fix` before committing if the tool suggests updates.

---

## 2. Render modes and file layout

Render mode controls how the PreviewPane prepares markup:

| Mode | Use when | Behaviour |
| ---- | -------- | --------- |
| `plain` | Markdown or safe HTML | Markdown is rendered to HTML via `marked`. Inline styles are allowed but **no `<script>` tags**. |
| `hybrid` | Custom HTML + CSS that needs scoped styling | PreviewPane extracts `<style>` tags, prefixes selectors with the item scope, and re-injects them in the preview. |
| `sandbox` | Third-party or experimental embeds | Content is rendered inside an iframe with `sandbox="allow-scripts allow-same-origin"`. Always provide self-contained assets. |

**Folder structure**

```
public/data/content/characters/CHR-XXXX-0001/
├─ index.md           # source content (md or html)
├─ styles.css         # optional per-item stylesheet
└─ media/             # optional assets folder (set assetsBase: "media/")
```

When `assetsBase` is set, relative `src`/`href` inside the content are resolved against the folder. Data URLs remain untouched. Never use absolute `/` paths inside hybrid items—those bypass the resolver and will fail in sandbox mode.

---

## 3. Hybrid markup conventions

Hybrid items replace inline scripts with declarative `data-*` attributes driven by content hooks. Authors can apply the patterns below without touching React code.

### 3.1 Reveal-on-scroll

```html
<section class="axv-wrap" data-reveal data-reveal-class="is-in" data-reveal-threshold="0.3">
  <div class="axv-media">...</div>
  <div class="axv-copy">...</div>
</section>
```

Supported attributes:

| Attribute | Purpose |
| --------- | ------- |
| `data-reveal` | Enables the reveal observer on the element. |
| `data-reveal-class` | Class toggled when the element becomes visible. Defaults to `is-in`. |
| `data-reveal-once` | Set to `"false"` to allow the class to be removed when the element leaves the viewport. Defaults to one-time reveal. |
| `data-reveal-threshold` | Intersection threshold (float `0.0-1.0`). |
| `data-reveal-root-margin` | Optional root margin (e.g. `"0px 0px -20%"`). |
| `data-axv-split` | Convenience alias used by legacy split cover layout. Treated the same as `data-reveal`. |

### 3.2 Pointer tilt

```html
<article class="ax-card" data-tilt data-tilt-max="6" data-tilt-perspective="700">
  ...
</article>
```

Attributes:

| Attribute | Purpose |
| --------- | ------- |
| `data-tilt` | Activates the tilt effect on pointer devices. |
| `data-tilt-max` | Max rotation in degrees (defaults to `4`). |
| `data-tilt-perspective` | Perspective distance in px (defaults to `900`). |

### 3.3 Scoped styles

Hybrid mode wraps all markup with `<div data-ax-scope="item-id">`. Styles are rewritten automatically:

```html
<style>
.axv-wrap { opacity: 0; transition: opacity 250ms ease; }
[data-axv-split].is-in .axv-wrap { opacity: 1; }
</style>
```

You do not need to manually include the scope selector. Avoid `:root` or global tags—use classes within the item.

### 3.4 Cover/Core templates

Use two top-level sections to keep content predictable for the PreviewPane:

```html
<header class="ax-cover" data-reveal>
  <h1 data-title>AXIOM // CORE BRIEF</h1>
  <p data-subtitle>Central AI Entity</p>
</header>

<main class="ax-core">
  <section>
    <h2>Summary</h2>
    <p>...</p>
  </section>
  <section data-tilt>
    <h2>Signals</h2>
    <ul>...</ul>
  </section>
</main>
```

The attributes `data-title`, `data-subtitle`, `data-note`, etc. are purely semantic helpers for future hooks; they do not trigger behaviour today but remain safe to use.

---

## 4. CLI tooling

### 4.1 Migration helper

```
node scripts/migrate-v2.1.js
```

Reads the legacy manifest, injects `renderMode` and `assetsBase` defaults, and writes `manifest.v2.1.json`. Use it once per category while upgrading v2.0 content. Review the diff before replacing the original manifest.

### 4.2 Content agent

Run through `npm run content-agent -- <command>` or `pnpm content-agent <command>`.

| Command | What it does |
| ------- | ------------- |
| `scan` | Lists all categories, reporting missing files and schema issues. |
| `validate` | Validates per-item manifests against the v2.1 schema; exits non-zero on errors. |
| `build-aggregate` | Rebuilds the root aggregate manifest in place. |
| `diff` | Shows pending aggregate differences without writing files. |
| `fix` | Normalises per-category manifests (optional `--sync-category`). |
| `check-links` | Verifies that `file` references exist on disk. |
| `pr` | Prints a quick checklist for pull requests. |

All commands accept `--base <dir>` to target alternative directories and `--out <file>` to write JSON reports (useful for CI artifacts).

### 4.3 Scaffold helper (character template)

The planned `scaffold:character` script will generate the folder structure shown above, copy the hybrid template, and append a draft entry to the manifest. Until it lands, use the following manual workflow:

1. Duplicate an existing character folder (e.g. `CHR-VIKTOR-0301`) and rename it.
2. Update front-matter fields (`id`, `title`, `lang`, `version`, etc.).
3. In the category manifest, copy an entry and update `file`, `renderMode`, `assetsBase`, `links`.
4. Run `pnpm content-agent fix --sync-category` to normalise ordering.
5. Run the validate and E2E suites before committing.

If you add the script, document it here and in `package.json` so authors can rely on a single command.

---

## 5. Author workflow checklist

1. Create or copy the item folder and assets; update front-matter metadata.
2. Update the category manifest and rebuild the aggregate via `pnpm content-agent fix`.
3. Ensure hybrid markup uses the `data-*` hooks (`data-reveal`, `data-tilt`, etc.) instead of inline scripts.
4. Run validation (`npm run validate:content`, `pnpm content-agent validate`) and the Playwright accessibility suites.
5. Capture before/after screenshots if the hybrid design changed significantly.
6. Commit content files together with manifest updates.

---

## 6. Changelog (v2.1 content updates)

| Change | Impact |
| ------ | ------ |
| Added `renderMode` to every manifest entry | Enables plain/hybrid/sandbox switching in PreviewPane. |
| Added `assetsBase` | Routes image and stylesheet relative paths through the resolver to avoid 404s. |
| Added `lang` and `version` | Surfaces locale hints and release identifiers in the reader. |
| Added `links[]` structure | Allows Context Hub to show cross-links (missions, related items). |
| Enabled strict Ajv validation | Prevents malformed entries from crashing DEV; invalid items are filtered out. |
| Prefixed hybrid CSS with `[data-ax-scope]` | Stops hybrid styles from leaking into the surrounding app shell. |
| Replaced inline scripts with `data-*` hooks | Behaviour comes from `useReveal`/`useTilt` React hooks; sandbox-safe. |
| Added content agent tooling | Standardises migration, validation, diffing, and PR preparation. |

Breaking change summary:

- Inline `<script>` tags are no longer allowed inside hybrid content.
- Relative assets must live under the declared `assetsBase` directory.
- Manifest entries without `renderMode` or `assetsBase` will fail validation.
- IDs that do not follow the strict prefix pattern are rejected.

Update any legacy documentation or templates to follow these rules so authors can produce compliant content without engineering support.
