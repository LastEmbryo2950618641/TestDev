# UI Loading Progress View Phase 1 Validation

## Goal

Create the first real `publish/ui/` landing example by moving loading-progress display logic into a UI-layer module, while preserving existing behavior and old call sites.

## New ui-layer module

Added:

- `publish/ui/loading/progress-view.js`

This module now holds the real implementation for display-oriented loading helpers:

- `stageText(status)`
- `formatDuration(ms)`
- `elapsedText(startedAt, finishedAt)`
- `stageElapsedLabel(startedAt, finishedAt)`
- `loadingProgressPercent()`
- `loadingProgressText()`
- `roleCardLoadingProgressPercent()`

## Why this belongs in ui/

These functions are UI-facing derived values:

- they format display text
- they compute progress percentages for presentation
- they do not mutate gameplay state
- they do not implement platform access
- they do not define gameplay rules

That makes `publish/ui/` the correct landing zone.

## Compatibility strategy

The old methods remain in `publish/loading-actions.js`, but they now forward to the ui-layer implementation.

This keeps current templates and callers stable while moving the real display logic into the new directory structure.

## Manifest integration

The new UI module was added to `publish/boot/script-manifest.js` so it loads before the compatibility forwarding methods use it.

## Pattern established

This phase establishes a reusable normalization pattern for UI-layer migration:

1. identify pure display/interaction helpers
2. move the real implementation into `publish/ui/...`
3. keep the old file as a compatibility forwarding entry
4. leave gameplay and platform logic untouched

## Result

This is the first concrete step that makes the `publish/ui/` directory part of the real runtime architecture instead of only a documented target.
