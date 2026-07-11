# Shared Assembly Report Shape Draft (2026-07-12)

This draft defines the minimum JSON report shape that future desktop and Android assembly-report/verify flows should converge on.

## Purpose
The goal is to standardize reporting shape before standardizing implementation shape.

This keeps current host-specific assembly logic intact while making future verification, diffing, and governance much easier.

## Scope
This report shape is intended for host assembly state, not gameplay/runtime behavior.

It should describe:
- where shared runtime comes from
- how the host assembles it
- what the host loads
- whether assembly freshness looks healthy
- what blockers or next actions remain

## Minimum top-level fields
### runtimeFamily
Stable report family identifier.

Examples:
- `desktop-assembly-report`
- `android-assembly-report`

### hostKind
Host family name.

Examples:
- `desktop`
- `mobile`

### shell
Concrete host shell identity.

Examples:
- `desktop-electron-shell`
- `android-webview-shell`

### sourceRoot
Authoritative shared runtime source root.

Current expected value:
- `publish`

### assemblyMode
How the host makes shared runtime available.

Current examples:
- `packaging-inclusion`
- `sync-materialization`

### targetRuntimeRoot
Where the assembled runtime is expected to exist for the host.

Examples:
- packaged `publish/`
- `mobile/android-webview-shell/app/src/main/assets/publish/`

### runtimeEntry
Runtime entry path or URL actually used by the host.

Examples:
- packaged `publish/index.html`
- `file:///android_asset/publish/index.html`

### includedPaths
List or summary of shared-runtime paths included in the host assembly.

This may be:
- explicit path list
- or a summarized wildcard form plus evidence pointer

### freshness
Structured freshness/parity block.

Suggested fields:
- `mode`
- `ok`
- `details`
- `staleRisk`

Examples:
- Desktop: build/package input freshness status
- Android: sync parity + stale cleanup state

### checks
Boolean or structured checks relevant to assembly readiness.

Examples:
- runtime entry exists
- packaging config present
- sync succeeded
- wrapper available
- preload/main bridge files present

### blockers
List of current blockers preventing healthy host assembly.

Examples:
- `missing-local-properties`
- `placeholder-wrapper`
- `missing-packaging-config`

### evidence
Evidence pointers and path details used to support the report.

Examples:
- source paths
- config file paths
- generated output paths
- verification command outputs

### nextActions
Ordered suggested next steps.

## Suggested host-specific extensions
### Desktop-specific extension areas
- packaging target
- electron dist availability
- preload/main bootstrap readiness
- output artifact state

### Android-specific extension areas
- local.properties readiness
- gradle wrapper readiness
- sync parity status
- asset mirror cleanliness

## Why this shape is enough
This shape is intentionally small but covers the common assembly concerns already visible in both desktop and Android flows:
1. shared source root
2. host assembly mode
3. runtime entry
4. inclusion scope
5. freshness/health
6. blockers and next actions

That is enough to compare hosts without forcing identical tooling.

## Recommended first convergence step
Do not rewrite all existing report scripts at once.

Instead:
1. create one desktop report adapter that emits this shape
2. create one Android report adapter that emits this shape
3. verify field parity between the two adapters
4. only later decide whether to merge underlying implementation helpers

## Current recommendation
The safest next move is to add contract-shape adapters around existing host reports rather than replacing existing desktop/mobile verification entry points immediately.
