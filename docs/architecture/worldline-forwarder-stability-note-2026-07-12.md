# Worldline Forwarder Stability Note (2026-07-12)

This note records the current stability state of `publish/worldline-actions.js` after the recent state/query/view/domain extraction passes.

## Current conclusion

`publish/worldline-actions.js` is now materially closer to a stable compat shell than to a dense business-logic owner.

The file still owns a small amount of app-entry orchestration, but most worldline-specific read and assembly logic has already moved behind explicit forwarders.

## What now lives outside the action file

### State-oriented logic
- `realWorldline()` -> `publish/domain/worldline/state-service.js`
- `loreWorldline(lore)` -> `publish/domain/worldline/state-service.js`
- `appendWorldlineEvent(...)` -> `publish/domain/worldline/state-service.js`
- `updateWorldlineFromTurn(...)` -> `publish/domain/worldline/state-service.js`

### Query and format logic
- `worldlinePlots(lore)` -> `publish/domain/worldline/query-service.js`
- `connectionWorldlineEvent(...)` -> `publish/domain/worldline/query-service.js`
- `worldlineTurnEventId(...)` -> `publish/domain/worldline/query-service.js`
- `worldlineSafeId(...)` -> `publish/domain/worldline/query-service.js`
- `worldlineTurnDetail(...)` -> `publish/domain/worldline/query-service.js`
- `worldlineFactions(lore)` -> `publish/domain/worldline/query-service.js`
- `factionAttrs(faction)` -> `publish/domain/worldline/query-service.js`
- `factionRelations(faction)` -> `publish/domain/worldline/query-service.js`

### View-oriented logic
- debug section selection and open-state helpers -> `publish/ui/worldline/view-helpers.js`
- lore/timeline/plot/read-model shaping helpers -> `publish/ui/worldline/view-helpers.js`

## What still legitimately remains in the action file

- `openWorldlineApp()`
- `closeWorldlineApp()`
- the explicit forwarder functions that preserve old public method names

These remaining pieces are acceptable because they are entry/orchestration oriented rather than domain-specific logic owners.

## Practical implication

The next cleanup stage for worldline should not prioritize more tiny extractions from `publish/worldline-actions.js` by default.

Why:
- the remaining methods are already mostly forwarders
- further extraction pressure here is likely to produce low structural value compared with work on fatter legacy files
- the stronger need now is to preserve and document the stabilized boundary so later cleanup can safely identify what the action file still needs to keep

## Recommended future rule

If a future change touches `publish/worldline-actions.js`, prefer one of these paths first:

1. keep the action file as a compat shell and add the new logic directly to the correct state/query/ui layer
2. only add action-file code when the behavior is truly app-entry or orchestration behavior
3. avoid re-growing worldline formatting or query logic in the top-level action file

## Immediate practical conclusion

For the current migration phase, `publish/worldline-actions.js` should be treated as a relatively stable forwarder boundary rather than an urgent next extraction target.

