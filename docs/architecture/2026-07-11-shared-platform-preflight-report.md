# 2026-07-11 Shared Platform Preflight Report

## Scope
- Turn the existing platform capability registry into a reusable preflight report for desktop and mobile host readiness.
- Keep the report as a consumer of registry data rather than a new source of platform truth.
- Surface actionable gaps toward future `exe` and `apk` host packaging without changing gameplay modules.

## New artifacts
- `publish/platform/platform-preflight-report.js`
- `desktop/shell/platform-preflight-report-entry.js`
- `mobile/shell/platform-preflight-report-entry.js`
- `desktop/shell/platform-preflight-report-parity-verify.js`

## Report outputs
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `readiness.runtime`
- `readiness.storage`
- `readiness.host`
- `readiness.files`
- `readiness.assets`
- `readiness.keys`
- `missing[]`
- `nextActions[]`
- `evidence.rendererEntry`
- `evidence.storageChannel`
- `evidence.preferredBridge`
- `evidence.filesChannel`
- `evidence.assetsChannel`
- `evidence.assetBasePath`
- `evidence.keysChannel`
- `readyForHostPackaging`

## Verification command
- `node desktop/shell/platform-preflight-report-parity-verify.js`

## Verification result
- Desktop can emit a preflight report from its platform capability registry.
- Mobile can emit a matching preflight report from its platform capability registry.
- Parity confirms:
  - same report runtime family
  - shell-local-only preservation
  - no gameplay module mutation
  - readiness/missing/next-action shapes present on both platforms

## Why this matters
- The project now has a top-level readiness artifact instead of only layered capability definitions.
- This makes the current distance to real desktop/mobile host packaging much easier to inspect and prioritize.
- Future packaging work can consume the preflight report directly instead of rediscovering readiness state from many files.

## Constraint preserved
- No gameplay module in `publish/*` was rewritten to consume this report.
- The registry and the underlying shared contracts remain the source inputs; the report is only a derived layer.

## Recommended next follow-up
- Add a browser fallback registry/report so non-shell runs can be inspected in the same shape.
- Then generate a written desktop/mobile packaging gap report from the preflight output as the next handoff artifact.
