# Shared Runtime Assembly Comparison (Web / Desktop / Android) (2026-07-12)

This note compares the current shared runtime assembly model across Web, Desktop, and Android so later architecture cleanup can standardize around evidence instead of assumptions.

## Common conclusion
Across all three current tracks, the shared gameplay/runtime source of truth is still the repository root `publish/` tree.

What differs today is not the source of truth, but the way each host assembles and loads that shared runtime.

## Assembly comparison table
### Web
- host runtime entry: `publish/index.html`
- assembly style: direct browser host entry
- source-of-truth relationship: host runs the root shared runtime directly
- host-specific layer: `publish/platform/browser-core.js` and related browser assembly helpers

### Desktop
- host runtime entry: packaged `publish/index.html`
- assembly style: packaging-time inclusion of root `publish/`
- source-of-truth relationship: desktop package includes the root shared runtime directly during packaging
- host-specific layer: `desktop/shell/` main/preload/bridge/packaging code

### Android
- host runtime entry: `file:///android_asset/publish/index.html`
- assembly style: sync/materialize selected shared-runtime paths into `app/src/main/assets/publish/`
- source-of-truth relationship: Android host runs a mirrored packaging tree generated from root `publish/`
- host-specific layer: `mobile/android-webview-shell/` + `mobile/shell/android-webview-asset-sync*.js`

## Current evidence
### Web evidence
`docs/architecture/web-index-safe-wiring-checklist-2026-07-11.md` confirms:
- `publish/index.html` is still the only true browser runtime entry
- Web remains the default shared runtime host
- browser platform assembly is being concentrated under `publish/platform/browser-core.js`

### Desktop evidence
`docs/architecture/desktop-shared-runtime-assembly-source-of-truth-2026-07-12.md` confirms:
- desktop packaging includes root `publish/` directly
- desktop does not currently maintain a desktop-local mirrored shared runtime tree
- desktop shell is host/bridge/packaging-only

### Android evidence
`docs/architecture/android-asset-mirror-source-of-truth-2026-07-12.md` confirms:
- Android mirrors shared runtime content into `app/src/main/assets/publish/`
- the mirrored tree is not the authoritative gameplay source
- Android host loads the mirrored asset entry at runtime

## What is already unified
1. Shared gameplay/runtime source-of-truth: root `publish/`
2. Architectural intent: host layers should adapt around shared runtime rather than fork gameplay logic
3. Multi-platform target shape: business/runtime logic should depend on shared platform contracts instead of host-specific internals

## What is still divergent
1. Materialization strategy
- Web: no extra materialization layer
- Desktop: packaging-time direct inclusion
- Android: pre-runtime sync/materialization into host assets

2. Freshness enforcement
- Web: direct host execution avoids mirror drift
- Desktop: package contents depend on packaging input selection
- Android: mirrored assets can drift without stronger sync/cleanup/parity policy

3. Repo hygiene impact
- Web: fewer host-side duplicated runtime artifacts
- Desktop: packaging outputs are artifact noise, but shared runtime is not duplicated under desktop source
- Android: mirrored runtime tree creates the highest risk of source-vs-mirror confusion

## Governance implication
The current architecture is already converging on a strong source-of-truth rule:
- edit shared runtime in `publish/`
- keep host-specific code in `publish/platform/`, `desktop/shell/`, and `mobile/*`
- avoid introducing second gameplay sources under host directories

The remaining convergence problem is mostly assembly-contract level, not gameplay-source level.

## Recommended next decision
Future assembly standardization should choose one of these directions:
1. Keep host-specific assembly differences, but formalize each contract strongly.
2. Move more hosts toward a shared build-time assembly contract.
3. Reduce Android mirror ambiguity by making materialization more reproducible and policy-driven.

## Recommended next implementation focus
The safest next technical focus is not gameplay refactor, but host assembly convergence work:
- stronger Android sync contract
- clearer desktop packaging verification
- eventual comparison of whether Android and desktop can share more build-time assembly logic without moving gameplay out of `publish/`
