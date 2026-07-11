# Android Asset Sync Contract Gap Note (2026-07-12)

This note records the current behavior and remaining contract gaps for the Android shared-runtime asset sync flow.

## Current verified contract
### Source and target
- source root: `publish/`
- target root: `mobile/android-webview-shell/app/src/main/assets/publish/`

### Current copied scope
Based on `mobile/shell/android-webview-asset-sync-plan.js`, the sync plan currently copies:
- `publish/index.html`
- `publish/boot/`
- `publish/assets/`
- `publish/domain/`
- `publish/ui/`

### Current runtime expectation
- Android host runtime loads `file:///android_asset/publish/index.html`
- build/report tooling expects the synced runtime entry to exist before normal Android execution flow

## What is good about the current contract
- shared gameplay/runtime logic remains rooted in `publish/`
- Android host shell adapts around shared runtime rather than forking gameplay logic
- copied scope is explicit instead of relying on an uncontrolled full-directory mirror
- sync flow is scriptable and therefore partially reproducible

## Current contract gaps
### Gap 1: no stale-file cleanup policy
`mobile/shell/android-webview-asset-sync.js` copies files and directories, but does not remove files that no longer exist in `publish/`.

Impact:
- stale mirrored files may remain in `app/src/main/assets/publish/`
- Android packaging input can drift away from the current shared runtime
- later cleanup decisions become harder because presence alone does not prove freshness

### Gap 2: no freshness or hash-based verification
Current verification checks target existence and successful copy flow, but not whether target contents exactly match current source contents.

Impact:
- sync may look healthy while still carrying outdated mirrored files
- future audits cannot rely on existence-only verification as proof of parity

### Gap 3: repo policy for mirrored assets is not finalized
The current repository still shows untracked mirrored Android assets.

This means the project has not yet finalized whether the mirrored asset tree should:
- stay versioned
- stay untracked but be materialized locally
- be recreated only during packaging/build steps

### Gap 4: generated-record policy is not finalized
These files are still under review:
- `mobile/android-webview-shell/.last-asset-sync.json`
- `mobile/android-webview-shell/.last-build-attempt.json`

They are useful evidence records, but they are likely local/generated rather than long-term source artifacts.

## Safe conclusions for now
1. The sync flow is already good enough to support Android host assembly around the shared runtime.
2. The synced asset tree is reproducible in principle, but not yet strongly freshness-safe.
3. The mirrored tree should not be treated as authoritative source code.
4. The mirrored tree also should not be broadly ignored or deleted until stale cleanup and repo-materialization policy are formalized.

## Recommended next hardening steps
1. Add optional stale-target cleanup mode to the sync flow.
2. Add parity verification for key copied paths, not just existence checks.
3. Decide whether `app/src/main/assets/publish/` is:
   - committed packaging input
   - locally materialized sync output
   - build-time generated artifact
4. Decide whether `.last-asset-sync.json` and `.last-build-attempt.json` should move under ignore rules as local run evidence.

## Recommended policy order
1. First harden the sync contract.
2. Then decide repo tracking policy for mirrored assets.
3. Only after that, expand ignore rules or perform cleanup around Android mirrored runtime trees.
