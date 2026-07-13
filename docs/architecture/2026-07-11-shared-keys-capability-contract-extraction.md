# 2026-07-11 Shared Keys Capability Contract Extraction

## Scope
- Extract the smallest shared keys capability contract that desktop and mobile shell bridges can both report into.
- Reuse the existing browser key source as the fallback reference instead of rewriting gameplay-facing key lookup logic.
- Extend the central platform capability registry so keys become part of the unified platform summary.

## New artifacts
- `publish/platform/keys/shared-capability-contract.js`
- `desktop/shell/shared-keys-capability-contract-entry.js`
- `mobile/shell/shared-keys-capability-contract-entry.js`
- `desktop/shell/shared-keys-capability-contract-parity-verify.js`
- `desktop/shell/platform-capability-registry-keys-parity-verify.js`

## Shared keys capability fields
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `channel`
- `providerSources`
- `capabilities.ready`
- `capabilities.canReadDeepseekKey`
- `capabilities.canReadPixaiKey`
- `methods`
- `fallback.browserCore`
- `checkpoints`

## Registry impact
- `contracts.keys`
- `summary.keysReady`
- `summary.keysChannel`
- `checkpoints.keysPresent`
- `checkpoints.hostKindAlignedWithKeys`

## Verification commands
- `node desktop/shell/shared-keys-capability-contract-parity-verify.js`
- `node desktop/shell/platform-capability-registry-keys-parity-verify.js`

## Verification result
- Desktop keys bridge can map into a shared keys capability contract.
- Mobile keys shell can report a compatible keys contract while remaining stubbed.
- The central platform registry now aggregates keys alongside runtime/storage/host/files/assets.
- Parity confirms registry alignment remains intact after adding keys.

## Why this matters
- Keys capability reporting now follows the same shared-contract pattern as the rest of the platform surface.
- Future secure-store or native key delivery can evolve behind this contract without spreading provider logic into gameplay modules.
- The platform registry is now closer to a packaging-ready top-level capability map.

## Constraint preserved
- No browser key lookup flow in `publish/platform/keys/source.js` was rewritten.
- No real desktop/mobile secure key host implementation was forced in this extraction.

## Recommended next follow-up
- Add a browser-host registry snapshot so non-shell environments can report into the same top-level shape.
- Then use the registry as the basis for a host readiness / packaging preflight report.
