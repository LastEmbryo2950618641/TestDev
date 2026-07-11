# 2026-07-11 Shared Storage Runtime Contract Extraction

## Scope
- Extract the smallest shared storage contract that desktop and mobile shell layers can both report into.
- Preserve browser gameplay storage logic in `publish/platform/storage/*` and avoid rewriting live save behavior.
- Normalize capability reporting and source-shape metadata first, leaving platform implementations local.

## New artifacts
- `publish/platform/storage/shared-runtime-contract.js`
- `desktop/shell/shared-storage-contract-entry.js`
- `mobile/shell/shared-storage-contract-entry.js`
- `desktop/shell/shared-storage-contract-parity-verify.js`

## Shared storage contract fields
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `channel`
- `capabilities.ready`
- `capabilities.canReadRaw`
- `capabilities.canWriteRaw`
- `capabilities.canRemoveRaw`
- `capabilities.canReadSettings`
- `capabilities.canWriteSettings`
- `sources.raw`
- `sources.settings`
- `fallback.browserCore`
- `checkpoints`

## Verification command
- `node desktop/shell/shared-storage-contract-parity-verify.js`

## Verification result
- Desktop storage bridge can map its channel/capabilities/source shape into a shared storage contract.
- Mobile shell can report a compatible storage contract even while its bridge remains mostly stubbed.
- Shared parity confirms:
  - same runtime family
  - shell-local-only preservation
  - no `publish/*` gameplay mutation
  - shared raw/settings source-shape presence on both platforms

## Why this matters
- The project now has a cross-platform storage contract candidate that can evolve separately from current browser save implementation.
- Desktop and mobile can improve their own storage bridges later without changing the shared contract shape each time.
- This creates a safer path for future save-slot, settings, and raw persistence alignment across `exe` and `apk` targets.

## Constraint preserved
- No gameplay save pipeline in `publish/platform/storage/backend.js` was rewritten.
- No sqlite/browser save logic was replaced during this extraction.

## Recommended next follow-up
- Extend the same contract style to host capabilities or files/assets reporting.
- Later, add real mobile storage bridge readiness behind the same shared storage contract without changing gameplay modules.
