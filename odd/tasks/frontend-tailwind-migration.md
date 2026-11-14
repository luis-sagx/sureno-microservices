# Frontend Tailwind migration

Repository task file: `odd/tasks/frontend-tailwind-migration.md`

## Objective

Migrate page and shell styling in the Angular frontend from semantic component CSS to Tailwind utilities in small, reviewable steps, preserving the existing appearance and behavior.

## Problem and motivation

Tailwind v4 is already installed and imported, but the templates use semantic CSS classes and the frontend has about 2,642 lines across global and component CSS. The largest page styles are Home (441 lines) and Catalog (416 lines), where layout, spacing, and responsive rules can be expressed as utilities.

## Scope and constraints

- Work only in `frontend/` and this task document.
- Reuse the existing Tailwind v4 setup; do not add styling dependencies or rewrite build configuration unless a verified build issue requires it.
- Keep global resets, fonts, theme variables, and genuinely shared styles in CSS.
- Keep complex gradients, pseudo-elements, overlays, animations, and theme-dependent details in CSS when utility conversion would make templates harder to read.
- Preserve Angular bindings, accessibility, responsive behavior, and the current visual design.
- Make each page a separate local work-unit commit. The user previously requested commits only; no PR, push, or other remote operation is authorized.

## Design choices

- Chosen approach: migrate incrementally, starting with the page that has the most CSS. The user approved gradual migration in that order.
- Alternative: convert the whole frontend in one pass. Rejected because it makes visual regressions harder to localize and review.
- Alternative: keep all styling in semantic CSS. Rejected because the project already has Tailwind configured and simple layout/spacing rules can move into utilities.
- Implementation call: preserve CSS for theme tokens and complex visual effects; use static Tailwind classes for ordinary layout, spacing, typography, and responsive behavior.

## Authorized scope

The user explicitly approved migrating the frontend gradually to Tailwind, beginning with the pages that have the most CSS.

## Acceptance criteria

- Migrated page templates use static Tailwind utilities for suitable layout, spacing, typography, and responsive rules.
- CSS rules removed from a page are no longer needed by that page; complex and global styles remain where useful.
- Angular behavior and accessibility attributes remain unchanged.
- The frontend builds successfully with the existing Tailwind v4/PostCSS configuration.
- Each task is committed separately and recorded here with verification evidence.

## Verification and TDD

- Effective TDD mode: enabled per project/session record in Engram observation #84; runner is `pnpm test`.
- This is a presentation-only refactor with no focused visual regression test or screenshot harness identified. Do not invent RED evidence or add tests that only assert utility class strings. Use the existing frontend build and source-level checks that obsolete component selectors were removed while retaining CSS for complex/shared styling.
- No test suite is scheduled by this task; the user asked for the styling migration, not test execution.

## Delivery strategy and forecast

- Forecast: more than 400 authored changed lines across the planned pages, excluding generated files.
- Strategy: `exception-ok`, based on the user's existing instruction to make local commits only; do not create a PR or push. The estimated change volume is over the usual slice budget, but PR chaining is outside the authorized delivery.
- Work units: one page per task/commit, in descending starting CSS size.

## Tasks

- [x] TW-01: Convert suitable Home page styles to Tailwind utilities. Starting file: `frontend/src/app/features/home/pages/home.page.css` (441 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. Checks: `pnpm run build` passed; `git diff --check` passed. Complex backdrops, overlays, watermark, ornament/seal, and Horeca background remain in CSS.
- [x] TW-02: Convert suitable Catalog page styles. Starting file: `frontend/src/app/features/catalog/pages/catalog.page.css` (416 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. Checks: `pnpm run build` and `git diff --check` passed. Catalog CSS budget warning is resolved.
- [x] TW-03: Convert suitable Product detail page styles. Starting file: `frontend/src/app/features/catalog/pages/product-detail.page.css` (298 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. Checks: `pnpm run build` and `git diff --check` passed; motion, loading, interaction, and theme styles remain in CSS.
- [x] TW-04: Convert suitable Auth page styles. Starting file: `frontend/src/app/features/auth/pages/auth.page.css` (293 lines). Route: delegated direct; the multi-file writer trigger applies to the login/signup templates and stylesheet. `git diff --check` passed; a subsequent `pnpm run build` passed after an earlier attempt encountered concurrent TypeScript edits. No tests run.
- [x] TW-05: Convert suitable About page styles. Starting file: `frontend/src/app/features/about/pages/about.page.css` (275 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. `git diff --check` and `pnpm run build` passed; theme decoration and reduced-motion styling remain in CSS.
- [x] TW-06: Convert suitable shared shell styles while preserving global CSS tokens and base styles. Starting file: `frontend/src/app/core/shell/app.css` (252 lines). Route: delegated direct; the multi-file writer trigger applies to the shell template and stylesheet. `pnpm run build` and `git diff --check` passed; global `styles.css` remains untouched.

## Progress and evidence

- CodeGraph was consulted first. It does not expose CSS/template structure usefully; a delegated read-only map found no Tailwind utility classes in templates, confirmed Tailwind v4 is configured via `@tailwindcss/postcss`, and measured 2,642 CSS lines across global, shell, and pages.
- Recommended migration order: Home, Catalog, Product detail, Auth, About, shared shell. Global `styles.css` stays mostly CSS because it contains global/theme responsibilities.
- Home component CSS dropped from 441 to 112 lines; static layout, spacing, typography, and responsive rules moved to Tailwind classes in its template. Angular bindings and content were preserved.
- TW-01 work-unit commit: `92abaed` (`style(home): migrate layout utilities to Tailwind`).
- Catalog CSS dropped from 416 to 200 lines; static layout, grid, form, card, and responsive rules moved to Tailwind classes. Animations, hover effects, special states, and theme styles remain in CSS. Build passed; Catalog no longer exceeds its CSS budget.
- TW-02 work-unit commit: `8d65088` (`style(catalog): migrate layout utilities to Tailwind`).
- Product detail CSS dropped from 298 to 118 lines; static layout, spacing, typography, and responsive rules moved to Tailwind. Hover, reduced-motion, loading, interaction-state, and theme styles remain in CSS. Build passed.
- TW-03 work-unit commit: `8cebce5` (`style(catalog): migrate product detail to Tailwind`).
- Auth CSS dropped from 293 to 146 lines; simple layout, spacing, and typography moved to Tailwind in login/signup templates. Theme, backgrounds, focus/hover, validation, and complex state styles remain in CSS. `git diff --check` passed; the build is pending because of concurrent TypeScript changes that were not modified here.
- TW-04 work-unit commit: `7785475` (`style(auth): migrate page layout to Tailwind`). The later full build passed after the unrelated registration edits settled.
- About CSS dropped from 275 to 24 lines; layout, spacing, typography, and breakpoints moved to Tailwind. Seal borders, quote backdrop, and reduced-motion CSS remain. The full frontend build passed.
- TW-05 work-unit commit: `a8b9f30` (`style(about): migrate layout utilities to Tailwind`).
- Shared shell CSS dropped from 252 to 121 lines; responsive header/footer layout, desktop navigation, columns, and spacing moved to Tailwind. Theme/background, mobile overlay, interactive states, and footer decoration remain in CSS; global `styles.css` is unchanged. Build passed.
- Across the global, shell, and feature stylesheets, CSS fell from 2,642 to 1,388 lines (1,254 fewer, about 47%). The global stylesheet remains 667 lines for shared base/theme responsibilities.
- TW-06 work-unit commit pending.
- The local Engram v2 CLI accepted the full task copy as observation #121, but export shows `topic: null`; the requested topic-scoped mirror remains pending.

## Next step

Complete the final work-unit commit, record its identity, and retain the unrelated working-tree changes untouched.
