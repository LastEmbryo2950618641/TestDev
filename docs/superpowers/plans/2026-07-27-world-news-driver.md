# World News Driver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop News app and world-news driver that stores fixed-channel heat-ranked news, injects relevant world background into real-world inference, and lets AI settlement update the rankings through structured ops.

**Architecture:** Keep all runtime logic in `publish/` so Web, Windows desktop, and Android WebView share one implementation. The news driver is upstream of the existing Event System: it owns news feeds and can promote selected local/organization items into existing `inference` events, but it does not bind news to characters.

**Tech Stack:** Browser JavaScript modules attached to `window.GameModules`, Alpine store actions, static CSS/HTML, existing boot script manifest, existing Node verification scripts.

---

### Task 1: Core News Driver System

**Files:**
- Create: `publish/news-driver-system.js`
- Test: `tests/news-driver-system.test.js`

- [ ] Add fixed channel definitions, scope/task/trend enums, `defaultState()`, `normalizeNewsItem()`, `applyOps()`, heat ranking, decay, prompt formatting, and `promoteToEventPayload()`.
- [ ] Add Node unit tests that load `publish/news-driver-system.js` in a browser-like global and verify invalid channels are rejected, replace ops require full `item`, ranks are system-generated, and `promoteToEvent` creates an `inference` event payload.
- [ ] Run `node tests/news-driver-system.test.js` and expect PASS.

### Task 2: Store Actions and Runtime Wiring

**Files:**
- Create: `publish/news-driver-actions.js`
- Modify: `publish/game.js`
- Modify: `publish/app-switch-actions.js`
- Modify: `publish/domain/storage/restore-state-helpers.js`

- [ ] Add actions for init/open/close/channel/filter/select/tick/prompt context/promote event.
- [ ] Add `newsDriverState` default state in `game.js` and register `gm.newsDriverActions` in the modules array.
- [ ] Close `newsDriverState.open` in `closeDesktopApps()`.
- [ ] Restore saved `newsDriverState` with `open:false` and pure JSON state.
- [ ] Run syntax verification for touched runtime scripts.

### Task 3: News App UI

**Files:**
- Create: `publish/news-driver.css`
- Modify: `publish/index.html`
- Modify: `publish/boot/scripts.json`
- Modify: `publish/boot/script-manifest.js`

- [ ] Add News desktop icon.
- [ ] Add compact News app window with left channels, middle ranking list, right detail panel, and filters.
- [ ] Add CSS to boot assets and script manifests.
- [ ] Ensure all other app visibility guards exclude `newsDriverState.open`.

### Task 4: Inference Integration and Settlement

**Files:**
- Create: `publish/inference/news-driver-stage-update.js`
- Create: `publish/prompts/推演引擎/stage11-world-news-update.md`
- Create: `publish/prompts/推演引擎/stage11-world-news-update.js`
- Modify: `publish/real-world-agent-loop.js`
- Modify: `publish/real-world-actions.js`
- Modify: `publish/boot/scripts.json`
- Modify: `publish/boot/script-manifest.js`

- [ ] Inject `newsNarrationPromptContext()` into Stage2 and Stage3 prompt contexts.
- [ ] Add post-narration AI news settlement stage that outputs `{ ops, done }` and applies validated ops.
- [ ] Tick news after phone time advances and record settlement summary.
- [ ] Promote strong news to existing `inference` events through `upsertEvent()`.

### Task 5: Verification

**Files:**
- Modify tests only if needed.

- [ ] Run `node tests/news-driver-system.test.js`.
- [ ] Run `npm run verify:required-runtime-syntax`.
- [ ] Run `npm run verify:runtime-coverage`.
- [ ] Run `npm run verify:runtime-deps`.
- [ ] Run `npm run verify:assets`.
- [ ] Run `npm run android:sync-assets -- --check`.

## Self-Review

- Spec coverage: fixed channels, open tags, no role matching, AI replace item requirement, event promotion, prompt injection, storage, UI, and three-end shared-runtime synchronization are covered.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: state field names use `newsDriverState`; actions use `newsDriver*` prefixes; news item uses `channelId`, `scope`, `taskPotential`, `behaviorHooks` consistently.
