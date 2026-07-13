# 2026-07-11 Shared Assets Capability Contract Extraction

## Scope
- Extract the smallest shared assets capability contract that desktop and mobile shell bridges can both report into.
- Reuse the existing browser body-figure asset source as the fallback reference instead of rewriting asset gameplay logic.
- Extend the central platform capability registry so assets become part of the unified platform summary.

## New artifacts
- `publish/platform/assets-shared-capability-contract.js`
- `desktop/shell/shared-assets-capability-contract-entry.js`
- `mobile/shell/shared-assets-capability-contract-entry.js`
- `desktop/shell/shared-assets-capability-contract-parity-verify.js`
- `desktop/shell/platform-capability-registry-assets-parity-verify.js`

## Shared assets capability fields
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `channel`
- `assetBasePath`
- `capabilities.ready`
- `capabilities.canLoadIndex`
- `capabilities.canSaveMeta`
- `capabilities.canSaveImage`
- `methods`
- `fallback.browserCore`
- `checkpoints`

## Registry impact
- `contracts.assets`
- `summary.assetsReady`
- `summary.assetsChannel`
- `summary.assetBasePath`
- `checkpoints.assetsPresent`
- `checkpoints.hostKindAlignedWithAssets`

## Verification commands
- `node desktop/shell/shared-assets-capability-contract-parity-verify.js`
- `node desktop/shell/platform-capability-registry-assets-parity-verify.js`

## Verification result
- Desktop assets bridge can map into a shared assets capability contract.
- Mobile assets shell can report a compatible assets contract while remaining stubbed.
- The central platform registry now aggregates assets alongside runtime/storage/host/files.
- Parity confirms registry alignment remains intact after adding assets.

## Why this matters
- Asset capability reporting now follows the same shared-contract pattern as the rest of the platform surface.
- Future body-figure tooling, image persistence, and asset indexing can evolve behind this contract without spreading platform checks into gameplay modules.
- The platform registry is now closer to being a useful top-level capability map for packaging and host diagnostics.

## Constraint preserved
- No body-figure gameplay asset flow in `publish/platform/body-figure/source.js` was rewritten.
- No real desktop/mobile asset host implementation was forced in this extraction.

## Recommended next follow-up
- Add keys shared contract and plug it into the registry.
- Then consider whether the registry should expose a browser fallback snapshot for non-shell environments.
