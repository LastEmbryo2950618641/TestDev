# Android Asset Mirror Source-of-Truth Note (2026-07-12)

This note records the current source-of-truth status for `mobile/android-webview-shell/app/src/main/assets/publish/` so later cleanup and ignore decisions do not accidentally hide or delete required multi-platform runtime inputs.

## Conclusion
- The gameplay/runtime source of truth remains the repository root `publish/` tree.
- `mobile/android-webview-shell/app/src/main/assets/publish/` is currently a mirrored packaging tree produced from `publish/`.
- The mirrored tree is not the authoritative place to edit gameplay logic, UI helpers, prompt rules, or boot/runtime composition.
- The mirrored tree still matters because the Android host loads from it at runtime after packaging.

## Code evidence
### Shared runtime is copied into Android assets
`mobile/shell/android-webview-asset-sync.js` builds a copy plan and copies files/directories from the shared runtime into the Android shell asset directory.

Persisted sync evidence is written to:
- `mobile/android-webview-shell/.last-asset-sync.json`

### Verification expects copied Android asset targets
`mobile/shell/android-webview-asset-sync-verify.js` checks for copied targets such as:
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `mobile/android-webview-shell/app/src/main/assets/publish/boot`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets`

This confirms the Android asset tree is treated as sync output / packaging input rather than original authoring location.

### Android host loads the mirrored asset entry
`mobile/android-webview-shell/app/src/main/java/com/gamefy/shell/MainActivity.java` loads:
- `file:///android_asset/publish/index.html`

This proves the mirrored asset tree is part of the Android runtime assembly path.

## Documentation evidence
`mobile/android-webview-shell/README.md` states:
- shared runtime assets should stay under `publish/`
- run `node mobile/shell/android-webview-asset-sync.js` to copy the shared `publish/` runtime into `app/src/main/assets/publish/`

This matches the code path and confirms the intended architecture.

## Governance implication
### What this tree is
- packaging input for Android runtime assembly
- synchronized mirror of the shared web runtime
- not the long-term authoritative authoring location

### What this tree is not
- not a second independent gameplay runtime to evolve by hand
- not the primary source for gameplay code edits
- not safe to broad-ignore until packaging/source-of-truth policy is formalized further

## Safe policy for now
1. Treat root `publish/` as the source of truth for shared runtime edits.
2. Treat `app/src/main/assets/publish/` as generated-or-synced assembly input.
3. Do not manually implement gameplay changes only inside the mirrored Android asset tree.
4. Do not add a broad ignore rule for `app/src/main/assets/publish/` yet.
5. Before future cleanup, introduce a stricter sync policy or reproducible packaging contract that proves the mirror can always be regenerated.

## Recommended next step
The next safe move is to formalize the Android asset sync contract further:
- define exactly which `publish/` paths are copied
- decide whether stale mirrored files are cleaned during sync
- decide whether the mirrored tree should remain in the repo, be regenerated on demand, or be materialized only during packaging
