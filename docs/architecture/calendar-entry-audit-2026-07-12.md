# Calendar Entry Audit (2026-07-12)

This note records `publish/calendar-actions.js` as the next strong helper-first cleanup candidate after the first-pass role-card-loading cleanup.

## Why this file is a good next target
`publish/calendar-actions.js` already exposes a `calendarPanelView()` forwarding surface into:
- `publish/ui/calendar/view-helpers.js`

At the same time, it still keeps several clearly read-only/calendar-view-shaped helpers in the top-level entry.
This is a familiar cleanup pattern that matches earlier low-risk refactors.

## Current top-level responsibilities
### Keep in entry for now
These still belong near runtime state and interaction flow:
- `initCalendar()`
- `openCalendarApp()`
- `closeCalendarApp()`
- `addCalendarEvent(event)`
- `changeCalendarMonth(delta)`

### Likely read/helper candidates
These are the most promising candidates for a first low-risk extraction or forwarding pass:
- `allCalendarEvents()`
- `sortedCalendarEvents()`
- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`

## Existing helper foothold
The existing helper file already owns:
- `weekdayLabels()`
- `dayCellRows()`
- `panelView()`

Because `dayCellRows()` already depends on `this.calendarDays?.()`, the boundary is partially established.
That makes calendar a strong candidate for the next helper-first pass.

## Safer next-step strategy
1. Keep calendar state mutation and app open/close flow in `publish/calendar-actions.js`.
2. First move only readonly event/day/title formatting helpers.
3. Let `publish/ui/calendar/view-helpers.js` own more of the calendar display derivation.
4. Avoid combining this with event creation or month mutation changes in the same pass.

## Practical recommendation
Treat `publish/calendar-actions.js` as the best next top-level entry for another small, provable cleanup slice.
## 2026-07-12 addendum: post-first-pass assessment
After the first helper extraction pass, the remaining calendar helpers are less ideal for immediate further extraction.

### Why the next layer is less clean
The remaining notable read-side functions:
- `allCalendarEvents()`
- `sortedCalendarEvents()`

already sit closer to:
- state/data-source aggregation
- event-system composition
- externally exposed app-skill style read APIs

That makes them less presentation-pure than:
- `calendarMonthTitle()`
- `calendarDays()`
- `eventsForCalendarDay(day)`
- `formatCalendarTime(value)`

### Practical implication
The first calendar pass captured the highest-value low-risk display derivations.
A second immediate pass should not be forced unless a dedicated calendar read-model/helper boundary is introduced.

### Updated recommendation
- treat the current calendar line as a successful first-pass cleanup
- keep `allCalendarEvents()` / `sortedCalendarEvents()` in the top-level entry for now
- switch to the next candidate when looking for another helper-first refactor win
