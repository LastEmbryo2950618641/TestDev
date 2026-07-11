# Android Mirror Tracking Policy Implementation Note (2026-07-12)

This note describes the safest future implementation shape for revisiting Android mirrored asset tracking policy.

## Purpose
Translate the current Class 2 evidence into a low-risk implementation boundary for any future mirror-policy change.

## Current proven facts
1. Root `publish/` remains the shared runtime source of truth.
2. `mobile/android-webview-shell/app/src/main/assets/publish/` is a mirrored Android runtime assembly input.
3. The current tracked diff on mirrored `index.html` is content-aligned with root `publish/index.html`.
4. The current visible diff should not be treated as proof of source divergence.

## What future implementation should optimize for
- reduce routine tracked noise from mirror refreshes
- preserve Android runtime assembly correctness
- avoid creating a second editable gameplay source
- keep sync/materialization behavior auditable

## Safe implementation boundary
### Allowed future focus
- mirror tracking policy
- sync/materialization workflow clarification
- validation around mirror parity
- evidence for whether tracked mirror files are reproducible on demand

### Explicitly avoid combining with
- gameplay/runtime logic edits under `publish/`
- Android host bridge implementation changes
- shared artifact tracking policy changes
- Class 3 local-only ignore changes

## Minimum proof required before stronger mirror-policy change
Before reducing or changing mirror tracking more aggressively, confirm all of the following:
1. root `publish/` remains the only authoritative edit surface
2. Android asset sync reliably materializes required runtime files
3. parity verification exists for the mirrored runtime entry and copied scopes
4. any required mirrored inputs can be regenerated predictably enough for the intended workflow

## Recommended implementation phases
### Phase 1: policy clarification only
Keep the current tracked mirror model, but rely on the documented evidence that current `index.html` diff is noise rather than source drift.

### Phase 2: sync contract hardening
Clarify copied scopes, stale-file handling, and parity expectations more strictly.

### Phase 3: tracking policy decision
Only after stronger sync guarantees exist, evaluate whether some mirrored files should remain tracked, be regenerated on demand, or move to a narrower packaging-input policy.

## Verification checklist for any future policy change
- Android host still resolves `file:///android_asset/publish/index.html`
- required mirrored runtime paths still exist after sync/materialization
- parity verification between root `publish/` and mirrored runtime entry still passes
- no contributor workflow depends on hand-editing mirrored gameplay files

## Current recommendation
Do not treat the current mirror diff as urgent corruption.
Treat it as evidence that mirror-policy work should focus on sync contract and tracking discipline rather than content repair.
