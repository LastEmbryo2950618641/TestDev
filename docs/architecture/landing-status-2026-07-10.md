# Architecture Landing Status 2026-07-10

## Purpose

This document records the current state of the directory-normalization work so future sessions can continue from evidence instead of rediscovering the same boundaries.

It focuses on three things:

- which new directories already hold real runtime implementations
- which old files now act as compatibility forwarding layers
- which migration targets are the safest next candidates

## Current Landed Runtime Modules

### app layer

Real implementation modules currently landed under `publish/app/`:

- `publish/app/loading/startup-warmup.js`
- `publish/app/loading/deferred-init-flow.js`
- `publish/app/save/slot-flow.js`

Current responsibility groups:

- startup warmup orchestration
- deferred module/app initialization orchestration
- save slot open/load orchestration

### ui layer

Real implementation modules currently landed under `publish/ui/`:

- `publish/ui/loading/progress-view.js`
- `publish/ui/save/slot-view.js`
- `publish/ui/settings/view-helpers.js`
- `publish/ui/worldline/view-helpers.js`

Current responsibility groups:

- loading-stage display text and progress helpers
- save-slot display and selection helpers
- settings display/label helpers
- worldline view/selection/timeline helpers

### platform layer

Real implementation modules currently landed under `publish/platform/`:

- `publish/platform/keys/source.js`
- `publish/platform/body-figure/source.js`
- `publish/platform/storage/capabilities.js`
- `publish/platform/storage/backend.js`
- `publish/platform/storage/character-state-source.js`
- `publish/platform/storage/real-world-log-source.js`
- `publish/platform/storage/world-lore-source.js`

Current responsibility groups:

- key source access
- body figure resource access
- storage readiness checks
- storage backend execution
- character state read/write source
- real-world log read/write source
- world-lore read source

### domain layer

Real implementation modules currently landed under `publish/domain/`:

- `publish/domain/control/state.js`
- `publish/domain/control/link-rules.js`
- `publish/domain/control/link-state-helpers.js`
- `publish/domain/control/link-status-helpers.js`
- `publish/domain/control/control-patch-helpers.js`
- `publish/domain/control/online-control-helpers.js`

Current responsibility groups:

- control domain state access
- control rule judgment
- control-related patch building
- control/link helper calculations

## Current Compatibility Forwarding Layers

### Compatibility entries already in use

The following old files now primarily exist as compatibility or forwarding layers:

- `publish/loading-actions.js`
  - forwards startup warmup orchestration to `publish/app/loading/startup-warmup.js`
  - forwards deferred init orchestration to `publish/app/loading/deferred-init-flow.js`
  - forwards loading progress display helpers to `publish/ui/loading/progress-view.js`
- `publish/save-actions.js`
  - forwards save slot view helpers to `publish/ui/save/slot-view.js`
  - forwards save slot open/load orchestration to `publish/app/save/slot-flow.js`
- `publish/settings-actions.js`
  - forwards selected settings display helpers to `publish/ui/settings/view-helpers.js`
- `publish/worldline-actions.js`
  - forwards selected worldline view helpers to `publish/ui/worldline/view-helpers.js`
- `publish/control-state.js`
  - forwards to `publish/domain/control/state.js`
- `publish/platform-key-source.js`
  - forwards to `publish/platform/keys/source.js`
- `publish/platform-body-figure-source.js`
  - forwards to `publish/platform/body-figure/source.js`

### Compatibility pattern already validated

The currently validated migration pattern is:

1. create real implementation under the target directory
2. keep the old entry file
3. change the old file into a thin forwarding shell
4. keep broader runtime behavior unchanged

This pattern has now been validated for:

- app layer
- ui layer
- platform layer
- domain layer

## Current High-Level Split

The runtime architecture is beginning to take shape as:

- `app/` for orchestration
- `domain/` for rules and business logic
- `platform/` for environment/storage/resource access
- `ui/` for display and interaction-facing derived values
- `shared/` still available for cross-layer generic helpers, but not yet heavily used as a landing zone

## Safest Next Migration Candidates

### app candidates

These are good next candidates for future `publish/app/` landings because they are orchestration-heavy:

- desktop module readiness orchestration from `publish/loading-actions.js`
- selected save/restore sequencing around `publish/storage.js` if isolated from backend details
- focused real-world action orchestration slices that mainly sequence existing modules

### ui candidates

These are good next candidates for future `publish/ui/` landings because they are display/interaction-heavy:

- additional clean settings display helpers adjacent to already-migrated ones
- save/rpg panel display formatting helpers if isolated from persistence writes
- small worldline display helper batches only when kept separate from data/write logic

### domain candidates

These are good next candidates for future `publish/domain/` landings because they are rule-heavy:

- additional control-related rule helpers still left in orchestration files
- result/settlement patch or metric-calculation helpers if they can be isolated from persistence and UI

### platform candidates

These are good next candidates for future `publish/platform/` landings because they are source/adapter-heavy:

- any remaining storage-adjacent read models
- future native shell bridges for exe/apk
- capability guards that still read raw platform state directly

## Current Cautions

- do not treat every old file as a migration target at once
- do not move files only for cosmetic directory purity
- do not remove forwarding layers too early
- do not mix gameplay changes with directory migration in the same step
- do not let `shared/` become a dumping ground for unclear responsibilities
- for adjacent helper clusters in legacy files, prefer whole-cluster rebuilds over repeated tiny replacements once duplication appears

## Recommended Next Batch

If continuing with the same low-risk strategy, the best next batch is:

1. choose one more small `app/` landing from desktop/module readiness orchestration
2. choose only a clean `ui/` helper cluster after structural verification, not from recently repaired unstable zones
3. only after that revisit larger legacy files for deeper structural work

## Current Conclusion

The project is no longer only planning a normalized directory structure.

It already has real landed implementations in `app/`, `ui/`, `platform/`, and `domain/`, plus validated compatibility-shell patterns.

That means future work should prefer expanding these landed zones rather than inventing new ad-hoc root-level files.
