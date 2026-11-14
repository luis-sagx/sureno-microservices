# Frontend feature architecture

Repository task file: `odd/tasks/frontend-feature-architecture.md`

## Objective

Restructure the Angular frontend around feature boundaries so pages, API access, models, and feature rules are separated while preserving routes and behavior.

## Problem and motivation

Pages for unrelated user journeys are grouped in `src/app/pages`, and `core/api.ts` and `core/` hold both app-wide concerns and catalog/auth feature code. Catalog pages also contain presentation eligibility and selection rules alongside HTTP-driven state. This makes feature ownership and reuse difficult to see.

## Scope and constraints

- Work only in `frontend/src/app` and this task document.
- Preserve current UI, route URLs/redirects, SSR behavior, and API contracts.
- Keep app-wide theme and session concerns in `core`; keep generic reusable UI/directives in `shared`.
- Give `home`, `about`, `auth`, and `catalog` their own feature folders. Keep feature-specific files inside their feature.
- Do not create abstractions for components that do not exist or add dependencies.
- Preserve unrelated pre-existing work in the checkout.

## Authorized scope

The user explicitly requested a feature-oriented architectural refactor of the Angular frontend and supplied the intended `core`, `shared`, and `features` responsibilities.

## Acceptance criteria

- Route pages and their templates/styles/specs are owned by their feature folders.
- Auth and catalog contracts/API clients no longer share a generic API file or live in unrelated global code.
- Catalog presentation eligibility/selection rules are pure feature-domain logic; page components do not call HTTP directly or own those rules.
- Shared UI code is generic; catalog-specific behavior stays in catalog.
- Existing route behavior and SSR setup remain intact, and imports compile.

## TDD configuration

- Mode: enabled.
- Source: project-scoped Engram observation #84 records the user's explicit TDD selection on 2026-11-13.
- Runner: `frontend` package `npm test` (`ng test`, Angular builder with Vitest); build check: `npm run build`.

## Delivery strategy and forecast

- Strategy: `ask-on-risk` (default); estimated authored diff is under 400 lines, excluding moves/generated output.
- One delegated implementation route across FE-01 and FE-02; each task closes with its own scoped commit. RDD status command is unavailable in this environment (`gentle-ai` is not installed), so no native review will be started and this limitation will be reported.

## Tasks

- [x] FE-01 (delegated): Split auth/catalog contracts and API clients into feature-owned models/data-access, and extract catalog presentation rules into pure domain functions. Route: delegated direct; the writer trigger fired because this task spans multiple non-trivial files. Verification: the new domain spec failed at first because its module did not exist, then passed (3/3); `npm test` passed (8 files, 41 tests); `npm run build` passed with existing component-style budget warnings. Commit: pending.
- [ ] FE-02 (delegated): Move app shell, shared directive, and home/about/auth/catalog files and specs into `core`, `shared`, and feature-first folders; update routes and imports. Route: delegated direct; the writer trigger fired because this task spans multiple non-trivial files. Checks: `npm test` and `npm run build` in `frontend`.

## Progress and evidence

- Exploration: CodeGraph plus a read-only delegated map found route-based lazy standalone pages; app shell uses root auth/theme services; `pages/` contains six page journeys; `core/` mixes catalog and auth with app-wide concerns; catalog presentation rules are in page classes.
- Pre-existing working tree changes are outside this task and must remain untouched.
- FE-01 implementation: auth contracts/API client now belong to `features/auth`; catalog contracts/API client and product media belong to `features/catalog`; presentation eligibility/default selection are pure functions with focused specs. Existing pages consume the feature-owned paths pending FE-02 relocation.
- FE-01 TDD evidence: RED was a missing-module build failure for `presentation-rules`; GREEN passed the focused test file (3/3).
- FE-01 checks: `npm test` passed (8 files, 41 tests). `npm run build` passed and prerendered five routes; it emitted style budget warnings for catalog (5.64 kB vs 4 kB) and home (6.44 kB vs 4 kB).
- FE-01 authored changes are staged only after confirming the unrelated dirty changes remain unstaged.

## Next step

Complete FE-02 with the enabled RED→GREEN→REFACTOR sequence, then update this document with its checks and commit evidence. Engram mirror/read-back is delegated to the parent agent.
