# Worldline Actions Facade Verification Note (2026-07-12)

This note verifies whether `publish/worldline-actions.js` is currently close to compat-facade status.

## File under review
- `publish/worldline-actions.js`

## Current structure
The file currently exports `window.GameModules.worldlineActions` and contains two distinct layers of behavior:
1. view/helper forwarding behavior
2. active worldline assembly and orchestration behavior

## Forwarding-oriented methods
The file defines a forwarder map that redirects the following methods into `publish/ui/worldline/view-helpers.js`:
- `selectWorldlineDebugSection()`
- `isWorldlineDebugSection()`
- `toggleWorldline()`
- `isWorldlineOpen()`
- `controlWorldLores()`
- `realWorldTag()`
- `realWorldLore()`
- `timelineItems()`
- `worldlineEventsNewestFirst()`
- `realWorldSummarizedPlots()`
- `selectRealWorldPlot()`
- `realWorldSelectedPlot()`
- `realWorldPlotEvents()`
- `realWorldRecordingEvents()`
- `timelineMeta()`

These methods are strong facade evidence because they appear to exist mainly as a compat access surface over the newer worldline view-helper module.

## Non-facade residue
The following methods still contain active logic and therefore are not pure facade behavior:
- `openWorldlineApp()`
- `closeWorldlineApp()`
- `realWorldline()`
- `loreWorldline(lore)`
- `worldlinePlots(lore)`
- `connectionWorldlineEvent(line, context)`
- `updateWorldlineFromTurn(result)`
- `worldlineTurnEventId(result)`
- `worldlineSafeId(value)`
- `worldlineTurnDetail(result)`
- `appendWorldlineEvent(line, event, prefix)`
- `worldlineFactions(lore)`
- `factionAttrs(faction)`
- `factionRelations(faction)`

Why these are not facade-only:
- `realWorldline()` assembles a synthetic reality-side worldline from live log/state inputs
- `updateWorldlineFromTurn(result)` mutates and persists worldline state through save infrastructure
- `appendWorldlineEvent(...)` coordinates plot assignment behavior
- faction/worldline formatting methods still depend on domain helper composition and runtime context
- app open/close methods still own UI state transitions for the worldline app surface

## Caller evidence
Current caller evidence shows:
- `publish/index.html` still uses worldline-facing methods such as `timelineItems(...)`, `timelineMeta(...)`, `openWorldlineApp()`, `closeWorldlineApp()`, and `realWorldTimelinePanelView()` via `$store.game`
- `publish/game.js` and `publish/remerge-game-store.js` still merge `gm.worldlineActions` into the live store/action surface
- `publish/ui/worldline/view-helpers.js` already owns a meaningful portion of derived display behavior

This means the file is still live, but only part of its live role is compat forwarding.
The rest still owns orchestration and runtime composition behavior.

## Current conclusion
`publish/worldline-actions.js` is not a pure facade candidate in the same way as `publish/wechat-view-actions.js`.
It is better described as a mixed legacy surface with:
1. a strong forwarding/display segment already extracted into `ui.worldline.viewHelpers`
2. a remaining orchestration segment that still owns real behavior

That makes it a useful first-tier verification sample because it demonstrates a more advanced migration stage than a simple all-forwarder wrapper, but it is not yet safe to classify as thin facade only.

## Safe next step
Do not delete or collapse the file yet.
The next safe move would be:
1. separate display-query forwarding from worldline-state orchestration more explicitly
2. identify whether `realWorldline()` and `updateWorldlineFromTurn(result)` belong in a dedicated worldline state/service surface
3. keep the existing forwarding methods as a compat layer while callers still resolve through `$store.game`
4. reassess the file only after orchestration behavior has a stable home outside this legacy entry surface
