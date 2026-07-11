# 2026-07-11 Shared Host Capability Contract Extraction

## Scope
- Extract the smallest shared host capability contract that desktop and mobile shell bridges can both report into.
- Preserve current browser and shell host behavior while only normalizing capability metadata.
- Keep platform-specific bridge logic in `desktop/shell/*` and `mobile/shell/*`.

## New artifacts
- `publish/platform/host/shared-capability-contract.js`
- `desktop/shell/shared-host-capability-contract-entry.js`
- `mobile/shell/shared-host-capability-contract-entry.js`
- `desktop/shell/shared-host-capability-contract-parity-verify.js`

## Shared host capability fields
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `environment.isDesktop`
- `environment.isMobile`
- `environment.isDev`
- `bridge.ready`
- `bridge.preferred`
- `bridge.channels`
- `features.files`
- `features.storage`
- `features.windowing`
- `features.webview`
- `features.notifications`
- `features.permissions`
- `fallback.browserCore`
- `checkpoints`

## Verification command
- `node desktop/shell/shared-host-capability-contract-parity-verify.js`

## Verification result
- Desktop host bridge can map its bridge/channel/feature metadata into the shared host capability contract.
- Mobile host bridge can report a compatible host capability contract with mobile-specific feature flags.
- Shared parity confirms:
  - same runtime family
  - shell-local-only preservation
  - no gameplay module mutation
  - shared bridge/feature shape presence on both platforms

## Why this matters
- Host capabilities now follow the same contract style as runtime and storage.
- This makes platform capability reporting more predictable for future packaging, diagnostics, and feature gating.
- It gives the project a cleaner base for adding files/assets/keys capability contracts next.

## Constraint preserved
- No `publish/game.js` or other gameplay entry file was modified for this extraction.
- Browser host detection in `publish/platform/host/browser.js` remains intact.

## Recommended next follow-up
- Extend the same shared contract style to files or assets.
- Then begin evaluating whether some capability registries can be assembled centrally without pushing host logic back into gameplay modules.
