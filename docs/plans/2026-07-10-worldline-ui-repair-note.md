# Worldline UI Migration Repair Note 2026-07-10

## What happened

During the first attempt to move worldline view helpers into `publish/ui/worldline/view-helpers.js`, the compatibility rewrite inside `publish/worldline-actions.js` became structurally corrupted.

Symptoms included:

- duplicated helper functions
- broken function boundaries
- mixed remnants of old and new helper bodies
- a damaged section before `connectionWorldlineEvent(...)`

## Repair action taken

The file was repaired by rebuilding the full helper section before `connectionWorldlineEvent(...)` into a clean, explicit forwarding structure.

The repaired `publish/worldline-actions.js` now cleanly separates:

- UI-facing compatibility forwarding helpers
- retained data/build logic (`realWorldline`, `loreWorldline`, `worldlinePlots`)
- downstream worldline write/update behavior

## Current forwarding helpers

`publish/worldline-actions.js` now forwards these helpers to `publish/ui/worldline/view-helpers.js`:

- `selectWorldlineDebugSection`
- `isWorldlineDebugSection`
- `toggleWorldline`
- `isWorldlineOpen`
- `controlWorldLores`
- `realWorldTag`
- `realWorldLore`
- `timelineItems`
- `worldlineEventsNewestFirst`
- `realWorldSummarizedPlots`
- `selectRealWorldPlot`
- `realWorldSelectedPlot`
- `realWorldPlotEvents`
- `realWorldRecordingEvents`
- `timelineMeta`

## Helpers intentionally kept local

These stayed in `publish/worldline-actions.js` because they still touch data retrieval or write flow and are not pure UI helpers:

- `realWorldline`
- `loreWorldline`
- `worldlinePlots`
- `ensureWorldline`
- `updateWorldlineFromTurn`
- worldline event/id/detail writers

## Safer migration rule learned

For future UI extraction from large legacy files:

1. do not rewrite many adjacent helpers using fragile string-wide replacements
2. prefer one small helper cluster per pass
3. keep data-source helpers local unless they are also being moved to a stable source boundary
4. if a compatibility section becomes structurally suspicious, stop and rebuild the whole cluster cleanly before continuing

## Result

The worldline UI migration is now back on a stable base and can continue later in smaller batches if needed.
