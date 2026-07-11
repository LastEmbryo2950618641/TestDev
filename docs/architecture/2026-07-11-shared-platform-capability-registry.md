# 2026-07-11 Shared Platform Capability Registry

## Scope
- Aggregate the existing shared runtime, storage, host capability, and files capability contracts into one central platform registry.
- Preserve each contract as an independent unit while providing one shell-local summary surface per platform.
- Avoid pushing platform summary logic back into gameplay modules.

## New artifacts
- `publish/platform/shared-capability-registry.js`
- `desktop/shell/platform-capability-registry-entry.js`
- `mobile/shell/platform-capability-registry-entry.js`
- `desktop/shell/platform-capability-registry-parity-verify.js`

## Registry inputs
- shared host runtime contract
- shared storage runtime contract
- shared host capability contract
- shared files capability contract

## Registry outputs
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `contracts.runtime`
- `contracts.storage`
- `contracts.host`
- `contracts.files`
- `summary.runtimeReady`
- `summary.storageReady`
- `summary.hostReady`
- `summary.filesReady`
- `summary.rendererEntry`
- `summary.storageChannel`
- `summary.preferredBridge`
- `summary.filesChannel`
- `checkpoints.runtimePresent`
- `checkpoints.storagePresent`
- `checkpoints.hostPresent`
- `checkpoints.filesPresent`
- `checkpoints.hostKindAligned`

## Verification command
- `node desktop/shell/platform-capability-registry-parity-verify.js`

## Verification result
- Desktop can assemble a single registry from all current shared contracts.
- Mobile can assemble a matching registry from its own shared contracts.
- Parity confirms:
  - same registry runtime family
  - all expected contracts present on both platforms
  - shell-local-only preservation
  - no gameplay module mutation

## Why this matters
- The project now has a central capability summary surface for each platform.
- Future packaging, diagnostics, and feature gating can consume one registry instead of manually traversing multiple shell contracts.
- This is a stronger base for deciding which additional capabilities should join the registry next, such as assets or keys.

## Constraint preserved
- No gameplay module in `publish/*` was rewritten to consume this registry.
- Existing shared contracts remain independent and can still evolve separately.

## Recommended next follow-up
- Add assets and keys shared contracts, then plug them into this registry.
- After that, decide whether the registry should gain a browser-host entry for non-shell fallback inspection.
