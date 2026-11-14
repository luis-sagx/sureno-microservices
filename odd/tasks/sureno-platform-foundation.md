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
- Do not invent products or approved prices. Reuse actual product records/media from the reference project; reuse its public retail values where present. Any B2B/discount value not available in local source data remains unavailable/clearly unconfigured until MS04 owns it.
- Support viewport widths down to 360px. Preserve Angular SSR/prerender compatibility.
- Do not fetch or transfer assets from an external service. Reference assets are local. Reference fonts are not currently found as local files; use CSS font fallbacks if no local copies are available.

## Acceptance criteria

1. `docker compose` provisions healthy PostgreSQL and MongoDB services with persistent volumes, health checks, independent service databases/users, and a repeatable initialization process. PostgreSQL databases are `auth_db`, `catalog_db`, `orders_db`, `prices_db`, and `faq_db`; MongoDB databases are `recommendations_db` and `cocktails_db`.
2. MS01 persists users, people, roles, and business accounts; supports individual registration, business-account requests, login/logout, role-protected admin review, adult-age validation, hashed passwords, and the required verification/account states. Protected endpoints enforce the documented user/admin inactivity policy.
3. MS02 persists categories, products, presentations, and availability history; serves public catalog browsing/search/filtering and role-protected product/availability administration; imports reference product data without fabricating unavailable prices.
4. Angular provides the requested routes and brand-matched responsive layouts, registration/login forms, profile-aware catalog behavior, product/media presentation, and clear loading/error/empty/unavailable-price states. B2B/B2C rules are represented in the UI and server-side contracts; the UI never grants B2B pricing based only on a billing RUC.
5. Service/API setup and local database startup instructions are documented with environment variable names, ports, and initialization steps. Secrets are not committed.
6. Applicable checks are recorded per task. With TDD enabled, each behavior task observes RED before implementation, GREEN after implementation, then REFACTOR. Build/lint and focused database smoke checks are run where available.

## Resolved development configuration

- TDD: **enabled**, explicitly selected by the user on 2026-11-13.
- Frontend package manager/runner: npm 11.16.0; `ng test`; build `ng build`.
- MS01 and MS02 package manager: pnpm (lockfile v9); unit tests `vitest run` via `pnpm test`; e2e `vitest run --config ./vitest.config.e2e.ts` via `pnpm test:e2e`; lint `oxlint --type-aware src/ test/` via `pnpm lint`; build `nest build` via `pnpm build`.

## Delivery and review

- Forecast: approximately 2,800 authored changed lines across the four work units, excluding copied/generated binary assets. This exceeds the advisory ~400-line delivery budget.
- Delivery strategy: `feature-branch-chain`, selected by the user on 2026-11-13 with the instruction to keep the work on one branch. Keep all work units on `feat/sureno-microservices-foundation` and record slice boundaries here. No push, PR, or merge is authorized by this task.
- Receipt-driven review: `gentle-ai` is not installed in this environment; no native review assessment or review was run. Do not claim review approval.
- Branch: `feat/sureno-microservices-foundation`; branch point is the existing `main` HEAD. Existing user-provided untracked requirements document must remain untouched.

## Tasks

### SF-01 — Local databases and Compose

- [x] Add PostgreSQL and MongoDB services, isolated service databases/credentials, init scripts, persistence, health checks, environment example, and startup documentation.
- Route: **delegated direct**. Trigger evidence: Compose, SQL/JS initialization, environment template, and docs are multiple non-trivial files; a writer is required.
- Checks: TDD RED observed before implementation (`node --test infra/tests/database-provisioning.test.mjs`: 0/2; required artifacts absent); GREEN observed after implementation (2/2). `docker compose --env-file .env.example config --quiet`, PostgreSQL shell syntax, MongoDB JS syntax, and env ignore checks passed. PostgreSQL 17 booted healthy; verified all five databases/owners, app roles are non-superuser/non-createdb, each role can connect to only its own DB, and `auth_app` can connect to `auth_db` but not `catalog_db`. MongoDB runtime verification is pending because `mongo:8.0` is not cached locally; no remote image pull was performed.
- Commit: pending.

### SF-02 — MS01 Users/Auth

- [ ] Implement persistence/migrations, registration, login/logout/session inactivity, role/guard support, personal and business account states, manual admin review, validation, and API documentation.
- Route: **delegated direct**. Trigger evidence: multiple non-trivial modules/entities/DTOs/guards/controllers/migrations/tests/docs.
- Checks: add focused Vitest coverage first and observe RED; run focused tests to GREEN, then refactor; run build/lint.
- Commit: pending.

### SF-03 — MS02 Catalog

- [ ] Implement PostgreSQL persistence/migrations, catalog browse/search/filter, protected administration and availability audit; import locally available reference products/media while preserving MS04 price ownership.
- Route: **delegated direct**. Trigger evidence: multiple non-trivial modules/entities/DTOs/controllers/migrations/import/tests/docs.
- Checks: add focused Vitest coverage first and observe RED; run focused tests to GREEN, then refactor; run build/lint and seed/import smoke checks.
- Commit: pending.

### SF-04 — Angular pages and reference assets

- [ ] Add app routes and the login, sign-up, Inicio, Quiénes somos, and Catálogo pages; copy approved local brand/product assets; implement responsive design and profile-aware purchase rules/error states.
- Route: **delegated direct**. Trigger evidence: route shell, page components, shared styles, auth/catalog API clients, tests, and many local assets are multiple non-trivial files.
- Checks: add component/service tests first and observe RED; run `ng test` to GREEN, then refactor; run `ng build` and verify responsive/layout behavior.
- Commit: pending.

## Progress and next step

- Exploration complete. Target CodeGraph is not initialized; `gentle-ai` is unavailable, so the required targeted filesystem fallback was used after CodeGraph status failed.
- User confirmed that the reference catalog's products should be reused.
- User explicitly enabled TDD. User selected one feature branch (`feature-branch-chain`) for this feature.
- SF-01 is implemented and its checks have been observed; commit and final task-document evidence are pending.
- Next: commit SF-01, record its commit identity in this document and its Engram mirror, then continue with SF-02.
