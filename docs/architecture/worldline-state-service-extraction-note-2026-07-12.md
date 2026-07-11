# Worldline State Service Extraction Note (2026-07-12)

This note records the first state-service extraction pass for `publish/worldline-actions.js`.

## What changed
A new worldline state service was introduced at:
- `publish/domain/worldline/state-service.js`

The following methods were moved behind that service boundary while keeping the legacy public surface stable:
- `realWorldline()`
- `loreWorldline(lore)`
- `appendWorldlineEvent(line, event, prefix)`
- `updateWorldlineFromTurn(result)`

`publish/worldline-actions.js` now delegates those methods into `window.GameModules.domain.worldline.stateService`.

## Why these methods were grouped first
These methods form the clearest state-oriented write/read cluster inside the legacy file:
- `realWorldline()` synthesizes worldline state from reality-side logs and stored worldline state
- `loreWorldline(lore)` resolves and hydrates lore worldline state
- `appendWorldlineEvent(line, event, prefix)` performs plot-assignment integration for a worldline event
- `updateWorldlineFromTurn(result)` mutates and persists worldline state after a turn

Together they define the beginning of a real worldline state/service boundary.

## What did not move yet
The following methods were intentionally left in `publish/worldline-actions.js` for now:
- `worldlinePlots(lore)`
- `connectionWorldlineEvent(line, context)`
- `worldlineFactions(lore)`
- `factionAttrs(faction)`
- `factionRelations(faction)`
- app open/close methods
- display helper forwarding methods

## Why this pass stayed partial
A full extraction in one step would be riskier because worldline behavior currently spans:
- display derivation
- state hydration
- plot assignment integration
- event formatting
- app panel state

Moving all of that at once would make it harder to prove that gameplay and narrative continuity remained unchanged.
This pass instead extracts the clearest state cluster first while preserving the existing public store surface.

## Why `appendWorldlineEvent(...)` moved but `worldlinePlots(...)` did not
`appendWorldlineEvent(line, event, prefix)` belongs directly to the same write path as `updateWorldlineFromTurn(result)`:
1. build or detect the current worldline event
2. assign that event into plot-state tracking
3. persist the updated lore worldline

By contrast, `worldlinePlots(lore)` still behaves more like a read/query facade over `window.GameModules.worldlinePlots.items(...)`.
That makes it a weaker candidate for the state service and a better temporary fit as a lightweight compat query surface.

## Architectural effect
Before this pass:
- `publish/worldline-actions.js` mixed view-forwarding, state hydration, state mutation, plot assignment integration, and app-surface state

After this pass:
- the file still exists as a legacy compat/orchestration surface
- a real state-service boundary now exists for the core worldline state path
- the turn-update and plot-assignment write chain is now grouped in one service layer
- future migration can proceed by moving adjacent worldline responsibilities toward explicit homes instead of keeping them inside one legacy file

## Why this matters for the broader refactor
This is the first migration sample that moves beyond thin facade cleanup and into service-boundary creation.
That matters because long-term multi-platform reuse depends not only on thinner UI wrappers, but also on isolating gameplay/runtime state logic from legacy entry files.

## Next safe step
1. evaluate whether `worldlinePlots(lore)` should remain a lightweight compat wrapper or move closer to worldline plot query helpers
2. evaluate whether faction/worldline formatting methods belong in a dedicated query/format surface
3. keep caller names stable until the service boundary proves safe through more extraction passes
