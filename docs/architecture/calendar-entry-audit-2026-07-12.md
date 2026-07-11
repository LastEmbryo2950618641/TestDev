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