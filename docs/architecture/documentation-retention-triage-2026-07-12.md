# Documentation Retention Triage (2026-07-12)

This note turns the current docs cleanup direction into an explicit keep / review / cleanup boundary so future sessions do not re-expand `docs/` blindly.

## Goal
- Preserve long-term architecture and collaboration knowledge
- Reduce process-noise in `docs/architecture/` and `docs/plans/`
- Keep validation evidence only where it still helps future implementation

## Keep Tier A: Long-Term Reference
These are the document types that should remain easy to discover at the root of `docs/architecture/` or `docs/plans/`.

### Architecture root should prefer
- workflow / rules / directory conventions
- boundary / contract / migration / playbook
- multi-platform overview / execution map / final handoff
- requirement audit / cleanup strategy / safe refactor rules
- representative module maturity or structure overview

Representative current examples:
- `docs/architecture/ai-development-workflow.md`
- `docs/architecture/encoding-collaboration-rules.md`
- `docs/architecture/project-structure.md`
- `docs/architecture/multi-platform-implementation-overview.md`
- `docs/architecture/multi-platform-execution-map-2026-07-12.md`
- `docs/architecture/legacy-cleanup-triage-2026-07-12.md`
- `docs/architecture/store-migration-playbook-2026-07-11.md`
- `docs/architecture/display-object-patterns-playbook-2026-07-11.md`
- `docs/architecture/module-migration-priority-ladder-2026-07-11.md`
- `docs/architecture/requirement-audit-2026-07-12.md`

### Plans root should prefer
- actual implementation plans
- rollout roadmap
- audit / handoff that still guide future work
- reusable templates

Representative current examples:
- `docs/plans/_template.md`
- `docs/plans/_validation-template.md`
- `docs/plans/2026-07-10-architecture-refactor-plan.md`
- `docs/plans/2026-07-10-control-domain-refactor-phase2-plan.md`
- `docs/plans/2026-07-10-storage-source-rollout-phase2-plan.md`
- `docs/plans/2026-07-11-phase2-module-normalization-roadmap.md`
- `docs/plans/2026-07-11-real-host-integration-roadmap.md`
- `docs/plans/2026-07-11-electron-thin-integration-handoff.md`
- `docs/plans/2026-07-11-worktree-risk-audit.md`

## Review Tier B: Keep Only If Still Referenced
These are useful only if they are still actively cited by implementation or handoff docs.

- validation plans that still act as an execution checklist
- audit notes tied to unfinished refactor threads
- one-off final summaries for a platform that still has open delivery steps
- backlog notes that still map directly to unresolved code movement

Review rule:
- if a file is not being referenced and does not change future implementation choices, move it toward cleanup

## Cleanup Tier C: Process Noise
These are the main cleanup targets for the next passes.

- repeated `*-validation.md` files for the same topic
- `draft-validation` and `skeleton-validation`
- `runtime-entry-verification`
- one-shot smoke-run checklist / runbook / execution-guide
- quick navigation, temporary triage, candidate lists
- transient status snapshots superseded by final summary or roadmap

## Current Priority Recommendation
1. Keep Tier A visible at the root.
2. Continue removing Tier C duplicates from `docs/plans/` first.
3. Revisit Tier B only when the matching implementation thread is either complete or abandoned.
4. Apply the same keep / review / cleanup split to `desktop/docs/` and `mobile/docs/` next.
