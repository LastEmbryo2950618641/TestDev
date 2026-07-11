# Worldline Entry Audit (2026-07-12)

This note records `publish/worldline-actions.js` as a higher-mixed but still viable helper-first top-level thinning candidate.

## Why worldline is still a useful next pass
- `publish/worldline-actions.js` contains a concentrated cluster of explicit forwarding methods into `publish/ui/worldline/view-helpers.js`.
- Unlike `event` and `company`, this file mixes those facades with real-world timeline assembly, lore loading, and worldline update flow, so the boundary is more sensitive.
- Even so, the facade cluster is visible enough that a first-pass forwarding consolidation remains low risk if the deeper write/update chain is left untouched.

## Keep in entry for now
- `realWorldline()`
- `loreWorldline(lore)`
- `worldlinePlots(lore)`
- `connectionWorldlineEvent(line, context)`
- `updateWorldlineFromTurn(result)`
- `worldlineTurnEventId(result)`
- `worldlineSafeId(value)`
- `worldlineTurnDetail(result)`
- `appendWorldlineEvent(line, event, prefix)`
- faction/event lookup and any persistence-linked flow

## Strong helper facade cluster
These methods were explicit view-helper facades and are now suitable for consolidated forwarding:
- `selectWorldlineDebugSection(name)`
- `isWorldlineDebugSection(name)`
- `toggleWorldline(lore)`
- `isWorldlineOpen(lore)`
- `controlWorldLores()`
- `realWorldTag()`
- `realWorldLore()`
- `timelineItems(lore)`
- `worldlineEventsNewestFirst(events)`
- `realWorldSummarizedPlots()`
- `selectRealWorldPlot(plotId)`
- `realWorldSelectedPlot()`
- `realWorldPlotEvents(plot)`
- `realWorldRecordingEvents()`
- `timelineMeta(item)`

## 2026-07-12 First facade consolidation landed
A first-pass worldline entry consolidation is now in place in `publish/worldline-actions.js`.

What changed:
- introduced a single `worldlineViewHelperForwarders` map
- introduced `callWorldlineViewHelper(name, context, ...args)`
- replaced repeated top-level one-line wrappers with one shared forwarding registration pass
- repaired pre-existing malformed display strings in `realWorldline()` so the file can pass syntax verification again

What intentionally did not change:
- real-worldline assembly structure
- lore loading and sqlite-backed lookup flow
- worldline update / append / persistence flow
- faction/event derivation and other mixed runtime logic

Why this is aligned with the broader refactor:
- makes the top-level entry thinner without changing gameplay behavior
- preserves `ui/worldline` as the display landing zone
- avoids mixing a helper cleanup pass with persistence or storyline mutation changes

Verification performed:
- `node --check publish/worldline-actions.js`
