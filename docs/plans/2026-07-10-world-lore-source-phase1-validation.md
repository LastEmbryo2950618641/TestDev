# World Lore Source Phase 1 Validation

## Goal

Create a dedicated source boundary for saved world-lore reads instead of routing that read through unrelated game modules or the generic storage backend adapter.

## Added boundary

New file:

- `publish/platform/storage/world-lore-source.js`

Current contract:

- `list()`

Current implementation remains a thin read-through to the existing storage engine:

- `sqliteSave.listWorldLores()`

## Caller migration

Updated `publish/game.js` so that:

- `savedWorldLores` now reads from `window.GameModules.platform.storage.worldLoreSource.list()`
- the existing storage-availability guard remains unchanged

## Manifest integration

The new source module was added to both relevant storage-boundary positions in `publish/boot/script-manifest.js`.

## Why a separate source was chosen

This read path is not a generic backend operation like slot open/save/delete.

It behaves more like a dedicated read model used by higher-level gameplay and context modules that consume `savedWorldLores`.

Keeping it as a separate source avoids turning the generic backend adapter into a catch-all bucket.

## Resulting storage-neighbor shape

At this stage, the storage-neighbor boundaries are now clearer:

- capability checks: `platform/storage/capabilities.js`
- generic backend execution: `platform/storage/backend.js`
- character-state reads/writes: `platform/storage/character-state-source.js`
- real-world-log reads/writes: `platform/storage/real-world-log-source.js`
- world-lore reads: `platform/storage/world-lore-source.js`

## Next recommended direction

The storage-side boundary work is now in a good enough shape to start shifting more attention toward directory landing-zone normalization and higher-level architectural layering, while only revisiting storage when a specific new platform need appears.
