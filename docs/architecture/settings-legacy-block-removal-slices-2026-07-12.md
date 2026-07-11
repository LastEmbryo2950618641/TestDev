# Settings Legacy Block Removal Slices (2026-07-12)

This note breaks the older duplicated settings block in `publish/index.html` into concrete cleanup slices.
It is intended to guide the first real deletion pass with low coupling and low rollback cost.

## Target region summary
The older duplicated settings block currently mixes:
- duplicated text/draw field controls
- duplicated model action/status controls
- duplicated or shortcut-style system test fragment
- additional status/summary/theme-adjacent content after the duplicated settings controls

## Slice A: Draw provider/model duplicated field block
Includes:
- draw provider selector
- PixAI API Root field
- PixAI API Key field
- draw model selector
- PixAI modelVersionId field
- PixAI mode field

Current replacement:
- later section-based settings app
- `drawProviderSectionView()`
- `drawModelSectionView()`

Removal readiness:
- high

Deletion risks to check:
- no hidden dependency on old `x-show` conditions
- later section-based PixAI fields still render correctly
- draw provider/model actions remain reachable only through the later settings app

## Slice B: Text model action/status block
Includes:
- fetch/load model catalog button
- test text model connection button
- connection/test status message

Current replacement:
- later settings app header action row and status message

Removal readiness:
- high

Deletion risks to check:
- later settings action row remains visible/open in normal settings flow
- loading / error / success states still render correctly

## Slice C: System role test shortcut fragment
Includes:
- old settings-block system test button
- old settings-block system test error/result snippet

Current replacement:
- dedicated `systemTestState.open` app surface later in `publish/index.html`

Removal readiness:
- medium

Why this slice is different:
- underlying capability already exists elsewhere
- but the old block may still be acting as an intentional shortcut entry

Deletion gate:
- only remove after explicitly deciding that the shortcut is unnecessary
- or preserve an intentional shortcut elsewhere before removal

## Slice D: Settings status summary line
Includes:
- the old settings-block summary paragraph showing current provider/model selections

Current replacement:
- later settings app already exposes section-level selections and summary-related helpers
- but exact UX parity should still be reviewed before deletion

Removal readiness:
- medium

Deletion risks to check:
- whether this summary still provides unique activation-page context
- whether a comparable summary is needed elsewhere

## Slice E: Theme and adjacent non-duplicated controls
Includes:
- content after the duplicated settings controls, such as theme-related controls in the same activation/settings region

Current replacement:
- not yet proven by the current settings duplication audit

Removal readiness:
- low / out of scope for the first deletion pass

Reason to defer:
- this content is adjacent to the duplicated block but is not yet proven to be duplicated
- removing it in the same pass would unnecessarily widen risk

## Recommended first deletion pass
Safest first pass should target only:
1. Slice A: draw duplicated field block
2. Slice B: text model action/status block

Optional in the same pass only if explicitly approved by checklist outcome:
3. Slice C: system role test shortcut fragment

Do not include in the first pass:
- Slice D unless summary parity is rechecked
- Slice E until a separate duplication audit exists

## Verification checklist per first pass
After removing Slice A and Slice B, verify:
- settings app still opens normally
- draw provider/model fields still render and save correctly
- PixAI fields still appear when provider is `pixai`
- model catalog load button still works in the later settings app
- connection test still works and still shows status

## Current recommendation
The best first real cleanup pass should begin with Slice A + Slice B only.
That keeps the write-side orchestration untouched while deleting the most clearly duplicated HTML.