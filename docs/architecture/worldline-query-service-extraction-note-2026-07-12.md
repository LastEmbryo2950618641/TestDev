# Worldline Query Service Extraction Note (2026-07-12)

This note records the first query/format extraction pass for `publish/worldline-actions.js`.

## What changed
A new worldline query service was introduced at:
- `publish/domain/worldline/query-service.js`

The following methods were moved behind that query boundary while keeping the legacy public surface stable:
- `worldlineFactions(lore)`
- `factionAttrs(faction)`
- `factionRelations(faction)`

`publish/worldline-actions.js` now delegates those methods into `window.GameModules.domain.worldline.queryService`.

## Why these methods were grouped together
These methods already formed a natural read/query cluster:
- `worldlineFactions(lore)` reads faction data from a lore worldline
- `factionAttrs(faction)` formats faction attribute text
- `factionRelations(faction)` formats faction relation text

They are query/format behavior rather than state mutation behavior, so they do not belong in the worldline state service.

## Why `worldlinePlots(lore)` did not move in this pass
`worldlinePlots(lore)` is also read-oriented, but it already acts as a thin facade over the dedicated `window.GameModules.worldlinePlots.items(...)` module.
That existing query surface is already distinct enough that moving it again in the same pass would add churn without a strong architectural win.

## Architectural effect
Before this pass:
- `publish/worldline-actions.js` still mixed compat entry logic with faction query/format behavior

After this pass:
- `worldline-actions.js` is thinner
- faction-oriented read/format behavior now has an explicit query-service home
- the worldline module family is more clearly separated into:
  - state service
  - query service
  - view helpers
  - legacy compat entry surface

## Why this matters for the broader refactor
This pass strengthens the emerging pattern for domain cleanup:
- write behavior moves toward state services
- read/format behavior moves toward query services
- UI derivation stays in view helpers
- top-level legacy files remain as temporary compat facades until caller migration is safe

## Next safe step
1. evaluate whether `worldlinePlots(lore)` should stay as a lightweight facade or be mirrored into an explicit query-service wrapper later for consistency
2. evaluate whether `connectionWorldlineEvent(line, context)` belongs in a narrower formatter/query surface or should remain where it is
3. continue keeping caller names stable until more of the legacy entry surface has been proven unnecessary
