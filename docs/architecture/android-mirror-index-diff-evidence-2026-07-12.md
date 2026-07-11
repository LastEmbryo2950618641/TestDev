# Android Mirror Index Diff Evidence (2026-07-12)

This note records the current evidence for the tracked diff on `mobile/android-webview-shell/app/src/main/assets/publish/index.html`.

## Question
Is the current tracked diff evidence of real content drift from the shared source-of-truth, or only mirror-refresh/index-state noise?

## Compared files
- shared source: `publish/index.html`
- Android mirror: `mobile/android-webview-shell/app/src/main/assets/publish/index.html`

## Current evidence
### 1. content hash parity
Current SHA256 values are identical for both files.

### 2. no-index comparison
`git diff --no-index -- publish/index.html mobile/android-webview-shell/app/src/main/assets/publish/index.html`
produced no content diff output beyond line-ending warnings.

### 3. tracked diff behavior
`git diff -- mobile/android-webview-shell/app/src/main/assets/publish/index.html`
still reports a tracked diff relative to git index history.

## Current conclusion
The current worktree evidence supports this narrower conclusion:
- the Android mirror file is not currently drifting in content from the shared `publish/index.html` source
- the visible tracked diff is consistent with mirror-refresh/index-state noise rather than active source divergence

## What this does not prove
This does not by itself decide final tracking policy for mirrored Android assets.
It only proves that the current `index.html` worktree state is content-aligned with the shared source.

## Recommended next step
Use this evidence when revisiting Android mirror tracking policy.
Do not treat the current tracked diff alone as proof of real runtime-source divergence.
