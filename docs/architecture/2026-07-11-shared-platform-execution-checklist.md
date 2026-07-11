# 2026-07-11 Shared Platform Execution Checklist

## Scope
- Convert the packaging gap report into an ordered execution checklist for desktop and mobile host implementation.
- Preserve the packaging gap report as the input layer so checklist steps remain derived rather than hand-maintained.
- Provide a stable handoff artifact for future real Electron or Android shell work.

## New artifacts
- `publish/platform/platform-execution-checklist.js`
- `desktop/shell/platform-execution-checklist-entry.js`
- `mobile/shell/platform-execution-checklist-entry.js`
- `desktop/shell/platform-execution-checklist-parity-verify.js`

## Checklist outputs
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `readyForHostPackaging`
- `steps[]`
- `totalSteps`
- `evidence`

## Step shape
- `key`
- `priority`
- `type`
- `action`
- `dependsOn[]`

## Verification command
- `node desktop/shell/platform-execution-checklist-parity-verify.js`

## Verification result
- Desktop can emit an execution checklist from its packaging gap report.
- Mobile can emit a matching execution checklist from its packaging gap report.
- Parity confirms:
  - same checklist runtime family
  - shell-local-only preservation
  - no gameplay module mutation
  - step/evidence shapes present on both platforms

## Why this matters
- The project now has a direct execution-oriented artifact that can guide future host integration work.
- This is more actionable than raw readiness or gap data alone and creates a clearer bridge from architecture work to implementation work.
- It helps future sessions continue with less rediscovery and lower coupling risk.

## Constraint preserved
- No gameplay module in `publish/*` was rewritten to consume or produce this checklist.
- The checklist remains derived from the packaging gap report and does not replace existing contract or registry boundaries.

## Recommended next follow-up
- Turn the desktop checklist into a concrete Electron implementation workstream.
- Turn the mobile checklist into a concrete WebView or Capacitor implementation workstream.
