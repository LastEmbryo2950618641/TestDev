# Documentation Noise Triage (2026-07-12)

This note classifies the current untracked documentation and adjacent text artifacts into three buckets so later cleanup can proceed without mixing architecture work, host packaging work, and one-off process residue.

## Goal

Create a stable triage baseline for worktree cleanup so future small commits do not repeatedly pay the cost of re-evaluating the same documentation noise.

## Bucket A: Long-term keep

These files are strong candidates to remain visible because they still act as reusable plans, durable contracts, or boundary references.

### Architecture / contract style

- `docs/architecture/2026-07-11-shared-assets-capability-contract-extraction.md`
- `docs/architecture/2026-07-11-shared-files-capability-contract-extraction.md`
- `docs/architecture/2026-07-11-shared-keys-capability-contract-extraction.md`
- `docs/architecture/cross-module-display-migration-contract-2026-07-11.md`
- `docs/architecture/cross-module-view-contract-2026-07-11.md`
- `docs/architecture/temporary-backup-file-policy-2026-07-10.md`

### Plan / rollout style

- `docs/plans/2026-07-10-control-patch-helpers-phase1-plan.md`
- `docs/plans/2026-07-10-real-world-log-source-phase1-plan.md`
- `docs/plans/2026-07-11-compat-forwarder-gap-list.md`
- `docs/plans/2026-07-11-cross-module-view-contract-rollout.md`
- `docs/plans/2026-07-11-electron-thin-integration-handoff.md`
- `docs/plans/2026-07-11-high-risk-legacy-file-minimal-edit-strategy.md`
- `docs/plans/2026-07-11-index-html-encoding-stabilization.md`
- `docs/plans/2026-07-11-mobile-adapter-like-runtime-verification.md`
- `docs/plans/2026-07-11-mobile-runtime-entry-verification.md`
- `docs/plans/2026-07-11-mobile-runtime-like-integration-verification.md`
- `docs/plans/2026-07-11-mobile-unified-host-contract-verification.md`
- `docs/plans/2026-07-11-mobile-webview-like-runtime-verification.md`
- `docs/plans/2026-07-11-platform-core-contract-rollout.md`
- `docs/plans/2026-07-11-web-core-desktop-mobile-shell-rollout.md`

## Bucket B: Process noise

These files look more like one-off notes, validation artifacts, checklists, drafts, or transient reporting surfaces. They may still be useful short-term, but should not stay mixed with the long-term architecture surface forever.

### Host checklists / notes / drafts

- `desktop/docs/desktop-bootstrap-to-electron-api-checklist-2026-07-11.md`
- `desktop/docs/desktop-electron-replacement-checklist-2026-07-11.md`
- `desktop/docs/desktop-entry-integration-checklist-2026-07-11.md`
- `desktop/docs/desktop-ready-to-implement-checklist-2026-07-11.md`
- `mobile/docs/mobile-assembly-entry-upgrade-note-2026-07-11.md`
- `mobile/docs/mobile-runtime-entry-draft-2026-07-11.md`
- `mobile/docs/mobile-runtime-structure-draft-2026-07-11.md`

### Architecture-side one-off process artifacts

- `docs/architecture/2026-07-11-shared-platform-packaging-gap-report.md`
- `docs/architecture/2026-07-11-shared-platform-preflight-report.md`
- `docs/architecture/android-host-minimal-settings-raw-api-sketch-2026-07-11.md`
- `docs/architecture/android-live-toolchain-runbook-2026-07-12.md`
- `docs/architecture/bridge-adapter-stub-notes-2026-07-11.md`
- `docs/architecture/desktop-bootstrap-to-electron-api-note-2026-07-11.md`
- `docs/architecture/desktop-builder-electron-version-probe-note-2026-07-11.md`
- `docs/architecture/desktop-builder-package-json-delta-note-2026-07-11.md`
- `docs/architecture/desktop-electron-builder-install-impact-audit-2026-07-11.md`
- `docs/architecture/desktop-entry-integration-note-2026-07-11.md`
- `docs/architecture/desktop-ready-to-implement-note-2026-07-11.md`
- `docs/architecture/desktop-storage-bridge-formal-verify-script-sketch-2026-07-11.md`
- `docs/architecture/desktop-storage-bridge-minimal-landing-sketch-2026-07-11.md`
- `docs/architecture/desktop-storage-bridge-verify-draft-2026-07-11.md`
- `docs/architecture/electron-preload-minimal-settings-raw-api-sketch-2026-07-11.md`
- `docs/architecture/mobile-storage-bridge-formal-verify-script-sketch-2026-07-11.md`
- `docs/architecture/mobile-storage-bridge-minimal-landing-sketch-2026-07-11.md`
- `docs/architecture/mobile-storage-bridge-verify-draft-2026-07-11.md`
- `docs/architecture/multi-platform-track-audit-note-2026-07-11.md`
- `docs/architecture/stage-b-handshake-notes-2026-07-11.md`
- `docs/architecture/tracked-documentation-candidates-2026-07-12.md`
- `docs/architecture/web-desktop-mobile-track-note-2026-07-11.md`

### Validation-heavy plans and repair notes

Representative examples:

- `docs/plans/2026-07-10-ui-faction-overview-view-helpers-phase1-validation.md`
- `docs/plans/2026-07-10-ui-loading-progress-view-phase1-validation.md`
- `docs/plans/2026-07-10-ui-real-world-display-helpers-phase2-validation.md`
- `docs/plans/2026-07-10-ui-real-world-log-view-helpers-phase1-validation.md`
- `docs/plans/2026-07-10-ui-save-slot-view-phase1-validation.md`
- `docs/plans/2026-07-10-world-lore-source-phase1-validation.md`
- `docs/plans/2026-07-10-worldline-ui-repair-note.md`
- `docs/plans/2026-07-11-calendar-panel-view-validation.md`
- `docs/plans/2026-07-11-company-actions-syntax-stabilization-audit.md`
- `docs/plans/2026-07-11-company-apply-recruitment-stabilization-validation.md`
- `docs/plans/2026-07-11-company-field-reason-stabilization-validation.md`
- `docs/plans/2026-07-11-company-prompt-context-stabilization-validation.md`
- `docs/plans/2026-07-11-company-resign-company-stabilization-validation.md`
- `docs/plans/2026-07-11-desktop-mobile-transition-report.md`
- `docs/plans/2026-07-11-event-display-refactor-cross-module-validation-plan.md`
- `docs/plans/2026-07-11-event-panel-view-and-actions-stabilization-validation.md`
- `docs/plans/2026-07-11-faction-actions-stabilization-audit.md`
- `docs/plans/2026-07-11-faction-actions-syntax-stabilization-validation.md`
- `docs/plans/2026-07-11-faction-display-refactor-cross-module-validation-plan.md`
- `docs/plans/2026-07-11-faction-overview-view-validation.md`
- `docs/plans/2026-07-11-mobile-host-action-contract-validation.md`
- `docs/plans/2026-07-11-multi-platform-track-completion-audit-validation.md`
- `docs/plans/2026-07-11-platform-assets-bodyfigure-core-entry-validation.md`
- `docs/plans/2026-07-11-platform-core-shell-mapping-validation.md`
- `docs/plans/2026-07-11-platform-files-browser-implementation-validation.md`
- `docs/plans/2026-07-11-platform-files-role-card-json-export-validation.md`
- `docs/plans/2026-07-11-platform-keys-core-entry-validation.md`
- `docs/plans/2026-07-11-platform-storage-local-settings-source-validation.md`
- `docs/plans/2026-07-11-platform-storage-sqlite-slot-source-validation.md`
- `docs/plans/2026-07-11-real-host-integration-roadmap-validation.md`
- `docs/plans/2026-07-11-real-world-helper-backlog.md`
- `docs/plans/2026-07-11-save-slot-panel-view-validation.md`
- `docs/plans/2026-07-11-worldline-timeline-panel-view-validation.md`
- `docs/plans/_validation-template.md`

## Bucket C: Hold for later review

These items may still have value, but should be reviewed together with the matching implementation track instead of being bulk-cleaned now.

- `docs/architecture/2026-07-11-desktop-controlled-launch-executor-skeleton.md`
- `docs/architecture/2026-07-11-desktop-electron-runtime-skeleton.md`
- `docs/architecture/2026-07-11-desktop-explicit-electron-runtime-branch.md`
- `docs/architecture/2026-07-11-desktop-guarded-electron-bootstrap.md`
- `docs/architecture/2026-07-11-desktop-optional-electron-api-adapter.md`
- `docs/architecture/2026-07-11-desktop-optional-live-executor.md`
- `docs/architecture/browser-platform-assembly-safe-migration-2026-07-11.md`
- `docs/architecture/character-state-store-core-consumer-expansion-2026-07-11.md`
- `docs/architecture/character-state-store-coverage-expansion-2026-07-11.md`
- `docs/architecture/desktop-electron-builder-first-real-dry-run-result-2026-07-11.md`
- `docs/architecture/desktop-mobile-runtime-parity-map-2026-07-11.md`
- `docs/architecture/documentation-class-a-batch-one-proposal-2026-07-12.md`
- `docs/architecture/legacy-encoding-syntax-stabilization-backlog-2026-07-11.md`
- `docs/architecture/local-settings-consumer-unification-2026-07-11.md`
- `docs/architecture/platform-core-assembly-examples-2026-07-11.md`
- `docs/architecture/publish-directory-skeleton-phase1.md`
- `docs/architecture/real-world-map-actions-migration-backlog-2026-07-10.md`
- `docs/architecture/refactor-progress-2026-07-10.md`
- `docs/architecture/safe-consumer-handshake-pattern-2026-07-11.md`
- `docs/architecture/safe-stage-file-list-2026-07-12.txt`
- `docs/architecture/shell-assembly-map-2026-07-11.md`
- `docs/architecture/store-migration-coverage-tail-2026-07-11.md`
- `docs/architecture/store-migration-focus-sweep-2026-07-11.md`
- `docs/architecture/web-core-desktop-mobile-shell-split-plan-2026-07-11.md`
- `docs/architecture/windows-host-placement-table-2026-07-11.md`
- `mobile/README.md`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/figure_desc.txt`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/tmp.txt`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/tmp2.txt`

## Immediate next cleanup recommendation

The safest next cleanup batch is not deletion.
It is to use this triage file as the shared reference, then separately decide whether Bucket B should be:

1. archived under a dedicated process-history location,
2. reduced to a shortlist of representative files, or
3. removed once equivalent durable guidance exists elsewhere.

## Practical rule

Do not mix Bucket B cleanup with gameplay refactors or host runtime wiring in the same commit.
