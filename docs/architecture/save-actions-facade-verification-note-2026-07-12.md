# Save Actions Facade Verification Note (2026-07-12)

This note verifies whether `publish/save-actions.js` is currently close to compat-facade status.

## File under review
- `publish/save-actions.js`

## Current structure
The file currently exports `window.GameModules.saveActions` and contains two kinds of behavior:
1. view/helper forwarding behavior
2. lightweight storage/state orchestration behavior

## Forwarding-oriented methods
The following methods are close to facade behavior in current worktree evidence:
- `findEmptySaveSlot()`
- `saveMeta(slot)`
- `formatSaveTime(value)`

Why:
- they resolve into `window.GameModules.ui.save.slotView`
- they mainly delegate save-slot presentation/helper concerns to the newer structured UI layer
- they look like compat wrappers over the newer save view surface

## Non-facade residue
The following methods still contain active orchestration logic:
- `refreshSaveMetas()`
- `refreshSaveMeta(slot)`

Why:
- they directly call `window.GameModules.platform.storage.backend.inspectSlot(...)`
- they update local store state (`this.saveMetas`)
- they are not pure forwarding wrappers

## Caller evidence
Current caller evidence shows:
- `publish/index.html` still uses `saveMeta(...)` and `formatSaveTime(...)` through `$store.game`
- `publish/actions.js`, `publish/home-actions.js`, and `publish/app/save/*` still rely on `refreshSaveMetas()` / `saveMeta(...)`
- `publish/game.js` still merges `gm.saveActions` into the store/action surface

This means the file is still live and still carries both compat-display behavior and active orchestration behavior.

## Current conclusion
`publish/save-actions.js` is a weaker facade candidate than `publish/wechat-view-actions.js`, but it is still a valid first-tier verification target because:
1. part of the file already behaves like a compat wrapper over `ui.save.slotView`
2. the remaining non-facade behavior is explicit and narrow enough to reason about
3. it can help distinguish "pure facade" from "partial facade with orchestration residue"

## Safe next step
Do not delete or collapse the file yet.
The next safe move would be:
1. separate view-facing wrapper methods from storage-refresh orchestration more explicitly
2. verify whether `refreshSaveMetas()` and `refreshSaveMeta(slot)` should remain here or move toward a more dedicated save-flow/state surface
3. only after that reassess whether the file can be reduced to a thinner compat facade
