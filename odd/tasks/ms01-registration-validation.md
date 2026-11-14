# MS01 registration validation and responsive feedback

Repository task file: `odd/tasks/ms01-registration-validation.md`

## Objective

Make individual and business registration validate immediately in Angular and authoritatively in MS01, with clear feedback, complete Ecuadorian identity checks, and no indefinite loading state. Keep optional business-profile details out of signup and let authenticated business users complete them later in account settings.

## Problem

The signup page previously checked only whether required fields were present and whether the password had 12 characters. Invalid values could be sent to MS01, causing long waits before an error. The request lacked a timeout. MS01 had partial checks, and B2B signup asked for an optional commercial name before creating the account. There is no account-settings page or API to complete that detail later.

## Authorized scope

- Previously completed REG-01 to REG-04: immediate frontend validation, authoritative MS01 validation, password visibility and bounded submission; cédula/RUC validation and reversible schema migration; one B2B RUC field; stable inline-error layout.
- New REG-05: remove `nombre_comercial` from the B2B registration contract and persist it as null when omitted; add authenticated MS01 read/update operations for the current user's own business account commercial name, with domain validation and tests.
- New REG-06: remove the commercial-name field from B2B signup UI/state/payload; add an authenticated account-settings page and client integration to load/update the current business user's commercial name. Keep the scope limited to this field; non-business accounts get a clear unavailable state.
- Preserve all existing user changes and the current feature branch. No push, PR, or merge.

## Rules

- Cédula: 10 digits, Ecuador province 01–24, third digit 0–5, valid Ecuadorian verifier.
- Personal RUC accepted in identity field: 13 digits, first 10 a valid cédula, final 3 establishment digits not `000`.
- Business RUC: 13 digits, valid Ecuadorian structure and nonzero establishment suffix; validate natural-person RUC against its underlying cédula.
- B2B registration uses one business RUC field, stored as person identifier and business-account RUC. B2C continues to accept a cédula or natural-person RUC.
- Names and surnames: 2–50 Unicode letters (including ñ and accents), spaces, apostrophes, hyphens between parts; reject digits and other symbols.
- Username: 2–32 characters, Unicode letters/numbers and `.`, `_`, `-` only.
- Phone: 7–15 digits, optionally preceded by one `+`.
- Email: optional; when present, validate with an email regex before sending.
- Birth date: not before `1900-01-01`, not a future date, and user must be 18 or older.
- Password: at least 12 characters, including an uppercase letter, a number, and a special character.
- Frontend validation is immediate and backend validation remains authoritative. A stalled registration must stop loading after a bounded wait.
- Account settings must identify the business account from the authenticated session's user ID; clients must not submit an arbitrary account/user ID. Commercial name is optional and nullable (matching the existing schema); trim and limit non-empty values to 160 characters.
- Existing reference on RUC validation: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/3b7bb0fc-e6b1-4a99-b720-c60c60eb9557/r%20LEY%20RUC.pdf and https://www.sri.gob.ec/web/intersri/facturacion-electronica.

## Resolved development configuration

- TDD: enabled by repository `AGENTS.md` and the user's ongoing explicit TDD instruction.
- `ms-auth`: `pnpm test`, `pnpm build`, `pnpm lint`.
- `frontend`: `./node_modules/.bin/ng test --watch=false`, `./node_modules/.bin/ng build` (direct installed Angular CLI avoids the repository's minimum-release-age install restriction).

## Acceptance criteria

1. Invalid signup values show field-specific messages without issuing a request; valid data can submit.
2. All requested validation rules remain enforced in MS01; invalid data gets a prompt, useful field-level error.
3. B2B uses one RUC field; no commercial name appears in the registration form or outgoing request, and registration stores null when omitted.
4. An authenticated B2B user can load and update (including clearing) only their own commercial name; non-business account and unauthenticated access return clear errors.
5. The account settings UI loads the saved value, validates the 160-character limit, saves feedback, and handles unavailable/non-business state. It waits for session restoration before showing the signed-in or signed-out view.
6. TDD RED/GREEN is observed; applicable test/build/lint checks pass; prior user changes remain intact.

## Tasks

### REG-01 — MS01 registration domain validation and schema

- [x] Implement domain checks and failing-first tests; add reversible migration widening person identification to 13 characters and test/preserve BusinessAccount RUC rules.
- Route: delegated direct; domain, tests, entity/migration. Mapping trigger applied (4+ files), writer trigger applied (multiple non-trivial files).
- TDD: RED observed for missing length/character/password/date/phone/RUC rules; GREEN after implementation. Full `pnpm test` passed 45/45, `pnpm build`, `pnpm lint`, and `git diff --check` passed. Applied the migration to local MS01 DB and confirmed `person.cedula` accepts up to 13 characters.
- Commit: `8cfee5b` — `feat(auth): strengthen Ecuador registration validation`.

### REG-02 — Angular validation, password visibility, and bounded submission

- [x] Add synchronous UI field validation/errors, prevent invalid submit, add password visibility, and bound API wait; add component tests first.
- Route: delegated direct; signup page, template/styles, client behavior, specs.
- TDD: RED reproduced 11 failures; GREEN focused signup tests 16/16 and full Angular suite 69/69. Build passed with existing CSS budget warnings.
- Commit: `c31cbff` — `feat(auth): validate signup fields before submit`.

### REG-03 — Single-RUC B2B registration contract

- [x] Change B2B registration to require a valid business RUC in the single identity field, relabel/validate it conditionally, remove the duplicate form field and request property, persist the value in both identifiers; add backend and Angular tests first.
- Route: delegated direct; domain validation, request model, signup, tests.
- TDD: RED showed business validator rejecting RUC-only payloads and client sending wrong payload shape. GREEN: MS01 46/46 tests with build/lint; Angular 70/70 and build. Existing message-copy edits remained unstaged.
- Commit: `a9d1536` — `feat(auth): use one business RUC input`.

### REG-04 — Stable validation layout and conditional B2B RUC UI

- [x] Reserve stable inline-error space so messages do not shift signup fields; add responsive regression check first.
- Route: delegated direct; signup template/styles/specs.
- TDD: RED showed eight fields had no reserved error slots; GREEN reserves one. Frontend 71/71 tests and build passed; `git diff --check` passed.
- Commit: `414159f` — `fix(auth): keep signup validation layout stable`.

### REG-05 — MS01 business profile update endpoint

- [x] Omit optional commercial name from B2B registration input and persist null if omitted; implement authenticated use cases and repository port/adapters to load/update the current user's own commercial name; validate and test authorization, not-found/non-business, optional/clear, and length behavior.
- Route: delegated direct; mapping trigger fired (identity, auth, persistence, frontend spans 4+ files); writer trigger fired (multiple non-trivial files). Mapping findings: session principal provides userId; BusinessAccount.nombre_comercial is nullable; no profile API existed.
- TDD: RED focused specs showed 10 failures for absent use cases/repository methods, registration contract still requiring the commercial name, and omitted value persisting as undefined; 2 more controller route failures were observed before adding endpoints. GREEN: focused identity specs 41/41; full `ms-auth` suite 58/58 with `.env.example`; `pnpm build`, `pnpm lint`, and `git diff --cached --check` passed.
- Commit: `4fd4493` — `feat(auth): add business account settings endpoint`.

### REG-06 — Signup simplification and business account settings UI

- [x] Remove the commercial-name field from B2B signup markup, state, model and request; add a route/page to edit the current user's commercial name, with clear non-business, loading, success, and error states; add component/client tests first.
- Route: delegated direct; mapping trigger fired (4+ files); writer trigger fired (signup, route, settings page/client/specs). Preserve pre-existing uncommitted edits to signup files.
- TDD: initial RED showed missing API/page modules; an additional 503 test exposed that a failed profile load was incorrectly treated as a non-business account. A final regression RED showed a restoring session rendered the login prompt. GREEN: full suite passed 80/80 across 17 files; `./node_modules/.bin/ng build`, focused settings tests (6/6), and `git diff --cached --check` passed.
- Commits: `0d4f2f1` — `feat(frontend): add business account settings`; `b00e8c2` — `fix(frontend): wait for restored account session`.

## Progress and next step

- REG-01 to REG-04 are complete as documented above.
- This follow-up was requested to reduce B2B signup clutter and let business users provide `nombre_comercial` later in account settings. REG-05 now exposes authenticated GET/PATCH `/identity/me/business-account`, scoped to the current session user; blank values clear the optional name, and registration persists null when omitted.
- CodeGraph and read-only mapping confirm no account settings screen or profile endpoint currently exists. MS01's authenticated session includes `userId`; the business-account column already accepts null.
- Preserve uncommitted user edits in `frontend/angular.json`, `frontend/src/app/core/shell/app.html`, `frontend/src/app/features/auth/pages/signup.page.spec.ts`, `frontend/src/app/features/auth/pages/signup.page.ts`, `.codegraph/`, the requirements document, and `AGENTS.md`.
- REG-06 adds a discoverable account page linked from the account icon, GET/PATCH client calls, saved-name editing, signup field/payload removal, and explicit loading, success, error, signed-out, and non-business states. It waits for session restoration before selecting the account state.
- Final verification: MS01 58/58 tests, build and lint passed; Angular 80/80 tests and build passed. The local diff check is clean.
- Commits: `4fd4493`, `0d4f2f1`, and `b00e8c2`. Pre-existing uncommitted edits remain untouched.
- Next: no implementation remains for this follow-up.
