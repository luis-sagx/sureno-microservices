# Sureño microservices foundation

## Objective

Prepare the local database infrastructure for Sureño's microservices, implement MS01 Users/Auth and MS02 Catalog, and deliver the requested Angular public and authentication pages using the existing Sureño brand assets and product catalog.

## Problem and rationale

The Angular app is still the starter screen, `ms-auth` and `ms-catalog` are NestJS starters without persistence, and the repository has no root Docker Compose or database initialization. The requirements define user and business-account verification, segmented catalog and purchase rules, and audit history. A product seed and brand assets exist in the reference project at `/home/luissagnay/Desktop/ls/projects/sureno`.

## Authorized scope

- Add local Compose infrastructure with PostgreSQL databases owned by MS01 Users/Auth, MS02 Catalog, MS03 Orders, MS04 Prices, and MS07 Chatbot; add separate MongoDB databases owned by MS05 Recommendations and MS06 Cocktails.
- Keep one PostgreSQL container and one MongoDB container for local development, with independent databases and credentials per service. This preserves service ownership without requiring one local database container per service.
- Complete the existing `ms-auth` NestJS service and `ms-catalog` NestJS service.
- Implement Angular login, sign-up, Inicio, Quiénes somos, and Catálogo pages, matching the reference site's colors, typography treatment, layout, and local photos/assets. Reuse the reference products as catalog seed data.
- Refine Angular's visual implementation to match the user-provided light reference screenshots, add a persistent light/dark toggle, animate the locally supplied transparent hero frames, redesign Quiénes somos and the catalog cards, and add a product detail route.
- Apply the requirements' customer, verification, availability, presentation, and purchase rules in the auth/catalog flows.
- Do not implement MS03, MS04, MS05, MS06, or MS07 application services in this feature; their requested databases are provisioned only. Keep cross-service references as IDs/API contracts, never cross-database foreign keys.

## Constraints and accepted decisions

- PostgreSQL: `auth_db`, `catalog_db`, `orders_db`, `prices_db`, `faq_db`.
- MongoDB: `recommendations_db`, `cocktails_db`.
- Each service gets a database-scoped application credential. Administrative/bootstrap credentials are for local initialization only and must not be used by application connections.
- MS01 owns Person, User, Role/UserRole, and BusinessAccount data. No Registro Civil, SRI, payment, or other external integration is in scope; verification is represented and administered manually.
- MS02 owns Category, Product, Presentation, and AvailabilityChange. Price and promotion ownership remains with future MS04; MS02 must not connect to or write MS04's database.
- B2B requires an approved business account and may request full cases only. Pending/rejected B2B requests do not receive wholesale benefits.
- B2C may select units or cases and must meet the $10 minimum after discounts and before delivery. A billing RUC does not grant B2B pricing.
- Product availability is manually confirmed; unavailable products cannot be newly requested. Persisted order price snapshots are a future MS03 responsibility.
- Split MS01 into identity/registration and session/authorization work units so each behavior has a focused RED→GREEN cycle; both units are required for the requested complete auth service.
- Do not invent products or approved prices. Reuse actual product records/media from the reference project; reuse its public retail values where present. Any B2B/discount value not available in local source data remains unavailable/clearly unconfigured until MS04 owns it.
- Support viewport widths down to 360px. Preserve Angular SSR/prerender compatibility.
- Light mode is the default to match the supplied reference screenshots; dark mode remains available from the header and the choice persists across reloads. The hero animation respects `prefers-reduced-motion` and uses only local frame assets.
- Product detail uses MS02's UUID route/API. Product prices and ordering remain unavailable until MS04/MS03 APIs exist; do not hardcode legacy price seeds into the Angular client.
- Do not fetch or transfer assets from an external service. Reference assets are local. Reference fonts are not currently found as local files; use CSS font fallbacks if no local copies are available.
- Dependency-install authorization: on 2026-11-13 the user authorized installing required public packages from `https://registry.npmjs.org` without stored credentials and updating the MS01/MS02 lockfiles as part of “continúa con todo”. Limit network use to required package installs.

## Acceptance criteria

1. `docker compose` provisions healthy PostgreSQL and MongoDB services with persistent volumes, health checks, independent service databases/users, and a repeatable initialization process. PostgreSQL databases are `auth_db`, `catalog_db`, `orders_db`, `prices_db`, and `faq_db`; MongoDB databases are `recommendations_db` and `cocktails_db`.
2. MS01 persists users, people, roles, and business accounts; supports individual registration, business-account requests, login/logout, role-protected admin review, adult-age validation, hashed passwords, and the required verification/account states. Protected endpoints enforce the documented user/admin inactivity policy.
3. MS02 persists categories, products, presentations, and availability history; serves public catalog browsing/search/filtering and role-protected product/availability administration; imports reference product data without fabricating unavailable prices.
4. Angular provides the requested routes and brand-matched responsive layouts, registration/login forms, profile-aware catalog behavior, product/media presentation, and clear loading/error/empty/unavailable-price states. The reference carousel frames animate on Inicio, light/dark themes are available, Quiénes somos follows the reference composition, and each product opens a detail page. B2B/B2C rules are represented in the UI and server-side contracts; the UI never grants B2B pricing based only on a billing RUC.
5. Service/API setup and local database startup instructions are documented with environment variable names, ports, and initialization steps. Secrets are not committed.
6. Applicable checks are recorded per task. With TDD enabled, each behavior task observes RED before implementation, GREEN after implementation, then REFACTOR. Build/lint and focused database smoke checks are run where available.

## Resolved development configuration

- TDD: **enabled**, explicitly selected by the user on 2026-11-13.
- Frontend package manager/runner: npm 11.16.0; `ng test`; build `ng build`.
- MS01 and MS02 package manager: pnpm (lockfile v9); unit tests `vitest run` via `pnpm test`; e2e `vitest run --config ./vitest.config.e2e.ts` via `pnpm test:e2e`; lint `oxlint --type-aware src/ test/` via `pnpm lint`; build `nest build` via `pnpm build`.

## Delivery and review

- Forecast at start: approximately 3,200 authored changed lines across the original five work units, excluding copied/generated binary assets. Current branch delta is 8,535 authored lines (7,971 additions and 564 deletions; binary assets excluded). The current delta remains within the approximately 9,000-line forecast, excluding frame assets. This exceeds the advisory ~400-line delivery budget.
- Delivery strategy: `feature-branch-chain`, selected by the user on 2026-11-13 with the instruction to keep the work on one branch. Keep all work units on `feat/sureno-microservices-foundation` and record slice boundaries here. No push, PR, or merge is authorized by this task.
- Slices: slice 1 contains SF-01 (`217ca74`); slice 2 contains SF-02 (`7e12c6c`) and SF-02B (`708ff7a`); slice 3 contains SF-03 (`3e9a919`), SF-03R (`02a28a8`), and SF-03C (`bec28ab`); slice 4 contains SF-04 (`d1bd40d`); slice 5 contains SF-05 (`134b8ab`); slice 6 contains SF-06 (`e9ce224`); slice 7 contains SF-07 (`3a9b463`); slice 8 contains SF-08 (`940daf5`). The post-commit TypeORM ESM startup defect and product pagination truncation were regression-tested and corrected. PRs are not created.
- Receipt-driven review: `gentle-ai` is not installed in this environment; no native review assessment or review was run. Do not claim review approval.
- Branch: `feat/sureno-microservices-foundation`; branch point is the existing `main` HEAD. Existing user-provided untracked requirements document must remain untouched.

## Tasks

### SF-01 — Local databases and Compose

- [x] Add PostgreSQL and MongoDB services, isolated service databases/credentials, init scripts, persistence, health checks, environment example, and startup documentation.
- Route: **delegated direct**. Trigger evidence: Compose, SQL/JS initialization, environment template, and docs are multiple non-trivial files; a writer is required.
- Checks: TDD RED observed before implementation (`node --test infra/tests/database-provisioning.test.mjs`: 0/2; required artifacts absent); GREEN observed after implementation (2/2). `docker compose --env-file .env.example config --quiet`, PostgreSQL shell syntax, MongoDB JS syntax, and env ignore checks passed. PostgreSQL 17 booted healthy; verified all five databases/owners, app roles are non-superuser/non-createdb, each role can connect to only its own DB, and `auth_app` can connect to `auth_db` but not `catalog_db`. MongoDB runtime verification is pending because `mongo:8.0` is not cached locally; no remote image pull was performed.
- Commit: `217ca74` — `feat(infra): provision service-owned databases`.

### SF-02 — MS01 identity and registration

- [x] Implement persistence/migrations, personal registration, business-account requests, adult-age validation, password hashing, and validation.
- Route: **delegated direct**. Trigger evidence: multiple non-trivial modules/entities/DTOs/controllers/migrations/tests/docs.
- Checks: Vitest RED observed before implementation (4 registration cases returned expected 404); GREEN observed after implementation (`pnpm test`: 5/5 initially, then 6/6 after malformed optional-field regression was added). `pnpm exec vitest run src/identity/registration-validation.spec.ts` passed 1/1; `pnpm build`, `pnpm lint`, and `git diff --check` passed. The focused correction test observed RED first (TypeError for numeric `nombre_comercial`) then GREEN (BadRequestException). PostgreSQL started via Compose and tests ran with the example environment; container stopped afterward, volume retained.
- Commit: `7e12c6c` — `feat(auth): add identity registration`.

### SF-02B — MS01 sessions, roles, and business review

- [x] Implement login/logout, signed sessions, inactivity enforcement, role/guard support, manual admin review/approval, and API documentation.
- Route: **delegated direct**. Trigger evidence: multiple non-trivial auth/session/guard/controller/DTO/test/docs files.
- Checks: focused Vitest RED observed before implementation: six new session/review API scenarios returned 404 while the existing 12 passed. GREEN: `pnpm test` passed (4 files, 12 tests); `pnpm build`, `pnpm lint`, and `git diff --check` passed. During implementation, corrected the TypeORM UPDATE RETURNING response normalization and serialized Vitest files to avoid shared migration races. PostgreSQL stopped afterward; volume retained.
- Commit: `708ff7a` — `feat(auth): add signed sessions and admin review`.

### SF-03 — MS02 Catalog

- [x] Implement PostgreSQL persistence/migrations, catalog browse/search/filter, protected administration and availability audit; import locally available reference products/media while preserving MS04 price ownership. The post-commit ESM startup defect and pagination issue were corrected in SF-03R below.
- Route: **delegated direct**. Trigger evidence: multiple non-trivial modules/entities/DTOs/controllers/migrations/import/tests/docs.
- Checks: Vitest RED observed first (3 new API tests failed with missing-route 404s; starter test passed). GREEN: `pnpm test` 2 files/4 tests; `pnpm build`, `pnpm lint`, and `git diff --check` passed. PostgreSQL smoke verified `catalog_db` owner `catalog_app`, six seeded categories, 11 reference products and 22 presentations, and no price field in Product; the temporary test fixtures were isolated. PostgreSQL stopped afterward; volume retained. Dependencies were available from the local pnpm store; no network install was needed.
- Commit: `3e9a919` — `feat(catalog): add persisted product catalog`.

### SF-03R — MS02 runtime initialization correction

- [x] Add a focused startup regression test, correct the TypeORM ESM circular relation initialization, and verify live Nest startup plus database/API smoke.
- Route: **delegated direct**. Trigger evidence: the runtime defect spans relation entity metadata and a startup regression check.
- Checks: regression RED observed before correction: the test built and spawned `dist/main.js`, failing on `Cannot access 'Product' before initialization`; emitted relation metadata was changed to avoid circular class references while keeping TypeORM target callbacks. The test also exposed one-to-many join pagination truncation; listing now loads paged products and fetches presentations in one batched query. GREEN: `pnpm test` 5/5 (including build+native startup regression), `pnpm build`, `pnpm lint`, `git diff --check` passed. Live smoke: MS01 login 201, cookie authorized MS02 admin listing 200, public Caña search 200 with two results and no price fields. Services and PostgreSQL stopped; volume retained.
- Commit: `02a28a8` — `fix(catalog): support native ESM relation metadata`.

### SF-03C — Clean up catalog API test fixtures

- [x] Delete test-created product rows after the catalog API integration test and remove existing leaked fixtures from the local catalog database.
- Route: **direct inline**. Trigger evidence: one already-understood test cleanup file plus a targeted cleanup of the two known rows created by that test.
- Checks: RED observed in the live catalog (13 rows, including two test fixtures); GREEN after `pnpm test` (5/5) with cleanup and a live catalog query confirming only the 11 seeded reference products remain.
- Commit: `bec28ab` — `test(catalog): clean up api fixtures`.

### SF-04 — Angular pages and reference assets

- [x] Add app routes and the login, sign-up, Inicio, Quiénes somos, and Catálogo pages; copy approved local brand/product assets; implement responsive design and profile-aware purchase rules/error states.
- Route: **delegated direct**. Trigger evidence: route shell, page components, shared styles, auth/catalog API clients, tests, and many local assets are multiple non-trivial files.
- Checks: TDD RED observed (`npx ng test --watch=false`: 2 new navigation/brand tests failed because routes/nav were absent; starter test passed). GREEN: `npx ng test --watch=false` passed 3/3; `npx ng build` succeeded and prerendered five routes; `git diff --check` passed. Build retains a non-fatal Angular component-style budget warning (`catalog.page.css` 5.39 KB vs 4 KB warning threshold); browser console also warns the source product photos are large. Chrome visual checks at 360×900 and 1440×1000 showed no horizontal overflow. Live frontend through the same-origin proxy rendered 11 catalog products with local photos after cleanup; page showed no configured prices and no order action. Live catalog listing/search and MS01 auth integration were independently verified in SF-03R.
- Commit: `d1bd40d` — `feat(frontend): add branded public and auth pages`.

### SF-05 — Light/dark theme

- [x] Make the light palette the default to match the reference, add an accessible persistent theme toggle, preserve the existing dark palette, and keep theme initialization SSR-safe.
- Route: **delegated direct**. Trigger evidence: shared theme tokens, header control, app bootstrap, and tests span multiple non-trivial files.
- Checks: TDD RED observed in the accessible-header-control test (button absent). GREEN: `npx ng test --watch=false` passed 7/7 across two files; `npx ng build` passed and prerendered five routes; `git diff --check` passed. Chrome confirmed default light background, toggle to dark, persistence after reload, and 360px layout without horizontal overflow. Existing catalog component CSS budget warning remains (5.44 KB / 4 KB).
- Commit: `134b8ab` — `feat(frontend): add persistent light and dark themes`.

### SF-06 — Animated reference hero

- [x] Replace the static dark home hero with the reference's light composition and animate the 76 local transparent frames in sequence; support reduced-motion and responsive layout.
- Route: **delegated direct**. Trigger evidence: home component/template/styles, frame sequence, and behavior tests are multiple non-trivial files/assets.
- Checks: TDD RED observed because `[data-hero-frame]` was missing (1 failed, seven prior tests passed). GREEN: `npx ng test --watch=false` passed 13/13 across three files; `npx ng build` passed and prerendered five routes; `git diff --check` passed. Chrome verified scroll maps frame `f0001`→`f0077`→`f0151`, light/dark overlays, 360px no overflow, reduced-motion static frame, and listener cleanup. The new home CSS warning was avoided; prior catalog CSS warning remains at 5.44 KB / 4 KB.
- Commit: `e9ce224` — `feat(frontend): animate hero from local frames`.

### SF-07 — Quiénes somos reference layout

- [x] Rebuild the page with the reference's light hero/seal, quote block, mission/vision, product carousel, logistics section, and responsive order using local assets.
- Route: **delegated direct**. Trigger evidence: page component/template/styles and carousel interactions span multiple non-trivial files.
- Checks: TDD RED observed before implementation: the logistics section and accessible carousel controls were missing. GREEN: `npx ng test --watch=false` passed 4 files/15 tests; `npx ng build` passed and prerendered five routes; `git diff --check` passed. Chrome verified 360px/1440px in light and dark with no horizontal overflow, local images loading, and next control scrolling; reduced motion was checked. Extracted shared carousel styles so `about.page.css` is under its 4 KB budget; only pre-existing catalog CSS warning remains.
- Commit: `3a9b463` — `feat(frontend): redesign about page with carousel`.

### SF-08 — Catalog cards and product details

- [x] Restyle product cards to the light reference, fix/verify all 11 product image assets, add an accessible UUID detail route backed by MS02 `GET /catalog/products/:id`, and preserve role-aware presentations and honest price/order-unavailable states.
- Route: **delegated direct**. Trigger evidence: catalog API client, card template/styles, router, detail component, and behavior tests span multiple non-trivial files.
- Checks: TDD RED observed before implementation (catalog image/detail tests and the new detail suite failed for missing image coverage, route/API, profile rules, error states, and unavailable price behavior; two added navigation/image regression assertions also failed before their fixes). GREEN: `npx ng test --watch=false` passed 26/26 across six files; `npx ng build` passed and prerendered five static routes with the UUID product route rendered on the server; `git diff --check` passed. Browser checks at 360px and 1440px in light/dark themes confirmed all 11 product images, no horizontal overflow, UUID detail rendering and top-of-page navigation. Live MS02 and same-origin Angular proxy both returned the seeded product detail; price and order controls remained unavailable. A non-fatal pre-existing catalog component CSS budget warning remains (5.44 KB vs 4 KB).
- Commit: `940daf5` — `feat(frontend): redesign catalog and add product detail`.

## Progress and next step

- Exploration complete. Target CodeGraph is not initialized; `gentle-ai` is unavailable, so the required targeted filesystem fallback was used after CodeGraph status failed.
- User confirmed that the reference catalog's products should be reused.
- User explicitly enabled TDD. User selected one feature branch (`feature-branch-chain`) for this feature.
- SF-01, SF-02, SF-02B, SF-03, SF-03R, SF-03C, SF-04, SF-05, SF-06, SF-07, and SF-08 are implemented, verified, and committed. The user supplied the desired light-theme/home/about/catalog references and the 76 local hero frames. MongoDB runtime startup remains unverified because `mongo:8.0` is not cached locally and image downloads were outside the explicitly authorized npm registry scope.
- The user authorized required public npm package installs for MS01/MS02 from `https://registry.npmjs.org`, without stored credentials.
- Next: the requested local implementation is complete. If desired later, authorize pulling `mongo:8.0` from Docker Hub for a MongoDB startup smoke; configure production secrets and routing after deployment infrastructure is selected.
