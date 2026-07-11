# Publish Legacy Entry Audit (2026-07-12)

This note records the current status of the remaining high-risk top-level compatibility entries under `publish/`.

## Still active in runtime manifests
These files are still explicitly loaded by:
- `publish/boot/script-manifest.js`
- `publish/boot/scripts.json`

Current active entries:
- `publish/storage.js`
- `publish/settings-actions.js`
- `publish/loading-actions.js`
- `publish/role-card-loading-actions.js`
- `publish/save-actions.js`
- `publish/update/generic-update-compat.js`
- `publish/update/settlement-ui-bridge.js`

## Current classification
### 1. Not removable now: real logic entry
- `publish/storage.js`
  - directly calls `window.GameModules.platform.storage.backend.*`
  - still owns snapshot/restore-facing store serialization logic
- `publish/loading-actions.js`
  - still owns loading timer, stage state, progress text, loading progress lifecycle
- `publish/role-card-loading-actions.js`
  - still owns a full role-card loading panel state machine
- `publish/save-actions.js`
  - still drives slot inspection and save-meta view helpers

### 2. Not removable now: bridge-heavy compatibility entry
- `publish/update/settlement-ui-bridge.js`
  - still installs `legacySettlement*` bridge helpers into the update registry
  - normalizes legacy settlement rows into the newer update UI shape
- `publish/update/generic-update-compat.js`
  - still remains in the runtime script list and should be treated as active compatibility surface until callers are proven retired

### 3. Not removable now: mixed UI/provider/runtime entry
- `publish/settings-actions.js`
  - still mixes settings UI/provider glue with runtime state handling
  - should be treated as a future split candidate, not a cleanup candidate

## Recommended next-step framing
Do not frame these files as "old code ready to delete".
Frame them as:
- active runtime entry still carrying real logic
- future responsibility-split targets
- delete only after callers and state ownership are migrated elsewhere

## Practical migration order
1. continue extracting pure view/state helpers out of these files
2. keep top-level files as compatibility or composition entries during migration
3. only remove a top-level entry after:
   - it leaves the script manifest
   - its state ownership moves elsewhere
   - its callers are proven retired
## Index settings duplication note
A duplicated early settings UI surface is still present inside `publish/index.html` around the older activation/settings area.
It currently overlaps with the newer section-based settings surfaces later in the same page, including:
- text provider/model controls
- draw provider/model controls
- PixAI-specific config fields

Practical implication:
- do not spend additional migration effort on the duplicated early block unless required for compatibility
- prefer migrating and stabilizing the later section-based settings surfaces
- after caller parity is verified, treat the older duplicated block as a cleanup candidate rather than a long-term target
