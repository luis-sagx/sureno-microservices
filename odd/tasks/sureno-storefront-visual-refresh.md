# Sureño storefront visual refresh

Repository task file: `odd/tasks/sureno-storefront-visual-refresh.md`

## Objective

Align the existing Angular storefront's shared shell, home page, authentication pages, and catalog with the visual references from `/home/luissagnay/Desktop/ls/projects/sureno`, while preserving current API behavior and business rules.

## Problem and rationale

The current site has a wide, tall catalog introduction and verbose product cards, a split-photo authentication layout, and shared navigation/footer styles that differ from the supplied reference. The requested visual language is more editorial and compact, with a centered account panel, clear wholesale entry point, and product imagery prioritized over technical copy.

## Authorized scope

- Restyle the shared navbar and footer with the existing local Sureño brand assets and reference icon/layout language.
- Refine the existing home hero and add a HORECA/wholesale CTA that leads into the current business-account request flow.
- Restyle login and registration to a polished centered account layout, preserving existing fields, validation, errors, and theme behavior.
- Reduce catalog intro whitespace, prioritize product imagery, simplify cards, and remove the generic MS03/MS04 enablement notice from catalog cards.
- Reuse local assets and existing icon dependencies where present; do not fetch or transfer assets.
- Preserve manual availability confirmation, approved-business-account gating, B2B case-only presentation, B2C unit/case selection and $10 minimum, and honest unavailable pricing/order states.
- Preserve Angular SSR and responsive support down to 360px.

## Constraints and accepted decisions

- TDD is enabled by the existing feature record, explicitly selected by the user on 2026-11-13. Runner: `cd frontend && npm test -- --watch=false`; production check: `cd frontend && npm run build`.
- Keep the existing feature branch `feat/sureno-microservices-foundation`; the prior user-selected delivery strategy for this project is `feature-branch-chain`.
- The CTA must not promise a wholesale tariff download because no downloadable tariff is confirmed and MS04 pricing is not implemented. Link to the existing business registration/request flow.
- Preserve user changes already present in `frontend/angular.json` and unrelated untracked files.
- Target CodeGraph index is missing and `gentle-ai` is unavailable; the prescribed init attempt failed, so scoped filesystem exploration was delegated.

## Acceptance criteria

1. Navbar uses the Sureño reference composition and available local icons/assets while remaining keyboard-accessible and responsive.
2. Home retains its current reference-frame behavior and has a visible wholesale CTA that enters business registration without claiming downloadable pricing.
3. Login and registration use the requested elegant centered account treatment and retain all existing auth behavior.
4. Catalog products appear sooner on the page; product photography is prominent; cards omit the generic MS03/MS04 notice while preserving meaningful availability, presentation, price, and purchase states.
5. Footer follows the reference's grouped columns while keeping valid navigation and legal text.
6. Theme behavior, SSR, and 360px layout remain functional.

## Delivery and verification

- Forecast: approximately 600 authored changed lines across four work units, excluding generated files/assets.
- Route: delegated direct for each multi-file page unit. Trigger evidence: the change spans shared shell, home, auth, and catalog templates/styles; a writer is required for each multi-file unit. Initial mapping was delegated because understanding required four or more files.
- Each task observes RED before implementation, GREEN after implementation, then REFACTOR, followed by applicable Angular tests/build and `git diff --check`.
- Receipt-driven development status has not been enabled in this request; `gentle-ai` is unavailable. Follow ordinary repository delivery policy and report review as unavailable, not approved.
- No push, PR, or merge is authorized.

## Tasks

### SVR-01 — Shared navigation and footer

- [x] Restyle the shared navbar and footer to the reference composition using existing assets and behavior. Cart icon omitted because no cart flow exists; no response to the focused preference question arrived before this task closed.
- Check: RED observed (2 new assertions failed, 26 passed); GREEN after implementation/refactor (`npm test -- --watch=false`: 6 files, 28 tests); `npm run build` passed and prerendered 5 routes; `git diff --check` passed. The only build warning is the existing catalog CSS budget warning (5.44 KB vs 4 KB).
- Route: delegated direct; multiple non-trivial shared template/style edits.
- Commit: `0a77dae` — `feat(frontend): refresh shared storefront shell`.
- Receipt-driven review: disabled/unmanaged; no native assessment or approval claimed.

### SVR-02 — Home hero and wholesale CTA

- [x] Refine the home hero typography/composition and add a wholesale CTA to the existing business-account request flow. CTA says applications are manually reviewed and links to `/registro`; no tariff or price promise is made.
- Check: RED observed (new CTA assertion failed; 28 passed); GREEN `npm test -- --watch=false` passed (6 files, 29 tests); `npm run build` passed and prerendered 5 routes; `git diff --check` passed. Only the pre-existing catalog CSS budget warning remains (5.44 KB vs 4 KB). Font assets from the reference are not local, so the current Georgia display fallback is retained.
- Route: delegated direct; component template/style and behavior coverage span multiple files.
- Commit: pending parent escalation because `.git` is read-only in the sandbox.
- Receipt-driven review: disabled/unmanaged; no native assessment or approval claimed.

### SVR-03 — Login and registration presentation

- [ ] Restyle both auth pages into the requested centered account experience while preserving auth form behavior.
- Check: focused Angular tests (RED/GREEN/REFACTOR), `npm run build`, `git diff --check`.
- Route: delegated direct; shared auth styles and both page templates are multiple non-trivial files.
- Commit: pending.

### SVR-04 — Compact catalog and product cards

- [ ] Reduce catalog header whitespace, improve image prominence, simplify product cards, and remove only the generic technical enablement notice.
- Check: focused Angular tests (RED/GREEN/REFACTOR), `npm run build`, `git diff --check`.
- Route: delegated direct; catalog template/style and behavior coverage span multiple files.
- Commit: pending.

## Progress and next step

- Exploration confirms the relevant Angular files are under `frontend/src/app`; the visual source project is Next.js under `/home/luissagnay/Desktop/ls/projects/sureno`.
- Business rules permit removing the generic infrastructure notice but require preserving truthful availability and price states.
- SVR-01 implementation, checks, and work-unit commit are complete.
- SVR-02 implementation and checks are complete; its work-unit commit and commit identity record remain.
- Next: close SVR-02, then implement SVR-03.
