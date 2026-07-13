# 2026-07-11 Shared Files Capability Contract Extraction

## Scope
- Extract the smallest shared files capability contract that desktop and mobile shell bridges can both report into.
- Preserve browser file helpers in `publish/platform/files/browser.js` and avoid rewriting current import/export behavior.
- Normalize capability flags and method metadata first, leaving platform implementations local.

## New artifacts
- `publish/platform/files/shared-capability-contract.js`
- `desktop/shell/shared-files-capability-contract-entry.js`
- `mobile/shell/shared-files-capability-contract-entry.js`
- `desktop/shell/shared-files-capability-contract-parity-verify.js`

## Shared files capability fields
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `channel`
- `capabilities.ready`
- `capabilities.canPickFile`
- `capabilities.canSaveFile`
- `capabilities.canReadText`
- `capabilities.canWriteText`
- `capabilities.canReadJson`
- `capabilities.canWriteJson`
- `methods`
- `fallback.browserCore`
- `checkpoints`

## Verification command
- `node desktop/shell/shared-files-capability-contract-parity-verify.js`

## Verification result
- Desktop files bridge can map its channel/capability metadata into a shared files contract.
- Mobile files shell can report a compatible files capability contract even while the bridge remains stubbed.
- Shared parity confirms:
  - same runtime family
  - shell-local-only preservation
  - no gameplay module mutation
  - shared method-shape presence on both platforms

## Why this matters
- Files capability reporting now follows the same shared-contract pattern as runtime, storage, and host capability.
- This creates a better base for future desktop import/export flows and mobile fallback design.
- It reduces the chance that future file-related features will scatter platform checks across gameplay modules.

## Constraint preserved
- No gameplay import/export implementation in `publish/platform/files/browser.js` was rewritten.
- No real host file bridge implementation was forced into desktop or mobile during this extraction.

## Recommended next follow-up
- Extend the same pattern to assets or keys.
- Then evaluate whether a central platform capability registry should be assembled from these shared contracts.
