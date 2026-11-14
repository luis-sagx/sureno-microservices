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

- [x] TW-01: Convert suitable Home page styles to Tailwind utilities. Starting file: `frontend/src/app/features/home/pages/home.page.css` (441 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. Layout and typography are now correct after TW-07; build passed.
- [x] TW-02: Convert suitable Catalog page styles. Starting file: `frontend/src/app/features/catalog/pages/catalog.page.css` (416 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. Layout and typography are now correct after TW-07; build passed.
- [x] TW-03: Convert suitable Product detail page styles. Starting file: `frontend/src/app/features/catalog/pages/product-detail.page.css` (298 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. Layout and typography are now correct after TW-07; build passed.
- [x] TW-04: Convert suitable Auth page styles. Starting file: `frontend/src/app/features/auth/pages/auth.page.css` (293 lines). Route: delegated direct; the multi-file writer trigger applies to the login/signup templates and stylesheet. `git diff --check` passed; a subsequent `pnpm run build` passed after an earlier attempt encountered concurrent TypeScript edits. No tests run.
- [x] TW-05: Convert suitable About page styles. Starting file: `frontend/src/app/features/about/pages/about.page.css` (275 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. Build and typography passed after TW-07.
- [x] TW-06: Convert suitable shared shell styles while preserving global CSS tokens and base styles. Starting file: `frontend/src/app/core/shell/app.css` (252 lines). Route: delegated direct; the multi-file writer trigger applies to the template and stylesheet. Build and typography passed after TW-07; global `styles.css` remains untouched.
- [x] TW-07: Correct Tailwind v4 font-family utility syntax in Home, Catalog, Product detail, About, and shell templates. Route: delegated direct; one writer handled the five affected templates. Replaced 11 display-font and 3 label-font usages with `font-(family-name:--font-display)` / `font-(family-name:--font-label)`; the shell fallback uses `font-[family-name:var(--font-display,Georgia,serif)]`. `pnpm run build` and `git diff --check` passed; generated CSS maps these utilities to `font-family`, with no invalid font-weight rules. Dev server returned HTTP 200 for `/`, `/registro`, and `/styles.css`.

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
- TW-06 work-unit commit: `4ea6caf` (`style(shell): migrate shared layout to Tailwind`).
- User screenshots revealed that Tailwind v4 compiled `font-[var(--font-display)]` and `font-[var(--font-label)]` into `font-weight` declarations instead of `font-family`; generated dev CSS and official Tailwind documentation confirm the ambiguity. The affected migration tasks (TW-01, TW-02, TW-03, TW-05, TW-06) are reopened for TW-07. Auth has no affected arbitrary font-family utility.
- The reported SSR `AbortError` occurs when Angular's request signal is canceled. The local SSR source rejects that canceled request; direct requests to `/` and `/registro` returned HTTP 200. No route failure was reproduced.
- Corrected all arbitrary font-family utilities using Tailwind v4's documented family-name hint. Official syntax reference: https://tailwindcss.com/docs/font-family.
- Verified that the production build emits `.font-\(family-name\:--font-display\){font-family:var(--font-display)}` and the corresponding label utility; no generated `font-weight: var(--font-display)` or `font-weight: var(--font-label)` remains. The running dev server serves updated markup/CSS and returns HTTP 200 for Home and `/registro`.
- TW-07 work-unit commit: `5086290` (`fix(frontend): restore custom font family utilities`).
- The local Engram v2 CLI accepted the full task copy as observation #121, but export shows `topic: null`; the requested topic-scoped mirror remains pending.

## Next step

Tailwind migration and the typography correction are complete. No PR or push was requested; retain unrelated working-tree changes untouched.
