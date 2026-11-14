# Sureño storefront visual refresh

Repository task file: `odd/tasks/sureno-storefront-visual-refresh.md`

## Objective

Bring the Angular storefront's shared shell, home page, authentication pages, and catalog into closer visual parity with the active design system in `/home/luissagnay/Desktop/ls/projects/sureno`, while preserving current API behavior and business rules.

## Problem and rationale

The first pass used the screenshots without auditing the reference's active design system. It retained Georgia instead of EB Garamond, declared Hanken Grotesk without loading its font files, underused the navy/mist-blue secondary colors, replaced the animated Heritage composition with a shorter band in the wrong position, and hardcoded authentication pages to dark colors after hiding their shared theme control. The user requested a full reference-project audit and a correction based on the implementation, not just the screenshots.

## Authorized scope

- Restyle the shared navbar and footer with the existing local Sureño brand assets and reference icon/layout language.
- Refine the existing home hero and add a HORECA/wholesale CTA that leads into the current business-account request flow.
- Restyle login and registration to a polished centered account layout, preserving existing fields, validation, errors, and theme behavior.
- Reduce catalog intro whitespace, prioritize product imagery, simplify cards, and remove the generic MS03/MS04 enablement notice wherever it appears in catalog/product views.
- Reuse local assets and existing icon dependencies where present; do not fetch or transfer assets.
- Preserve manual availability confirmation, approved-business-account gating, B2B case-only presentation, B2C unit/case selection and $10 minimum, and honest unavailable pricing/order states.
- Preserve Angular SSR and responsive support down to 360px.
- Match the reference's active typography (EB Garamond headlines; Hanken Grotesk body/labels), light/dark palette, and motion language. Use the Latin WOFF2 subsets already generated in the reference project's `.next/static/media`; do not fetch fonts remotely.
- Recreate reference reveal behavior with Angular-compatible primitives and preserve `prefers-reduced-motion`; do not import React components into Angular.
- Put the complete Heritage section on Home between the featured categories and HORECA CTA, using the reference's year numeral, history copy, divider, quote, button, seal stage, and scroll reveals.
- Keep authentication pages standalone but give them an accessible persistent theme control and token-driven light and dark styles.

## Constraints and accepted decisions

- TDD is enabled by the existing feature record, explicitly selected by the user on 2026-11-13. Runner: `cd frontend && npm test -- --watch=false`; production check: `cd frontend && npm run build`.
- Keep the existing feature branch `feat/sureno-microservices-foundation`; the prior user-selected delivery strategy for this project is `feature-branch-chain`.
- The CTA must not promise a wholesale tariff download because no downloadable tariff is confirmed and MS04 pricing is not implemented. Link to the existing business registration/request flow.
- Runtime visual source of truth is `src/app/globals.css`, `src/app/layout.tsx`, and the live components in the reference project. `DESIGN.md` mentions Work Sans, but the active runtime uses EB Garamond and Hanken Grotesk.
- Reference color tokens: light primary gold `#b8842f`, secondary navy `#17324d`; dark primary gold `#e9c176`, secondary mist blue `#a9bfd4`. Keep the target's current light default and persisted theme choice.
- The reference is Next.js/React and the target is Angular. Port visual behavior and timing, not framework-specific components or backend flows.
- Preserve user changes already present in `frontend/angular.json` and unrelated untracked files.
- The target CodeGraph index is missing and `gentle-ai` is unavailable, so target-source exploration uses a scoped filesystem fallback. The reference `.codegraph/` exists and CodeGraph plus targeted source inspection were used before implementation.

## Acceptance criteria

1. Sureño fonts are loaded locally and applied through shared typography tokens; both themes use the reference's navy/gold palette and preserve the light default.
2. Shared navigation/footer use reference color, typography, underline/hover transitions, layout, and responsive behavior.
3. Home keeps the 76-frame hero and places the complete animated Heritage section before the wholesale CTA, with reference-style scroll reveals that respect reduced motion.
4. Login and registration offer light and dark modes with a visible theme control, reference typography/colors, and unchanged form behavior.
5. Catalog remains compact and image-forward, uses reference typography/colors/hover motion, and omits internal service-readiness copy while preserving truthful availability, presentation, price, and purchase states.
6. SSR, keyboard access, theme persistence, and 360px layout remain functional.

## Delivery and verification

- Forecast: approximately 700 additional authored changed lines across five correction work units, excluding font binaries. Prior work-unit running count: approximately 812 authored lines.
- Route: delegated direct. Trigger evidence: the reference audit and implementation span shared tokens/fonts/motion and multiple page templates/styles; initial and corrective mappings were delegated because understanding required four or more files, and writers are required for multi-file changes.
- Delivery strategy: `feature-branch-chain`, inherited from the user's explicit project instruction to keep work on one feature branch. Prior slices remain recorded above; correction slice 3 is pending and will contain SVR-05 plus the reopened page tasks. No PRs, push, or merge are authorized.
- Each task observes RED before implementation, GREEN after implementation, then REFACTOR, followed by applicable Angular tests/build and `git diff --check`.
- Receipt-driven development status has not been enabled in this request; `gentle-ai` is unavailable. Follow ordinary repository delivery policy and report review as unavailable, not approved.
- No push, PR, or merge is authorized.

## Tasks

### SVR-05 — Reference visual system foundation (new, required before page corrections)

- [x] Copied the active reference's local Latin WOFF2 subsets into the target, defined EB Garamond/Hanken Grotesk font faces, aligned light/dark color and type tokens to runtime reference values, and added a small Angular-native reveal primitive with reduced-motion behavior.
- Check: RED observed in reveal directive tests before implementation; GREEN `npm test -- --watch=false` (34/34); `npm run build` passed; local font assets exist at the declared public paths; `git diff --check` passed. A parallel build attempt hit `listen EPERM`; the sequential build passed. Existing catalog CSS budget warning (5.20 KB vs 4 KB) remains.
- Route: delegated direct; global tokens, font assets, and reusable animation behavior span multiple files.
- Commit: `9c5e256` (`feat(frontend): load reference visual system`).

### SVR-01 — Shared navigation and footer (reopened by user feedback)

- [ ] Revisit navbar/footer after SVR-05 to apply the reference's navy/mist-blue, loaded fonts, and active underline/hover transitions. Prior layout and accessibility behavior remains valid.
- Reopened because the user identified that the prior implementation did not use the reference palette, typography, or animation language.
- Prior verification/commit: `0a77dae`; new checks pending.
- Route: delegated direct; multiple non-trivial shared template/style edits.
- Commit: pending.

### SVR-02 — Home hero, Heritage section, and wholesale CTA (reopened by user feedback)

- [ ] Apply the real font/theme tokens, restore the complete Heritage composition in reference order before HORECA, and add its heading/paragraph/quote/seal reveal motion; keep the 76-frame hero and honest registration CTA.
- Reopened because Heritage was reduced and placed after HORECA, and the page lacks the reference's reveal animations and active font.
- Prior verification/commit: `74ce5a2`; new checks pending.
- Route: delegated direct; component template/style and behavior coverage span multiple files.
- Commit: pending.

### SVR-03 — Login and registration themes (reopened by user feedback)

- [x] Kept standalone account cards and added visible, accessible theme controls on both login and registration. Controls use the persistent ThemeService; auth styles now use shared light/dark tokens and forms/API behavior is unchanged.
- Check: the new auth route/theme persistence test passed for both routes; `npm run build` passed and prerendered five routes; `git diff --check` passed. The full suite still had a concurrent nav assertion failure (37 passed, 1 failed) at handoff; that failure is outside the auth files and is tracked under SVR-01.
- Reopened because the user requires light and dark auth pages; the previous dark-only styles hid the only theme control.
- Prior implementation commit: `035507b`; corrected and verified in `fd19b19` (`feat(frontend): support auth theme switching`).
- Route: delegated direct; route shell, auth styles, both page templates, and tests span multiple files.
- Commit: `fd19b19` (`feat(frontend): support auth theme switching`).

### SVR-04 — Compact catalog and product cards (reopened by user feedback)

- [ ] After SVR-05, align catalog typography/colors and card hover motion with the reference while retaining compact imagery, honest price/availability, and removal of service-readiness copy.
- Reopened because the reference audit found the active palette/type/motion system was not applied consistently to cards.
- Route: delegated direct; catalog template/style and behavior coverage span multiple files.
- Prior verification/commit: `435ffd2`; new checks pending.
- Commit: pending.

## Progress and next step

- Reference audit confirms active runtime fonts/tokens are defined by `src/app/layout.tsx` and `src/app/globals.css`; local Latin WOFF2 build outputs exist under `.next/static/media`.
- Reference Home order is Hero, categories, full Heritage, trust, HORECA. The target had an abbreviated Heritage band after HORECA.
- Existing auth theme persistence now has visible controls on the standalone routes and token-driven light/dark styles.
- Previous SVR-01 through SVR-04 commits remain in history; user feedback reopens their visual acceptance. No unrelated completed work is invalidated.
- SVR-05 is implemented, verified, and committed as `9c5e256`. The reopened page corrections are in progress through delegated writers and will be committed task by task after this foundation slice.
