# Android Mirrored Asset Tracking Policy Draft (2026-07-12)

This draft defines the safest current tracking policy for `mobile/android-webview-shell/app/src/main/assets/publish/` and related Android mirror-side records.

## Why this policy is needed
The Android host currently depends on a mirrored packaging tree under `app/src/main/assets/publish/`, but the shared gameplay/runtime source of truth remains the repository root `publish/` tree.

Without an explicit policy, ordinary sync/verify work can leave confusing tracked or untracked changes in the Android mirror area and make later commits risky.

## Current facts
1. Root `publish/` is the authoritative shared runtime source.
2. Android host runtime loads `file:///android_asset/publish/index.html`.
3. Android asset sync copies selected shared-runtime paths into `app/src/main/assets/publish/`.
4. The mirror is packaging input for Android runtime assembly, but not the primary gameplay authoring location.
5. Sync/verify actions can update mirror-side files even when no Android-specific gameplay intent exists.

## Policy goal
Keep Android packaging viable without allowing the mirrored asset tree to behave like a second gameplay source or a constant source of accidental commit noise.

## Draft policy
### Rule 1: edit shared runtime only in root publish
Gameplay/runtime/UI/prompt/boot changes should be authored in:
- `publish/index.html`
- `publish/boot/`
- `publish/assets/`
- `publish/domain/`
- `publish/ui/`

They should not be authored only inside:
- `mobile/android-webview-shell/app/src/main/assets/publish/`

### Rule 2: treat mirrored assets as assembly-side materialization
The Android mirrored tree should be treated as:
- sync/materialization output for Android packaging
- assembly input consumed by the Android host
- derivative of the shared runtime source

It should not be treated as an independent runtime source tree.

### Rule 3: mirror-only diffs require intent before commit
If a change appears only under `mobile/android-webview-shell/app/src/main/assets/publish/`, do not stage it automatically.

Before commit, verify one of the following is true:
1. the mirror is intentionally being refreshed to match tracked shared-runtime source changes
2. Android packaging policy for mirrored assets explicitly requires the refreshed files to be versioned
3. the change belongs to an approved assembly-contract hardening step

Otherwise, the mirror-side diff should remain out of unrelated commits.

### Rule 4: sync/verify records should be treated separately from mirrored assets
These files should be governed as local/generated run evidence unless future policy says otherwise:
- `mobile/android-webview-shell/.last-asset-sync.json`
- `mobile/android-webview-shell/.last-build-attempt.json`

They should not be mixed into gameplay, runtime, or packaging-logic commits by default.

### Rule 5: local environment files stay under machine-local policy
These files should not be treated as shared gameplay/runtime source:
- `mobile/android-webview-shell/local.properties`
- `mobile/android-webview-shell/local.properties.generated`

They should be decided under local machine/toolchain policy, not mirrored-runtime policy.

## Commit guidance
### Safe to commit
- changes to root `publish/` shared runtime source
- Android shell code changes under `mobile/android-webview-shell/` or `mobile/shell/` that improve assembly behavior
- mirror-side updates only when they are intentionally included as part of an Android assembly/materialization decision

### Do not auto-commit
- mirror-only diffs with no explicit Android assembly intent
- `.last-asset-sync.json` or `.last-build-attempt.json` run artifacts
- local SDK/property files

## Recommended operational rule
When Android sync is run during validation:
1. verify whether mirror diffs simply track root `publish/`
2. keep those diffs out of unrelated commits unless the current task explicitly includes Android mirror materialization
3. if repeated mirror diffs become normal and expected, formalize whether the mirror tree should remain tracked or become reproducibly regenerated at packaging time

## Recommended next decision
The project should later make one explicit choice for `app/src/main/assets/publish/`:
1. tracked packaging input, refreshed intentionally and committed when source changes land
2. untracked/generated mirror, always rebuilt locally or in packaging flow
3. hybrid transitional policy with explicit refresh commits only at selected milestones

## Current recommendation
Until that final choice is made, the safest policy is:
- treat root `publish/` as the only gameplay/runtime source of truth
- treat Android mirrored assets as derivative assembly material
- do not let routine sync activity silently expand ordinary commits
