# Frontend pnpm migration

Repository task file: `odd/tasks/frontend-pnpm.md`

## Objective

Switch the standalone Angular frontend from npm to pnpm without changing dependency versions or application behavior.

## Problem and motivation

The frontend still declares npm in `package.json` and Angular CLI configuration and uses an npm lockfile, while the other services in this repository use pnpm.

## Scope and constraints

- Change only `frontend/` and this task document.
- Keep the frontend independent; do not create a root workspace or modify other services.
- Preserve the currently resolved dependency versions and the pre-existing `frontend/angular.json` analytics setting.
- Translate the existing dirty npm lockfile into the pnpm lock so its current dependency resolution is carried forward.
- Document frontend commands using pnpm scripts.

## Authorized scope

The user explicitly requested that the frontend be migrated from npm to pnpm.

## Acceptance criteria

- `frontend/package.json` pins pnpm as its package manager and Angular CLI selects pnpm.
- `frontend/pnpm-lock.yaml` replaces `frontend/package-lock.json` without introducing dependency upgrades.
- Frontend README development/build/test commands use pnpm scripts.
- The pnpm lockfile validates offline with the existing release-age policy overridden for that command only, and the frontend test/build scripts run through pnpm.
- A clean install must not be marked complete until the user decides whether to allow the four dependency build scripts pnpm flagged.

## TDD configuration

- Mode: enabled.
- Source: project-scoped Engram observation #84 records the user's explicit TDD selection on 2026-11-13.
- Runner: `pnpm test` (`ng test`, Angular builder/Vitest); build check: `pnpm run build`.
- This migration changes package-manager/configuration behavior, not application behavior, so a focused application test RED is not meaningful. Use the lockfile and existing frontend checks as the closest practical verification; do not invent RED evidence.

## Delivery strategy and forecast

- Strategy: `ask-on-risk` (default); generated lockfile changes are excluded from the authored-line budget.
- This task crosses the delegated-writer threshold because the package manifest, Angular configuration, lockfile, and README need coordinated changes. On 2026-11-14 the user directed local work-unit commits only; no PR chain is being created.

## Tasks

- [ ] FP-01 (delegated): Convert the standalone frontend to pnpm, import the current npm dependency resolution, update Angular CLI metadata and README commands, and verify the frozen lockfile and frontend checks. Route: delegated direct; writer trigger applies across multiple non-trivial files. Checks: pnpm frozen-lockfile validation, `pnpm test`, `pnpm run build`, and `git diff --check`. A clean install remains pending lifecycle-script policy.

## Progress and evidence

- Exploration: `pnpm` 11.9.0 is installed; the other service packages have pnpm lockfiles; the frontend is standalone and its dirty npm lockfile contains three peer metadata changes that must be carried through import.
- Existing dirty `frontend/angular.json`, `frontend/package-lock.json`, and unrelated workspace changes must be preserved or translated, never overwritten silently.
- `frontend/package.json` now pins `pnpm@11.9.0`; Angular CLI selects pnpm; README commands use pnpm scripts; `pnpm-lock.yaml` was imported from the local npm lock, and `package-lock.json` was removed.
- The imported lock preserves the npm lock's exact `postcss@8.5.33`, nested `vite@8.3.5`, and root `vite@8.3.8` versions. Import performed 513 resolutions with zero package downloads.
- Frozen offline lock validation passes with a command-only `minimum-release-age=0` override because the active policy rejects the inherited `postcss@8.5.33` under its default age window. The policy itself was not changed.
- `pnpm test` passed (11 files, 44 tests) with `verify-deps-before-run=warn`, reporting existing `node_modules` were out of sync. `pnpm run build` passed after rerunning outside the sandbox; it prerendered five routes and emitted the existing Home/Catalog CSS budget warnings.
- A complete frozen install is blocked by pnpm 11's default lifecycle-script gate for `@parcel/watcher`, `esbuild`, `lmdb`, and `msgpackr-extract`. pnpm generated `frontend/pnpm-workspace.yaml` with unresolved allow/deny placeholders; that incomplete generated file was removed rather than committed. No scripts have been approved. An offline install stopped at the uncached `colorjs.io@0.7.1` tarball. The attempted online frozen install exited before downloading packages because the lifecycle-script gate remained unresolved.
- The pre-existing dirty changes outside this task, including `frontend/angular.json` analytics, the in-progress frontend architecture notes, and untracked MS04 files, remain untouched.

## Next step

The user requested commits only; commit the current pnpm migration work unit and leave the clean-install/script-approval decision recorded as pending. If the user later wants a fully reproducible clean install, ask whether to allow only the four named scripts, then update and verify this task.
