# Settings Legacy Block Removal Checklist (2026-07-12)

This checklist defines the minimum evidence required before deleting the older duplicated settings block in `publish/index.html`.
Its goal is to keep cleanup low-risk and prevent accidental loss of gameplay or settings capability.

## Cleanup target
Target block:
- the earlier activation/settings area inside `publish/index.html`
- specifically the duplicated text/draw/settings controls that overlap with the later section-based settings app

Non-target for this checklist:
- `publish/settings-actions.js` itself
- dedicated `systemTestState.open` app surface
- provider/runtime orchestration logic

## Core rule
Do not delete the old settings block just because a newer UI exists.
Delete only after each duplicated capability has a verified replacement or is explicitly judged to be an unnecessary shortcut.

## Capability checklist
### Text provider/model fields
Verify all of the following are already available in the later section-based settings area:
- text provider selection
- DeepSeek base URL field
- DeepSeek API key field
- text model selection list

Status:
- replacement exists
- still requires spot-check when cleanup begins

### Draw provider/model fields
Verify all of the following are already available in the later section-based settings area:
- draw provider selection
- PixAI API Root field
- PixAI API Key field
- draw model selection list
- PixAI modelVersionId field
- PixAI mode field

Status:
- replacement exists
- still requires spot-check when cleanup begins

### Model actions and status
Verify all of the following remain available after old-block removal:
- load/fetch model catalog action
- test text model connection action
- connection/test status message rendering
- loading/error states around model operations

Status:
- newer section-based settings area already contains these surfaces
- removal should still confirm no hidden dependence on the old block remains

### System role test shortcut
Verify one of the following before deletion:
- the old settings-block system-test fragment is intentionally no longer needed, because the dedicated `systemTestState.open` app fully covers the workflow
- or an equivalent shortcut entry is intentionally preserved elsewhere

Status:
- dedicated app replacement exists
- remaining question is product/UX intent, not underlying capability loss

## Technical verification checklist
Before deleting the old block, verify:
- no unique input field remains only in the old block
- no unique button/action remains only in the old block
- no unique status/error/result rendering remains only in the old block
- no hidden Alpine `x-model`/`x-show` dependency relies on the old block staying mounted
- no settings action becomes unreachable from the intended UI flow

## Cleanup execution checklist
When cleanup starts:
1. remove only the duplicated old settings block slice
2. keep the later section-based settings app unchanged in the same commit unless a tightly related fix is required
3. run syntax validation on affected files
4. re-open the settings app and confirm:
   - text provider/model controls still work
   - draw provider/model controls still work
   - model list fetch still works
   - connection test still renders status
   - system role test remains reachable through its dedicated app

## Recommended deletion gate
The old settings block is ready for removal only when all of the following are true:
- duplicated field surfaces are confirmed in the later settings app
- duplicated action/status surfaces are confirmed in the later settings app
- system role test shortcut is explicitly judged optional or intentionally relocated
- no unique runtime behavior remains attached to the old block

## Current verdict
- technical duplication evidence: strong
- remaining blocker: explicit decision on whether the old system-test shortcut should survive as a shortcut
- cleanup readiness: close, but not automatic yet