# Desktop Android Assembly Parity Verify Draft (2026-07-12)

This note defines the first safe comparison rules for desktop and Android unified assembly reports.

## Comparison intent
The purpose is not to prove that desktop and Android are identical.

The purpose is to prove that both hosts conform to the same contract shape while allowing host-specific assembly differences where those differences are intentional.

## Fields that should match exactly
These fields represent contract-level alignment and should match exactly unless architecture policy changes:
- `sourceRoot`

Current expected shared value:
- `publish`

## Fields that should match by allowed set rather than exact equality
These fields intentionally differ by host, but should still remain within an approved value set.

### hostKind
Allowed values:
- desktop report: `desktop`
- Android report: `mobile`

### shell
Allowed values:
- desktop report: `desktop-electron-shell`
- Android report: `android-webview-shell`

### assemblyMode
Allowed values:
- desktop report: `packaging-inclusion`
- Android report: `sync-materialization`

### runtimeEntry
Allowed values:
- desktop report: `publish/index.html`
- Android report: `file:///android_asset/publish/index.html`

### targetRuntimeRoot
Allowed forms:
- desktop report: packaged `publish/`
- Android report: `mobile/android-webview-shell/app/src/main/assets/publish/`

## Fields that should satisfy shape/presence parity
These fields do not need equal values, but both reports should provide them in usable form:
- `includedPaths`
- `freshness`
- `checks`
- `blockers`
- `evidence`
- `nextActions`

Minimum expectations:
- `includedPaths` is present and non-empty
- `freshness.mode` is present
- `freshness.ok` is boolean
- `checks` is an object
- `blockers` is an array
- `evidence` is an object
- `nextActions` is an array

## Fields that may differ operationally
These fields are expected to differ because the hosts are at different implementation stages:
- specific blocker names
- specific readiness booleans
- toolchain details
- host-specific evidence payloads
- freshness detail internals

These differences should not fail parity if the contract shape remains intact.

## Recommended first verify outcome
The first parity verify should answer:
1. Do both reports exist and parse?
2. Do both reports conform to the shared top-level shape?
3. Does `sourceRoot` match exactly?
4. Are host-specific fields within their approved value sets?
5. Are shared structural fields present on both sides?

## Current recommendation
The first parity verify should be permissive about host-state readiness, but strict about contract shape.

That gives the project a stable comparison layer without blocking progress merely because desktop and Android are at different toolchain stages.
