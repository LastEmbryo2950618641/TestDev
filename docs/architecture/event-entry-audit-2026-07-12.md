# Event Entry Audit (2026-07-12)

This note records `publish/event-actions.js` as the next strong helper-first cleanup candidate after the first-pass calendar cleanup.

## Why event is stronger than worldline for the next pass
`publish/event-actions.js` already exposes a concentrated cluster of explicit view-helper forwarding methods into:
- `publish/ui/event/view-helpers.js`

Compared with `worldline-actions.js`, the event entry shows a cleaner separation between:
- runtime state mutation / draft writing / event upsert flow
- readonly view labels / panel composition / selected-item presentation

That makes event a stronger next target for another low-risk, small-slice cleanup.

## Current top-level responsibilities
### Keep in entry for now
These still belong near runtime state and write-side behavior:
- `initEventSystem()`
- `openEventApp()`
- `closeEventApp()`
- `setEventTab(type)`
- `setEventRandomProbability(value)`
- `eventDraftValue(key)`
- `setEventDraft(key, value)`
- `addEventFromDraft()`
- `upsertEvent(raw, options)`
- event selection and persistence flow

### Strong helper/forwarding cluster already visible
These methods are already clearly UI-facing and therefore are good candidates for boundary tightening or consolidation:
- `eventTypeTabs()`
- `currentEventList()`
- `selectedEvent()`
- `eventMeta(event)`
- `eventStatusLabel(event)`
- `eventListEmptyText()`
- `eventStatusFieldLabel()`
- `eventTriggeredCountFieldLabel()`
- `eventHeaderDescription()`
- `eventProbabilityFieldLabel()`
- `eventBackButtonText()`
- `selectedEventEmptyText()`
- `selectedEventDetailView()`
- `eventPanelView()`

## Why this suggests a promising next pass
This file already resembles the earlier `settings-actions.js` state where:
- top-level entry still owns write-side and app-open logic
- a meaningful part of the file is already functioning as a UI-facing facade
- the existing `ui/.../view-helpers.js` file provides a clear landing zone

## Safer next-step strategy
1. Keep event creation, normalization, persistence, and mutation in `publish/event-actions.js`.
2. Review whether the existing explicit forwarding cluster can be further normalized the same way `settings-actions.js` was.
3. Avoid touching `upsertEvent()` / draft mutation / save flow in the same pass.

## Practical recommendation
Treat `publish/event-actions.js` as the best next candidate when looking for another:
- helper-first cleanup
- low-coupling refactor
- top-level entry thinning pass