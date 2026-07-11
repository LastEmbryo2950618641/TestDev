# AI Output Limit Accessor Note (2026-07-12)

This note captures the current role of `aiOutputLimitMode(kind)` and `aiOutputLimitMax(kind)` inside `publish/settings-actions.js`.

## Current role
These two methods are not pure display helpers.
They act as normalized accessors over `settingsState` and are shared by:
- settings UI templates in `publish/index.html`
- `publish/ui/settings/view-helpers.js`
- write-side setters:
  - `setAiOutputLimitMode(kind, mode)`
  - `setAiOutputLimitMax(kind, value)`

## Why they should not be moved to pure viewHelpers yet
- they call `ensureAiOutputLimitSettings()` to normalize state defaults
- they define the canonical read-side clamp/default logic for max token values
- `view-helpers.js` already depends on them when building rows and effective text

## Better framing
Treat them as:
- store-level normalized accessors
- shared read facade for both settings UI and view helpers
- not provider orchestration, but also not pure presentation helpers

## Practical implication
Do not move them into `publish/ui/settings/view-helpers.js` yet.
If they are refactored later, move them into a focused settings state helper module that can be consumed by both:
- `settings-actions.js`
- `ui/settings/view-helpers.js`
