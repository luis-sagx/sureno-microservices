# MS01 registration validation and responsive feedback

Repository task file: `odd/tasks/ms01-registration-validation.md`

## Objective

Make individual and business registration validate immediately in Angular and authoritatively in MS01, with clear feedback, complete Ecuadorian identity checks, and no indefinite loading state.

## Problem

The signup page currently checks only whether required fields are present and whether the password has 12 characters. Invalid values such as email format are sent to MS01, so the user waits for an API response before seeing an error. The request has no timeout. MS01 has partial checks: cédula checksum is present, but field lengths, allowed characters, password composition, DOB lower bound, phone format, and RUC handling do not match the requested rules.

## Authorized scope

- Add immediate field validation and messages to the Angular sign-up form; prevent invalid requests; give the password field a show/hide control; clear loading state after success/error/timeout.
- Enforce the same validation rules in MS01 domain logic, including checksum-based cédula and RUC structure checks.
- Support a personal RUC in the person identification field as a 13-digit natural-person RUC based on a valid cédula and nonzero establishment suffix; expand the persisted `person.cedula` capacity from 10 to 13.
- For B2B registration, use one business RUC entry: relabel the identity input as the business RUC, validate it as a 13-digit RUC (reject a 10-digit cédula), send that value as the person identifier and business account RUC, and remove the duplicate RUC input.
- Keep validation errors from shifting the signup grid: reserve consistent space for inline feedback across all fields and responsive widths.
- Add TDD coverage in the existing frontend and MS01 test frameworks, plus a reversible database migration for the widened identification column.
- Preserve all existing user changes and the current feature branch. No push, PR, or merge.

## Rules

- Cédula: 10 digits, Ecuador province 01–24, third digit 0–5, valid Luhn-style Ecuadorian verifier.
- Personal RUC accepted in the identity field: 13 digits, first 10 must be a valid cédula, final 3 establishment digits must not be `000`.
- Business RUC: 13 digits, Ecuador province and person/entity type structure, final 3 establishment digits nonzero. For natural-person RUCs validate the underlying cédula; for company RUCs follow SRI guidance that there is no specific checksum algorithm for those RUC types.
- In B2B mode the single RUC value is stored as the person's identifier and business-account RUC, as requested; B2C continues to accept a cédula or natural-person RUC.
- Names and surnames: 2–50 characters; Unicode letters including `ñ` and accents, with spaces, apostrophes, and hyphens between name parts; reject digits and other symbols.
- Username: 2–32 characters, Unicode letters/numbers and `.`, `_`, `-` only.
- Phone: 7–15 digits, optionally preceded by one `+`.
- Email: optional; when present, validate with an email regex before sending.
- Birth date: not before `1900-01-01`, not a future date, and user must be 18 or older.
- Password: at least 12 characters, including an uppercase letter, a number, and a special character. Show/hide must not alter the value.
- Frontend validation is immediate and backend validation remains authoritative. A stalled registration must stop loading and show a timeout message after a bounded wait.
- Ecuadorian RUC structure research: official SRI sources state RUC is 13 numeric digits; natural-person RUC appends establishment digits to the identity number; some company RUC categories have no specific verifier algorithm: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/3b7bb0fc-e6b1-4a99-b720-c60c60eb9557/r%20LEY%20RUC.pdf and https://www.sri.gob.ec/web/intersri/facturacion-electronica.

## Resolved development configuration

- TDD: enabled by repository `AGENTS.md` and the user's ongoing explicit TDD instruction.
- `ms-auth`: `pnpm test`, `pnpm build`, `pnpm lint`.
- `frontend`: `./node_modules/.bin/ng test --watch=false`, `./node_modules/.bin/ng build` (the direct installed Angular CLI avoids the repository's minimum-release-age install restriction).

## Acceptance criteria

1. Invalid frontend data shows field-specific messages without issuing a registration request; valid data can submit.
2. Every requested rule is enforced in MS01; invalid data returns promptly with a useful field-level validation message.
3. A cédula verifier digit is checked; valid natural-person RUC is accepted for the identity field; business RUC structure is checked and persists without truncation.
4. The show/hide password control toggles input type and preserves the entered value.
5. Loading always resolves on success, server error, or timeout, with an actionable message.
6. TDD RED/GREEN is observed; applicable test/build/lint checks pass; the migration applies and rolls back safely where a local MS01 DB is available.

## Tasks

### REG-01 — MS01 registration domain validation and schema

- [x] Implement all domain checks and their failing-first tests; add the reversible migration widening person identification to 13 characters and test/preserve BusinessAccount RUC rules.
- Route: delegated direct; this unit changes domain, tests, entity/migration, and requires the mandatory writer delegation.
- TDD: RED observed for missing length/character/password/date/phone/RUC rules; GREEN after implementation. Full `pnpm test` passed 45/45, `pnpm build`, `pnpm lint`, and `git diff --check` passed. Applied the migration to the local MS01 database and confirmed `person.cedula` accepts up to 13 characters.
- Commit: `8cfee5b` — `feat(auth): strengthen Ecuador registration validation`.

### REG-02 — Angular validation, password visibility, and bounded submission

- [x] Add synchronous UI field validation/errors, disable/reject invalid submits, add password visibility control, and bound API wait with deterministic loading cleanup; add component tests first.
- Route: delegated direct; this unit changes the page, template/styles, client behavior, and specs.
- TDD: RED reproduced 11 failures on the previous page (invalid data was sent, password visibility/timeout were absent); GREEN focused signup tests 16/16 and full Angular suite 69/69. `./node_modules/.bin/ng build` passed with existing CSS budget warnings for home/catalog/detail.
- Commit: `c31cbff` — `feat(auth): validate signup fields before submit`.

### REG-03 — Single-RUC B2B registration contract

- [x] Change B2B registration to require a valid business RUC in the single identity field, relabel/validate that field conditionally, remove the duplicate form field and request property, and persist the single value in both corresponding identifiers; add backend and Angular tests first.
- Route: delegated direct; changes domain validation, request model, signup component/template, and tests.
- TDD: enabled; `pnpm test` in `ms-auth`; `./node_modules/.bin/ng test --watch=false` in `frontend`.
- TDD: RED showed the business validator rejecting RUC-only payloads and the client sending the wrong payload shape. GREEN: `ms-auth pnpm test` passed 46/46 with build/lint; Angular passed 70/70 with build. `git diff --cached --check` passed. Existing message-copy edits were kept unstaged, outside the REG-03 commit.
- Commit: `a9d1536` — `feat(auth): use one business RUC input`.

### REG-04 — Stable validation layout and conditional B2B RUC UI

- [x] Reserve stable inline-error space so validation messages do not shift signup fields; add a responsive component/style regression check first.
- Route: delegated direct; changes signup template/styles and specs.
- TDD: enabled; `./node_modules/.bin/ng test --watch=false` and build in `frontend`.
- TDD: RED showed eight fields with no validation slots before errors were displayed; GREEN keeps one reserved slot for every field. Frontend suite passed 71/71, Angular build passed, and `git diff --check` passed.
- Commit: `414159f` — `fix(auth): keep signup validation layout stable`.

## Progress and next step

- CodeGraph traced the Angular signup submission and MS01 identity service/domain. Current behavior sends non-empty invalid fields to the API; the loading flag only resets on response, and the UI has no complete client-side validation.
- REG-01 now validates Ecuadorian cédula checksum and natural-person RUC, business RUC structure, requested names/user/email/phone/date/password constraints, and widens persisted person IDs to 13 digits.
- REG-02 now performs client-side field validation before any request, exposes field messages, supports show/hide password, and reports a friendly timeout after 15 seconds while always releasing the loading state.
- Verification: frontend suite 69/69 and build passed. MS01 suite 45/45, build, and lint passed when run with `.env.example` settings; an initial verification without environment values failed two integration test suites because database credentials and `AUTH_SESSION_SECRET` were absent. The MS01 migration was applied to the local database.
- User review follow-up: the validation messages changed signup row heights and B2B asks for the RUC twice. REG-03 now shows a conditional RUC label, accepts one business RUC field/request property, and maps it to both domain records; B2C keeps its cédula/personal-RUC behavior.
- REG-04 keeps an accessible, two-line validation area reserved under each field; messages no longer insert new layout height.
- Final verification: frontend 71/71 tests/build passed; MS01 46/46 tests, build, and lint passed using `.env.example` settings. No validation work remains; pre-existing uncommitted user edits to validation copy and unrelated Angular layout/configuration files remain unstaged and untouched.
- Next: no implementation remains for the signup validation follow-up.
