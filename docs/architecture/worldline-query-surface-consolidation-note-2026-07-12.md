# Worldline Query Surface Consolidation Note (2026-07-12)

This note records a follow-up consolidation pass for the remaining read/format methods in `publish/worldline-actions.js`.

## What changed
The worldline query service was expanded so that `publish/worldline-actions.js` now delegates these additional methods into `publish/domain/worldline/query-service.js`:
- `worldlinePlots(lore)`
- `connectionWorldlineEvent(line, context)`
- `worldlineTurnEventId(result)`
- `worldlineSafeId(value)`
- `worldlineTurnDetail(result)`

The previously extracted faction-oriented query methods remain there as well.

## Why these methods fit the query surface
These methods are read/format/query oriented rather than state-mutation oriented:
- `worldlinePlots(lore)` reads plot summaries from the existing plot query module
- `connectionWorldlineEvent(...)` formats an event payload for use in worldline flows
- `worldlineTurnEventId(...)`, `worldlineSafeId(...)`, and `worldlineTurnDetail(...)` all derive formatted identifiers or text from runtime state

Although some of them may later move into a narrower formatter service, they already fit better in the query/format surface than in the legacy compat entry file.

## Architectural effect
After this pass, `publish/worldline-actions.js` is closer to a pure compatibility shell over:
- state service
- query service
- view helpers
- app open/close state

That gives the project a more complete example of how a legacy top-level file can be progressively hollowed out without changing public caller names.

## Next safe step
1. decide whether worldline formatting methods should remain inside the query service or move to a dedicated formatter facade later
2. reassess whether `openWorldlineApp()` and `closeWorldlineApp()` should remain here as app-surface ownership
3. keep verifying caller stability before considering deletion of any legacy entry file
