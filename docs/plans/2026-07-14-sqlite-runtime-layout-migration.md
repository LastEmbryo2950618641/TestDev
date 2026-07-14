# SQLite Runtime Layout Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move the five browser SQLite runtime implementations into the platform storage area without changing persistence behavior, schema, fallback state, or cross-platform startup order.

**Architecture:** Keep `window.GameModules.sqliteSave` as the stable runtime API and preserve the existing decorator chain. Only the physical ownership changes from the publish root to `platform/storage/sqlite/`; Web remains authoritative and Android assets remain a generated mirror.

**Tech Stack:** Browser JavaScript, Node.js contract tests, JSON runtime manifests, Android WebView assets, Electron packaging.

---

### Task 1: Lock the canonical layout and decorator order

**Files:**
- Create: `tests/sqlite-runtime-layout.test.js`
- Modify: `package.json`

- [x] Add a contract test that requires the five canonical files under `publish/platform/storage/sqlite/`, rejects legacy root copies, verifies the exact order in all four Web/Android runtime lists, and verifies bundle restore destinations.
- [x] Add `verify:sqlite-runtime-layout` to `verify:shared`.
- [x] Run `node tests/sqlite-runtime-layout.test.js` and confirm it fails because the canonical files do not exist yet.

### Task 2: Move the authoritative Web implementations

**Files:**
- Move: `publish/sqlite-save.js` to `publish/platform/storage/sqlite/save.js`
- Move: `publish/sqlite-world.js` to `publish/platform/storage/sqlite/world.js`
- Move: `publish/sqlite-worldline.js` to `publish/platform/storage/sqlite/worldline.js`
- Move: `publish/sqlite-memory.js` to `publish/platform/storage/sqlite/memory.js`
- Move: `publish/sqlite-real-world-log.js` to `publish/platform/storage/sqlite/real-world-log.js`
- Modify: `publish/boot/scripts.json`
- Modify: `dev/scripts/restore-from-bundles.cjs`
- Modify: `scripts/sync-from-bundles.mjs`
- Modify: `tests/lexicon-store.test.js`
- Modify: `tests/worldline-store.test.js`

- [x] Use `git mv` so history remains traceable.
- [x] Replace all executable old-path references with canonical paths while retaining the exact five-file order.
- [x] Run the layout, lexicon, worldline, runtime dependency, runtime coverage, and syntax tests.

### Task 3: Regenerate and synchronize platform manifests

**Files:**
- Regenerate: `publish/boot/script-manifest.js`
- Synchronize: `mobile/android-webview-shell/app/src/main/assets/publish/**`

- [x] Run `node dev/scripts/generate-script-manifest.cjs`.
- [x] Run `npm run android:sync-assets`.
- [x] Remove the five stale Android root copies after confirming their canonical mirrored replacements exist.
- [x] Run the layout test and `npm run verify:assets`.

### Task 4: Prove behavior and packaging are unchanged

**Files:**
- Modify: `docs/architecture/2026-07-12-final-cleanup-audit.md`

- [x] Run `npm run verify:shared`.
- [x] Run `npm run build:multi-platform`.
- [x] Run `npm run verify:multi-platform`.
- [x] Record the migration invariants and verification evidence in the cleanup audit.
- [x] Confirm `git status` and search for executable legacy paths before committing.
