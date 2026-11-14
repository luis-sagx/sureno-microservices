# MS04 pricing and catalog integration

## Objective

Implement MS04 (prices and promotions) in `ms-price` with the repository's required hexagonal architecture and PostgreSQL ownership, then integrate price quotes into the Angular catalog and product detail screens.

## Problem and motivation

The requirements call for public unit and box prices, approved-business box tariffs, eligible B2B promotions, and traceable changes. The `ms-price` application is still a Nest starter, and the Angular catalog currently displays prices as unconfigured without querying a pricing API.

## Authorized scope

- Complete the existing `ms-price` NestJS service with domain, application use cases/ports, inbound HTTP adapters, outbound PostgreSQL and MS02/MS01 HTTP adapters, migrations, API documentation, tests, and explicit source-seed import where values exist.
- Add APIs to quote prices for one or more presentation IDs, and administrator-only operations to configure prices and promotions.
- Update the existing feature-oriented Angular catalog and product detail to request quotes from MS04 and render the result per selected presentation/profile.
- Preserve all pre-existing user changes to Angular package configuration, authentication models, feature architecture, docs, screenshots, and untracked project files. Do not include them in commits.
- Do not implement MS03 or change its order minimum. The requirements conflict on B2C minimum order ($20 in RN-08/RF-14 versus $10 in an earlier user story); it is outside this price-quote/catalog work.

## Constraints and accepted decisions

- Every microservice uses hexagonal boundaries: domain and application depend inward; Nest/HTTP, TypeORM/PostgreSQL, and other-service clients remain adapters; DI binds ports to adapters.
- MS04 owns `prices_db` only. Never query MS02's database or add cross-service foreign keys. Presentation IDs and actor IDs remain external references.
- MS01 session verification is authoritative. Only the `CUSTOMER_B2B` role returned from MS01 grants commercial prices/promotions. Never trust a segment supplied by the browser. Price/promotion mutations require `ADMIN`.
- B2C sees public unit prices and may request box quotes. A public B2C box price must be strictly less than the sum of twelve public unit prices. Since the local reference seed contains no approved public box price, leave that quote unconfigured until an administrator supplies one; do not invent it.
- Import only explicit values from `/home/luissagnay/Desktop/ls/projects/sureno/prisma/add-sureno-products.ts`, mapping product name/volume and presentation type. Its wholesale unit amount is multiplied by the 12 units in a box to form the explicit B2B box tariff. Do not import the unrelated quantity-tier discount logic or MXN formatting from legacy code; project currency is USD.
- User-approved promotion policy (2026-11-14): support percentage and fixed-amount discounts; never stack overlapping eligible promotions; select only the promotion that gives the greatest valid discount for the quote; clamp discounts so the line total cannot become negative; round monetary calculations to two decimal places.
- Requirements RN-04/RN-07/RN-09 limit commercial prices and exclusive promotions to approved B2B customers and explicitly included presentations. Expired/inactive promotions are ignored.
- Record the actor and timestamp for price changes. Also persist audit records for promotion create/update/deactivation to meet RNF-10 traceability, even though the supplied ERD omits a promotion audit entity; document this schema extension in the MS04 README/API docs.
- The business-approved tariff values are pending stakeholder validation in the requirements. Only carry forward the explicit local seed values; do not derive or fabricate missing tariff values.
- Support TDD (explicitly required by the user and repository instructions). Preserve the current feature branch `feat/sureno-microservices-foundation` and the prior one-branch delivery preference. Do not push, create a PR, or merge.

## Acceptance criteria

1. `ms-price` is a runnable, documented NestJS service with a PostgreSQL connection to `prices_db`, repeatable migrations, and hexagonal domain/application/inbound/outbound boundaries.
2. Price records support external presentation ID, B2C/B2B segment, decimal amount, effective start/end, active state, and price-change history with actor/timestamp. Promotions support segment, type/value, effective dates, active state, included presentation IDs, and actor/time audit history.
3. A public quote API accepts multiple presentation IDs and derives B2C versus approved B2B from a verified MS01 session; no client-supplied segment can grant B2B. A quote returns current configured base price, eligible discount, final amount, currency, and explicit unconfigured state when no applicable tariff exists.
4. Public B2C can receive unit and public-box prices only; a configured B2C box rate is rejected unless strictly below twelve unit rates over its effective period. B2B receives only case tariffs and eligible B2B promotions. Pending/rejected B2B and ordinary users receive public prices.
5. Promotion validation enforces supported positive percentage/fixed amounts, valid date range, B2B-only scope, and explicit presentation membership. Overlapping promotions do not stack; greatest eligible saving wins; money rounds to two decimal places.
6. Only authenticated administrators can create, update, or deactivate price/promotion records. Price and promotion changes persist actor/time audit evidence. Invalid presentation IDs are rejected through an MS02 outbound API port; no direct cross-database access exists.
7. The catalog card and product detail display live quotes for the selected allowed presentation, distinguish unconfigured prices, show B2B prices only for the approved role, and handle loading/error states without breaking product browsing. Frontend visibility is not treated as authorization; MS04 remains authoritative.
8. Applicable tests cover pure business rules, use cases with mocked ports, persistence/API integration, auth/role protection, and Angular quote states. RED is observed before each implementation, followed by GREEN and REFACTOR.

## Resolved development configuration

- TDD: **enabled**, explicitly required by the user and repository `AGENTS.md`.
- `ms-price`: pnpm; `pnpm test` (Vitest), `pnpm test:e2e`, `pnpm lint`, `pnpm build`.
- `frontend`: pnpm per the user's uncommitted package migration; `pnpm exec ng test --watch=false`, `pnpm exec ng build`.
- Do not modify or stage the user's current package migration files; only use their current package manager to run frontend checks.

## Delivery and review

- Route: **delegated direct** for both work units. MS04 spans domain/application/ports, adapters, migrations, HTTP API, and tests; frontend integration spans catalog models/data-access/facade/pages/templates/specs. Mandatory writer delegation applies.
- Forecast: approximately 3,500 authored changed lines across two work units (forecast updated after MP-01 actual; MP-02 estimated at about 600 lines; tests and docs included; generated output excluded). This exceeds the advisory per-task size heuristic, but the work is kept in two coherent behavior units.
- Strategy: `feature-branch-chain` on the existing `feat/sureno-microservices-foundation` branch, following the user's one-branch instruction. No remote delivery is authorized.
- Work-unit commits: MP-01 `b8f3220` and correction `2ad8870`; MP-02 pending.
- Receipt-driven review: disabled/unmanaged unless an existing user-owned switch says otherwise; do not enable it. `gentle-ai` is unavailable in the current environment.

## Tasks

### MP-01 — MS04 hexagonal pricing and promotions service

- [x] Implement domain rules, use cases/ports, Postgres adapters/migrations, MS01/MS02 HTTP adapters, quote and admin APIs, source-seed import, audit records, API documentation, and tests.
- Route: **delegated direct**. Trigger evidence: this is a multi-module, multi-adapter service implementation touching more than two non-trivial files.
- TDD: RED observed for missing domain policy, quote/set/update/promotion use cases, HTTP controller, role handling and atomic audit. GREEN/REFACTOR observed afterward. A focused RED exposed MS01 5xx/network failures being treated as anonymous B2C and mutation/audit writes not being atomic; fixed and rechecked (12/12 focused tests).
- Checks: parent reran `pnpm test` (8 files/32 tests), `pnpm test:e2e` (2 files/3 tests), `pnpm lint` (exit 0; type-aware `unbound-method` warnings in mocked specs), and `pnpm build` (passed). Migration ran twice against the live Compose `prices_db` and was idempotent. The reference seeder ran against live MS02 and imported 11 explicit price pairs; no B2C box rates were created. Live quote smoke returned 22 quotes: 11 configured B2C unit prices and 11 intentionally unconfigured B2C box prices. `git diff --check` passed.
- Commits: `b8f3220` — `feat(pricing): implement hexagonal prices and promotions`; `2ad8870` — `fix(pricing): fail closed and audit mutations atomically`.
- Route evidence: delegated direct because the task spans domain/application, PostgreSQL migration/repository, MS01/MS02 HTTP adapters, controller, tests, and docs. Actual authored delta for MP-01: 2,903 lines (2,768 additions, 135 deletions), above the estimate because the starter contained no persistence, policy, ports, or API.

### MP-02 — Angular catalog price integration

- [ ] Add typed quote client/models and feature facade integration; display price, promotion/discount, and unconfigured states on product cards and product detail while respecting verified client presentation choices.
- Route: **delegated direct**. Trigger evidence: the feature spans Angular models, HTTP client/facade, two pages/templates/styles, and behavior tests.
- TDD: add failing quote-rendering/role/loading/error tests before implementation; observe RED, then GREEN and REFACTOR.
- Checks: `cd frontend && pnpm exec ng test --watch=false` and `pnpm exec ng build`; browser smoke at mobile/desktop widths and with B2C/B2B API fixtures.
- Commit: pending.

## Progress and next step

- Requirements and current service boundaries were explored with CodeGraph and targeted mapping. The user approved the pricing/promotion policy on 2026-11-14. MP-01 is implemented and committed, including the exact local source tariffs; B2C box prices remain unconfigured. Live Postgres migration, reference seed, and B2C quote endpoint were verified.
- Existing user edits in Angular package configuration/feature restructuring are outside this feature's commits and must remain untouched.
- Next: implement MP-02 via a delegated writer against the shipped `/prices/quotes` contract, verify the UI at mobile/desktop widths with B2C/B2B fixtures, then record its commit and update this tracker/mirror.
