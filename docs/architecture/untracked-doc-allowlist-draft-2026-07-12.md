# Untracked Doc Allowlist Draft (2026-07-12)

This draft proposes which currently untracked documents are most worth promoting into version control first.

## Allowlist goals
- prioritize long-term reference value over one-off exploration logs
- prefer documents that still guide architecture, migration sequence, or platform integration decisions
- avoid bulk-staging every untracked note just to reduce noise

## Tier 1: strong candidates to track first
These appear most likely to keep shaping future work and handoff quality:
- `docs/architecture/host-integration-priority-2026-07-11.md`
- `docs/architecture/multi-platform-assembly-alignment-2026-07-11.md`
- `docs/architecture/web-core-desktop-mobile-shell-split-plan-2026-07-11.md`
- `docs/architecture/windows-host-placement-table-2026-07-11.md`
- `docs/architecture/android-host-api-mapping-table-2026-07-11.md`
- `docs/architecture/platform-core-assembly-examples-2026-07-11.md`
- `docs/architecture/desktop-mobile-runtime-parity-map-2026-07-11.md`
- `docs/architecture/desktop-mobile-unified-host-contract-parity-2026-07-11.md`
- `docs/architecture/local-settings-consumer-unification-2026-07-11.md`
- `docs/architecture/cross-module-view-contract-2026-07-11.md`

Why Tier 1:
- these titles suggest stable boundary, mapping, or integration knowledge rather than one-off test execution
- they are likely to remain useful across later desktop/mobile/shared implementation passes

## Tier 2: likely useful, but should be reviewed before staging
These may be worth tracking if their contents are still active and not duplicated elsewhere:
- `docs/architecture/browser-platform-assembly-safe-migration-2026-07-11.md`
- `docs/architecture/shared-platform-capability-registry.md` style contract notes
- `docs/architecture/shared-host-runtime-contract-extraction.md` and sibling shared contract extraction docs
- `docs/architecture/publish-directory-skeleton-phase1.md`
- `docs/architecture/safe-consumer-handshake-pattern-2026-07-11.md`
- `docs/architecture/web-desktop-mobile-track-note-2026-07-11.md`
- `docs/plans/2026-07-11-cross-module-view-contract-rollout.md`
- `docs/plans/2026-07-11-platform-core-contract-rollout.md`
- `docs/plans/2026-07-11-web-core-desktop-mobile-shell-rollout.md`
- `docs/plans/2026-07-11-real-host-integration-roadmap-validation.md`

Why Tier 2 is not immediate Tier 1:
- some may duplicate later summary documents
- some may be better merged into existing tracked overview/audit notes instead of staged as standalone files

## Tier 3: default to non-tracking unless explicitly needed
These are lower-priority because their names strongly suggest process noise, one-off probes, or narrow validation logs:
- files containing `skeleton`
- files containing `verify` or `verification`
- files containing `validation`
- files containing `quick`
- files framed as narrow execution snapshots rather than reusable rules

Examples from current untracked set:
- `docs/architecture/2026-07-11-desktop-electron-runtime-skeleton.md`
- `docs/architecture/desktop-storage-bridge-verify-draft-2026-07-11.md`
- `docs/plans/2026-07-11-mobile-runtime-entry-verification.md`
- `docs/plans/2026-07-11-worldline-timeline-panel-view-validation.md`

## Suggested next action
1. Review Tier 1 manually and confirm they are not duplicated by already tracked documents.
2. Stage Tier 1 only if the content is still active and referenced.
3. Merge or discard Tier 2 as needed instead of blindly tracking all of them.
4. Keep Tier 3 out of normal source commits unless a specific file becomes a real authority document.

## Current recommendation
The repository should adopt a small, high-signal allowlist first. Bulk-importing all untracked docs would likely reduce clarity rather than improve it.
