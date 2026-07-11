# Save Actions Structured Facade Separation Note (2026-07-12)

This note records the first low-risk structural cleanup pass for `publish/save-actions.js`.

## What changed
- storage-refresh orchestration methods were left in place:
  - `refreshSaveMetas()`
  - `refreshSaveMeta(slot)`
- save-slot display/helper methods were normalized into a unified facade-forwarding pattern:
  - `findEmptySaveSlot()` -> `slotView.findEmptySlot()`
  - `saveMeta(slot)` -> `slotView.meta(slot)`
  - `formatSaveTime(value)` -> `slotView.formatTime(value)`

## What did not change
- caller method names
- `$store.game` save-facing call shape
- slot metadata refresh behavior
- storage inspection path through `window.GameModules.platform.storage.backend.inspectSlot(...)`

## Why this pass stayed conservative
Unlike `publish/wechat-view-actions.js`, this file still owns live orchestration for storage-backed slot metadata.
That orchestration is behaviorally important because it updates `this.saveMetas`, which is used across home, save panel, and load/delete flows.

Moving orchestration prematurely would risk:
- stale save-slot state
- broken slot refresh timing
- accidental changes to load/delete/home behavior

For that reason, this pass only clarified the boundary between:
- orchestration behavior
- compat display wrappers over `publish/ui/save/slot-view.js`

## Architectural effect
Before this pass:
- display wrappers and orchestration lived side by side but were not structurally separated

After this pass:
- the file clearly expresses two roles
- UI-oriented methods are grouped as a consistent compat facade
- orchestration residue is easier to identify for later extraction

## Why this matters for the broader refactor
This gives the project a second migration pattern after the WeChat sample:
1. make the display-facing surface visibly thin and uniform first
2. leave persistence orchestration untouched until a proper state/service destination is ready
3. reduce coupling by exposing remaining residue explicitly instead of hiding it in mixed helper methods

## Next safe step
1. identify a dedicated save-flow or save-state service surface for refresh orchestration
2. verify all current `refreshSaveMetas()` / `refreshSaveMeta(slot)` callers before moving those methods
3. only after that reassess whether `publish/save-actions.js` can become a true thin compat layer
