# Refactor Progress 2026-07-10

## Goal Context

Current refactor work follows four hard constraints:

- keep gameplay logic unchanged
- reduce coupling and blast radius
- improve code reuse
- prepare gradual multi-platform reuse for Windows `exe` and Android `apk`

The strategy is still incremental extraction, not a rewrite.

## Established Extraction Pattern

A repeated pattern is now in use:

1. create the real implementation under a clearer boundary directory
2. keep the old entry file as a compatibility alias when needed
3. migrate callers in small, low-risk batches
4. document each batch with a plan and validation note

This pattern lowers migration risk and keeps old runtime load order stable.

## Current Boundary Status

### Control domain

Extracted under `publish/domain/control/`:

- `state.js`
- `link-rules.js`
- `link-state-helpers.js`
- `link-status-helpers.js`
- `control-patch-helpers.js`
- `online-control-helpers.js`

Current role of the old layer:

- `publish/control-link-actions.js` remains the orchestration layer
- `publish/control-state.js` is now a compatibility alias into the domain module

### Platform resource boundaries

Extracted under `publish/platform/`:

- `keys/source.js`
- `body-figure/source.js`

Compatibility files kept:

- `publish/platform-key-source.js`
- `publish/platform-body-figure-source.js`

### Platform storage boundaries

Extracted under `publish/platform/storage/`:

- `character-state-source.js`
- `real-world-log-source.js`

Current exposed capabilities:

#### characterStateSource

- `get(id)`
- `getByName(name)`
- `resolve(target)`
- `list()`
- `save(state)`

#### realWorldLogSource

- `append(entry)`
- `get(id)`
- `list(page, pageSize)`
- `saveAll(entries)`
- `count()`

## Rollout Progress

### Character state source adoption

Already migrated callers include:

- `publish/control-link-actions.js`
- `publish/character-profile-metric-sources.js`
- `publish/player-identity-actions.js`
- `publish/item-skill-actions.js`
- `publish/real-world-agent-memory.js`
- `publish/real-world-longing-actions.js`
- `publish/update/generic-update-applier.js`
- `publish/character-memory-flow.js`
- `publish/character-card-lexicon.js`
- `publish/company-faction-actions.js`
- `publish/inventory-actions.js`
- `publish/known-profession-actions.js`
- `publish/result-actions.js`
- `publish/real-world-settlement-actions.js`
- `publish/save-actions.js`
- `publish/wearing-sync-actions.js`
- `publish/wechat-actions.js`
- `publish/real-world-actions.js`

### Real-world log source adoption

Already migrated callers include:

- `publish/control-link-actions.js`
- `publish/solidify-actions.js`
- `publish/real-world-actions.js`
- `publish/real-world-agent-history.js`
- `publish/real-world-clock-actions.js`
- `publish/real-world-thinking-actions.js`
- `publish/real-world-agent-loop.js`
- `publish/real-world-stream-actions.js`

## Remaining Direct Persistence Callers

At the moment, the main remaining direct `sqliteSave` callers in the targeted storage categories are:

- `publish/entry-age.js`
- `publish/init/init-prompt-registry.js`
- `publish/predefined-role-cards.js`
- `publish/storage.js`

These are intentionally left for a later pass because they touch initialization, predefined bootstrap data, or legacy migration flow, which increases regression risk.

## Why This Matters For Multi-Platform Reuse

The more runtime modules depend on `platform/storage/*` and other `platform/*` boundaries, the easier later platform adaptation becomes:

- Windows `exe`: swap or wrap desktop storage/runtime capabilities behind platform sources
- Android `apk`: provide the same source contract from a mobile shell or bridge layer
- browser/dev server: keep the current implementation as the default platform backend

This does not finish cross-platform support by itself, but it reduces the amount of game logic that must know platform details.

## Recommended Next Cuts

Recommended next order:

1. migrate the remaining low-count initialization callers to `platform/storage` only if their startup behavior is first reviewed
2. review `publish/storage.js` legacy migration flow and decide whether it should become a dedicated migration boundary
3. continue extracting other platform-sensitive areas with the same pattern, especially persistence-adjacent or filesystem-adjacent modules
4. after boundary coverage improves, start defining a clearer `app / domain / platform / ui / shared` directory landing path for new code

## Current Caution

- do not big-bang move files just because new directories exist
- do not remove compatibility aliases too early
- do not treat PowerShell display garbling as proof of file corruption
- do not migrate risky initialization paths without first documenting the startup dependency chain
