# UI Save Slot View Phase 1 Validation

## Goal

Create a second concrete `publish/ui/` landing by moving save-slot display and selection helper logic into a dedicated UI-layer module, while preserving existing save flow behavior.

## New ui-layer module

Added:

- `publish/ui/save/slot-view.js`

This module now holds the real implementation for:

- `findEmptySlot()`
- `meta(slot)`
- `formatTime(value)`

These correspond to save-slot display and lightweight UI-facing helper behavior that previously lived directly in `publish/save-actions.js`.

## Why this belongs in ui/

These helpers are primarily presentation/interaction-facing:

- they shape displayed save-slot metadata
- they format save timestamps for the UI
- they help the UI choose an empty slot
- they do not perform storage backend access directly
- they do not define gameplay rules

That makes `publish/ui/` the correct landing zone.

## Compatibility strategy

The old methods remain in `publish/save-actions.js`, but they now forward to the ui-layer implementation:

- `findEmptySaveSlot()`
- `saveMeta(slot)`
- `formatSaveTime(value)`

This preserves current callers and keeps the migration low-risk.

## Manifest integration

The new UI module was added to `publish/boot/script-manifest.js` so it loads before the compatibility forwarding methods use it.

## Pattern reinforced

This phase reinforces the UI migration pattern already established by loading progress helpers:

1. choose pure display/interaction helpers
2. move the real implementation into `publish/ui/...`
3. keep old files as thin forwarding entries
4. avoid mixing save orchestration changes with UI extraction

## Result

`publish/ui/` now has more than one real landed module and is no longer just a single experimental landing point.
