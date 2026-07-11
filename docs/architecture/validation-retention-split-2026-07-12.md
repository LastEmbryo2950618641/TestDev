# Validation Retention Split (2026-07-12)

This note classifies the remaining `docs/plans/*validation*` files after the latest cleanup waves.

## Current count
- Remaining validation-like files in `docs/plans/`: 66

## Keep Tier A: Representative samples or still-useful execution anchors
These are the best candidates to keep visible because they either act as reusable validation examples or still pair naturally with active architecture/playbook docs.

- `docs/plans/_validation-template.md`
- `docs/plans/2026-07-10-ui-faction-overview-view-helpers-phase1-validation.md`
- `docs/plans/2026-07-10-ui-real-world-display-helpers-phase2-validation.md`
- `docs/plans/2026-07-11-event-display-refactor-cross-module-validation-plan.md`
- `docs/plans/2026-07-11-faction-display-refactor-cross-module-validation-plan.md`
- `docs/plans/2026-07-11-real-host-integration-roadmap-validation.md`
- `docs/plans/2026-07-11-multi-platform-track-completion-audit-validation.md`
- `docs/plans/2026-07-11-platform-core-shell-mapping-validation.md`
- `docs/plans/2026-07-11-platform-storage-local-settings-source-validation.md`
- `docs/plans/2026-07-11-platform-storage-sqlite-slot-source-validation.md`

## Review Tier B: Keep only while the matching thread is unfinished
These should be re-checked before deletion because they may still be the only compact record for an unfinished UI/platform/module thread.

### UI / module review cluster
- `2026-07-10-ui-loading-progress-view-phase1-validation.md`
- `2026-07-10-ui-real-world-log-view-helpers-phase1-validation.md`
- `2026-07-10-ui-save-slot-view-phase1-validation.md`
- `2026-07-10-world-lore-source-phase1-validation.md`
- `2026-07-11-calendar-panel-view-validation.md`
- `2026-07-11-save-slot-panel-view-validation.md`
- `2026-07-11-worldline-timeline-panel-view-validation.md`

### Company / event / faction review cluster
- `2026-07-11-company-apply-recruitment-stabilization-validation.md`
- `2026-07-11-company-contract-section-view-validation.md`
- `2026-07-11-company-employment-record-section-view-validation.md`
- `2026-07-11-company-field-reason-stabilization-validation.md`
- `2026-07-11-company-field-section-view-validation.md`
- `2026-07-11-company-organization-section-view-validation.md`
- `2026-07-11-company-prompt-context-stabilization-validation.md`
- `2026-07-11-company-resign-company-stabilization-validation.md`
- `2026-07-11-event-panel-view-and-actions-stabilization-validation.md`
- `2026-07-11-event-selected-detail-view-validation.md`
- `2026-07-11-faction-actions-syntax-stabilization-validation.md`
- `2026-07-11-faction-archive-section-view-validation.md`
- `2026-07-11-faction-change-log-section-view-validation.md`
- `2026-07-11-faction-overview-view-validation.md`
- `2026-07-11-faction-relation-section-view-validation.md`
- `2026-07-11-faction-structure-section-view-validation.md`

### Platform / mobile review cluster
- `2026-07-11-mobile-host-action-contract-validation.md`
- `2026-07-11-mobile-host-runner-draft-validation.md`
- `2026-07-11-mobile-runtime-structure-draft-validation.md`
- `2026-07-11-platform-assets-bodyfigure-core-entry-validation.md`
- `2026-07-11-platform-core-assembly-example-validation.md`
- `2026-07-11-platform-files-browser-implementation-validation.md`
- `2026-07-11-platform-files-core-skeleton-validation.md`
- `2026-07-11-platform-files-role-card-json-export-validation.md`
- `2026-07-11-platform-host-core-skeleton-validation.md`
- `2026-07-11-platform-keys-core-entry-validation.md`
- `2026-07-11-platform-storage-core-entry-validation.md`
- `2026-07-11-shell-skeleton-landing-validation.md`

## Cleanup Tier C: Best next-delete candidates
These are the next low-risk targets once one more pass is approved.

- `2026-07-11-desktop-mobile-runtime-parity-validation-checklist.md`
- `2026-07-11-desktop-role-card-json-export-handshake-validation.md`
- `2026-07-11-index-theme-bootstrap-platform-source-validation.md`
- `2026-07-11-multi-platform-shell-stub-validation.md`
- `2026-07-11-plans-template-stabilization-validation.md`
- `2026-07-11-readme-core-entry-stabilization-validation.md`
- `2026-07-11-requirements-template-stabilization-validation.md`
- `2026-07-11-safe-consumer-handshake-template-validation.md`
- `2026-07-11-settings-model-section-view-validation.md`
- `2026-07-11-settings-provider-section-view-validation.md`
- `2026-07-11-settings-readonly-view-consolidation-validation.md`
- `2026-07-11-settings-syntax-stabilization-validation.md`
- `2026-07-11-wechat-album-prompt-choice-view-validation.md`
- `2026-07-11-wechat-album-prompt-detail-view-validation.md`
- `2026-07-11-wechat-album-prompt-list-view-validation.md`
- `2026-07-11-wechat-list-panel-view-validation.md`
- `2026-07-11-real-world-map-actions-syntax-stabilization-validation.md`
- `2026-07-11-real-world-map-info-panel-view-validation.md`
- `2026-07-11-real-world-map-interior-panel-view-validation.md`
- `2026-07-11-real-world-map-shell-panel-view-validation.md`
- `2026-07-11-real-world-map-template-realignment-validation.md`

## Next recommendation
1. Keep Tier A as examples and active anchors.
2. Re-check Tier B only when the matching code thread is being touched.
3. If the next cleanup pass is approved, start from Tier C.
