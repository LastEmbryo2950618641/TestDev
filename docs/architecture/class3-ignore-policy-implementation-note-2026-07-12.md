# Class 3 Ignore Policy Implementation Note (2026-07-12)

This note describes the safest future implementation shape for applying the current Class 3 ignore-policy draft.

## Purpose
Translate the Class 3 ignore-policy draft into a small, low-risk implementation workflow without mixing it with unrelated code, mirror, or artifact policy changes.

## Recommended implementation scope
### First-wave implementation candidates only
If the ignore change is eventually applied, start with only:
- `mobile/android-webview-shell/.last-asset-sync.json`
- `mobile/android-webview-shell/.last-build-attempt.json`
- `mobile/android-webview-shell/local.properties`
- `mobile/android-webview-shell/local.properties.generated`

### Explicitly defer for now
Do not include in the first actual ignore edit:
- `mobile/android-webview-shell/.artifacts/`
- `mobile/android-webview-shell/local.properties.example`
- `mobile/android-webview-shell/app/src/main/assets/publish/`
- `publish/platform/.artifacts/unified-platform-readiness.json`

## Why this first-wave scope is safest
1. It targets only machine-bound or run-bound files.
2. It does not affect source-of-truth runtime files.
3. It does not change Android mirror policy.
4. It does not change tracked shared artifact policy.
5. It preserves the durable onboarding example.

## Recommended implementation steps
1. Add the narrow ignore entries in the chosen ignore file.
2. Verify that `local.properties.example` remains visible and unchanged.
3. Verify that Android mirror files still appear normally when they genuinely differ.
4. Verify that tracked shared artifacts are still governed separately.
5. Keep the commit limited to ignore configuration only.

## Verification checklist
- `git status --short` no longer surfaces `.last-*` noise after the ignore change
- `git status --short` no longer surfaces machine-local `local.properties*` variants except the example file
- `mobile/android-webview-shell/local.properties.example` remains present and tracked as intended
- tracked Android mirror diffs are unaffected
- tracked shared readiness artifact diffs are unaffected

## What should not be combined with this change
1. gameplay or UI logic edits
2. Android asset mirror tracking policy edits
3. shared artifact tracking policy edits
4. desktop/mobile shell implementation edits
5. broad documentation cleanup passes

## Current recommendation
When the project is ready for the first real ignore-rule change, use this note to keep the rollout narrow and reversible.
That preserves low-coupling cleanup progress while avoiding accidental policy overreach.
