# Storage Source Rollout Phase 2 Plan

## Goal

Continue reducing direct persistence coupling by routing additional low-risk character state and real-world log callers through `publish/platform/storage/*` sources, without changing gameplay behavior.

## Scope

This phase only replaces storage entry points in low-risk callers:

- `publish/item-skill-actions.js`
- `publish/real-world-agent-memory.js`
- `publish/real-world-longing-actions.js`
- `publish/update/generic-update-applier.js`
- `publish/real-world-agent-history.js`
- `publish/real-world-clock-actions.js`
- `publish/real-world-actions.js`

It also extends the storage source capabilities so callers can reuse the same boundary instead of dropping back to `sqliteSave`.

## Changes

### 1. Extend character state source

Add a small resolver helper:

- `resolve(target)`
  - try `get(id)`
  - then try `getByName(name)`

This keeps name/id lookup behavior reusable for modules that accept either form.

### 2. Extend real-world log source

Add read-side helpers:

- `get(id)`
- `list(page, pageSize)`

This allows real-world log modules to stop mixing direct storage calls with the new platform boundary.

### 3. Migrate low-risk callers

Replace direct calls to:

- `sqliteSave.getCharacterState`
- `sqliteSave.getCharacterStateByName`
- `sqliteSave.saveCharacterState`
- `sqliteSave.getRealWorldLogEntry`
- `sqliteSave.saveRealWorldLogEntry`
- `sqliteSave.saveRealWorldLogEntries`
- `sqliteSave.countRealWorldLogEntries`
- `sqliteSave.listRealWorldLogEntries`

with the matching platform storage source methods.

## Non-goals

- Do not redesign persistence schema.
- Do not alter prompt logic, progression rules, control rules, or UI behavior.
- Do not migrate every remaining `sqliteSave` caller in one pass.
- Do not remove compatibility behavior from existing orchestration modules.

## Risk Control

- Only perform one-to-one entry replacement.
- Preserve fallback order and null handling.
- Avoid modifying generated data shapes or business decisions.
- Keep old storage backend intact behind the new source boundary.

## Expected Outcome

- More runtime modules depend on `window.GameModules.platform.storage.*` instead of persistence internals.
- Future `exe` / `apk` storage adaptation only needs to stabilize the platform source layer rather than many scattered callers.
