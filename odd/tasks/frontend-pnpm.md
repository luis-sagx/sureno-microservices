# Frontend pnpm migration

Repository task file: `odd/tasks/frontend-pnpm.md`

## Objective

Use pnpm as the only package manager for the standalone Angular frontend, including a clean frozen install, without changing dependency versions or application behavior.

## Problem and motivation

The frontend still declares npm in `package.json` and Angular CLI configuration and uses an npm lockfile, while the other services in this repository use pnpm.

## Scope and constraints

- Change only `frontend/` and this task document.
- Keep the frontend independent; do not create a root workspace or modify other services.
- Preserve the currently resolved dependency versions and the pre-existing `frontend/angular.json` analytics setting.
- Translate the existing dirty npm lockfile into the pnpm lock so its current dependency resolution is carried forward.
- Document frontend commands using pnpm scripts.
- Remove stale npm package-manager references from active frontend files; historical task records and package metadata mentioning npm are not executable manager configuration.
- Allow only the four dependency build scripts pnpm flagged so a fresh frozen install can finish: `esbuild`, `@parcel/watcher`, `lmdb`, and `msgpackr-extract`.

## Authorized scope

The user explicitly requested that the frontend be migrated from npm to pnpm.

## Acceptance criteria

- `frontend/package.json` pins pnpm as its package manager and Angular CLI selects pnpm.
- `frontend/pnpm-lock.yaml` replaces `frontend/package-lock.json` without introducing dependency upgrades.
- Frontend README development/build/test commands use pnpm scripts.
- No npm install/run commands, npm lockfile, or stale npm manager config remain in active frontend files.
- `frontend/pnpm-workspace.yaml` explicitly allows only the four named dependency build scripts.
- `frontend/pnpm-workspace.yaml` excludes only `postcss@8.5.33` from the minimum-release-age gate; other versions and supply-chain checks remain covered.
- `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm run build` complete through pnpm under the active supply-chain policy.

## TDD configuration

- Mode: enabled.
- Source: project-scoped Engram observation #84 records the user's explicit TDD selection on 2026-11-13.
- Runner: `pnpm test` (`ng test`, Angular builder/Vitest); build check: `pnpm run build`.
- This migration changes package-manager/configuration behavior, not application behavior, so a focused application test RED is not meaningful. Use the lockfile and existing frontend checks as the closest practical verification; do not invent RED evidence.

## Delivery strategy and forecast

- Strategy: `ask-on-risk` (default); generated lockfile changes are excluded from the authored-line budget.
- This task crosses the delegated-writer threshold because the package manifest, Angular configuration, lockfile, dependency script policy, `.gitignore`, and README need coordinated changes. The user directed local work-unit commits only; no PR chain is being created.

## Tasks

- [x] FP-01 (delegated, reopened by user): Finish the npm-to-pnpm migration for a clean pnpm-only frontend, remove the stale `.gitignore` entry, add the narrow build-script allowlist, and verify install/test/build. Reopened because the user explicitly requested a clean pnpm setup that uses pnpm only. Route: delegated direct; writer trigger applies across multiple non-trivial files. Checks: `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm run build`, active npm-reference scan, and `git diff --check` all passed.

## Progress and evidence

- Exploration: `pnpm` 11.9.0 is installed; the other service packages have pnpm lockfiles; the frontend is standalone and its dirty npm lockfile contains three peer metadata changes that must be carried through import.
- Existing dirty `frontend/angular.json`, `frontend/package-lock.json`, and unrelated workspace changes must be preserved or translated, never overwritten silently.
- `frontend/package.json` now pins `pnpm@11.9.0`; Angular CLI selects pnpm; README commands use pnpm scripts; `pnpm-lock.yaml` was imported from the local npm lock, and `package-lock.json` was removed.
- The imported lock preserves the npm lock's exact `postcss@8.5.33`, nested `vite@8.3.5`, and root `vite@8.3.8` versions. Import performed 513 resolutions with zero package downloads.
- During initial validation, frozen offline lock validation required a command-only `minimum-release-age=0` override because the active policy rejected the inherited `postcss@8.5.33`. The final configuration now preserves the same version through an exact `minimumReleaseAgeExclude` entry; the global age policy remains unchanged.
- The earlier offline install attempt could not complete because `colorjs.io@0.7.1` was not cached. On resume, the user authorized a frozen install from registry.npmjs.org and the four named lifecycle scripts.
- Added `frontend/pnpm-workspace.yaml` with `allowBuilds: true` only for `esbuild`, `@parcel/watcher`, `lmdb`, and `msgpackr-extract`; removed `npm-debug.log` from `frontend/.gitignore`.
- Following the user's choice, `frontend/pnpm-workspace.yaml` now has an exact `minimumReleaseAgeExclude` for `postcss@8.5.33`; it preserves the imported version and leaves the global age policy and all other package checks unchanged.
- `pnpm --config.minimum-release-age=0 install --frozen-lockfile --force` completed with pnpm 11.9.0. It reused 366 packages, downloaded 148 missing tarballs, linked 514 packages, and ran all four allowed scripts successfully. The lockfile resolution step was skipped as up to date.
- A fresh default `pnpm install --frozen-lockfile` now passes with the exact-version exception; the lockfile remains unchanged.
- On 2026-11-14, the user chose to preserve `postcss@8.5.33` and allow only that exact version through `minimumReleaseAgeExclude`; the global policy and other dependency versions remain unchanged.
- `pnpm test` passed (13 files, 53 tests). `pnpm run build` passed and prerendered five static routes; existing CSS budget warnings remain for Catalog, Product detail, and Home.
- Plain `pnpm install`, `pnpm test`, and `pnpm run build` all passed without command-line policy overrides.
- Active frontend scan found only pnpm manager/README commands; no npm install/run commands, `package-lock.json`, `npm-debug.log` entry, or npm manager configuration remain. `frontend/package-lock.json` is absent. `git diff --check` passed.
- Initial migration commit: `83397df` (`build(frontend): migrate package manager to pnpm`).
- Final pnpm-only work-unit commit: `63c7b3c` (`build(frontend): finish pnpm-only migration`), containing `.gitignore`, the exact-version policy exception and script allowlist, and this task record.
- Style audit: Tailwind and `@tailwindcss/postcss` are dependencies; `.postcssrc.json` enables Tailwind and `src/styles.css` imports it. Actual component styling uses regular CSS files and semantic class names; no utility classes, `@apply`, or Tailwind theme config were found.
- User's resumed request authorizes completing a pnpm-only setup and the narrowly scoped build-script allowlist; no broad install-script permission is added.
- The pre-existing dirty changes outside this task, including `frontend/angular.json` analytics, the in-progress frontend architecture notes, and untracked MS04 files, remain untouched.

## Next step

The local Engram v2 CLI saved the full task content to the project observation, but did not preserve the requested topic key `odd/frontend-pnpm/tasks`; topic-scoped mirroring remains pending until a compatible Engram interface is available.
