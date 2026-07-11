# Unified Host Assembly Contract Draft (Desktop / Android) (2026-07-12)

This draft defines the smallest shared assembly model that can describe both current desktop packaging inclusion and current Android asset materialization without changing gameplay source-of-truth.

## Purpose
The goal is not to force desktop and Android into the same implementation immediately.

The goal is to identify a common assembly contract shape so future multi-platform work can converge at the contract level first, then decide whether implementation details should also converge later.

## Shared assumptions
1. Root `publish/` remains the only shared gameplay/runtime source of truth.
2. Host-specific code lives outside `publish/`.
3. Hosts may materialize or include shared runtime differently, but should describe that process through a common contract vocabulary.
4. Business/runtime logic should not care whether a host used packaging inclusion or sync materialization.

## Minimum shared assembly contract
A host assembly contract should describe these fields.

### 1. sourceRoot
The authoritative shared runtime source root.

Current expected value:
- `publish`

### 2. hostKind
The host family consuming the shared runtime.

Current examples:
- `desktop`
- `mobile`

### 3. assemblyMode
How the shared runtime becomes available to the host runtime.

Current examples:
- `packaging-inclusion`
- `sync-materialization`

### 4. targetRuntimeRoot
Where the host expects the materialized or packaged shared runtime to exist.

Current examples:
- Desktop packaged app internal `publish/`
- Android `app/src/main/assets/publish/`

### 5. runtimeEntry
The runtime entry path or URL the host actually loads.

Current examples:
- Desktop packaged `publish/index.html`
- Android `file:///android_asset/publish/index.html`

### 6. includedPaths
Which shared-runtime paths are carried into the host assembly.

Current examples:
- Desktop: effectively full included `publish/**/*`
- Android: explicit selected scope from sync plan
  - `publish/index.html`
  - `publish/boot/`
  - `publish/assets/`
  - `publish/domain/`
  - `publish/ui/`

### 7. freshnessPolicy
How the host ensures its assembled runtime still reflects the current shared source.

Current examples:
- Desktop: packaging input selection at build time
- Android: sync + verify, now with parity checks and optional stale cleanup mode

### 8. hostAdapterLayer
Where host-only bridge/boot/preload/storage/files/host capability code lives.

Current examples:
- `desktop/shell/`
- `mobile/android-webview-shell/` + `mobile/shell/`

## How current hosts map into the contract
### Desktop mapping
- `sourceRoot`: `publish`
- `hostKind`: `desktop`
- `assemblyMode`: `packaging-inclusion`
- `targetRuntimeRoot`: packaged `publish/`
- `runtimeEntry`: packaged `publish/index.html`
- `includedPaths`: full `publish/**/*` via packaging config
- `freshnessPolicy`: build/package from current source tree
- `hostAdapterLayer`: `desktop/shell/`

### Android mapping
- `sourceRoot`: `publish`
- `hostKind`: `mobile`
- `assemblyMode`: `sync-materialization`
- `targetRuntimeRoot`: `mobile/android-webview-shell/app/src/main/assets/publish/`
- `runtimeEntry`: `file:///android_asset/publish/index.html`
- `includedPaths`: explicit sync plan scope
- `freshnessPolicy`: sync + parity verify + optional stale cleanup
- `hostAdapterLayer`: `mobile/android-webview-shell/` + `mobile/shell/`

## Why this contract is useful now
1. It keeps source-of-truth and host-assembly concerns separate.
2. It allows desktop and Android to stay implementation-different while still being architecture-comparable.
3. It creates a future landing zone for shared verification, planning, and assembly reports.
4. It reduces the chance that future work mixes gameplay refactor with host packaging decisions.

## Safe next implementation options
### Option A: shared contract docs and reports first
Create shared report/verify entry points that emit the same assembly contract shape for desktop and Android.

### Option B: converge verification before convergence of implementation
Keep desktop packaging and Android sync different, but verify both through a common assembly-report format.

### Option C: partial implementation convergence later
Only after contract/report parity is stable, evaluate whether desktop and Android can share more build-time assembly helpers.

## Current recommendation
The safest immediate move is Option B:
- keep current desktop packaging inclusion
- keep current Android sync materialization
- begin expressing both through one shared contract/report vocabulary

This preserves low coupling while still moving the project toward cleaner multi-platform reuse.
