# Worldline Compat Boundary Note (2026-07-12)

This note records the current stopping point for thinning `publish/worldline-actions.js` after the state-service and query-surface extraction passes.

## Current residual responsibilities in the legacy file
After the latest extractions, the remaining direct responsibilities in `publish/worldline-actions.js` are now primarily:
- `openWorldlineApp()`
- `closeWorldlineApp()`
- the compatibility method names that delegate into state/query/view layers

## Why `openWorldlineApp()` and `closeWorldlineApp()` should remain for now
These methods still behave like app-surface ownership rather than domain logic:
- they are called directly from `publish/index.html`
- they mutate desktop/app panel state
- they are closer to shell/view action behavior than to worldline domain state

Moving them prematurely would not meaningfully reduce domain coupling and would add avoidable rollout surface.

## Why the remaining compatibility methods are acceptable to keep
Methods such as:
- `realWorldline()`
- `loreWorldline(lore)`
- `worldlinePlots(lore)`
- `connectionWorldlineEvent(...)`
- `worldlineTurnEventId(...)`
- `worldlineSafeId(...)`
- `worldlineTurnDetail(...)`
- `appendWorldlineEvent(...)`
- `worldlineFactions(lore)`
- `factionAttrs(faction)`
- `factionRelations(faction)`

now mainly exist as stable public method names over already-extracted state/query/view layers.
That means the file is no longer a heavy mixed-logic owner; it is now mostly a compatibility shell plus app-surface open/close behavior.

## Practical conclusion
At the current stage, `publish/worldline-actions.js` is already close to the correct temporary end-state for safe migration:
- domain logic largely lives elsewhere
- UI derivation lives elsewhere
- state mutation lives elsewhere
- read/format query behavior lives elsewhere
- the top-level file still preserves caller stability

This is a good place to pause further thinning unless a broader store-surface migration is ready.

## Recommended next step
1. stage and submit the latest worldline query-surface consolidation pass as a small focused follow-up commit
2. avoid forcing additional movement out of `worldline-actions.js` unless caller migration off the legacy store surface is planned
3. shift attention toward the next highest-value legacy candidate only after this worldline sample is safely landed
