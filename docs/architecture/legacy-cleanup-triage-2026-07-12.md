# Legacy Cleanup Triage (2026-07-12)

This note groups current top-level `publish/` entries by cleanup readiness so later legacy cleanup can happen from evidence instead of intuition.

## Purpose
- support the long-term goal of cleaning legacy entry code only after replacement boundaries are stable
- separate “already helper-thinned” entries from “still mixed and not ready” entries
- give later sessions a safe order for post-migration cleanup

## Group A: helper-thinned, closer to compatibility-shell shape
These entries already have meaningful readonly/view helper logic moved out and now look more like orchestration shells plus remaining runtime logic:
- `publish/event-actions.js`
- `publish/company-actions.js`
- `publish/worldline-actions.js`

Current evidence:
- explicit top-level UI facade clusters were consolidated into shared forwarding registration
- matching boundary audits exist in `docs/architecture/*entry-audit-2026-07-12.md`
- top-level files still keep write-side or mixed runtime logic and are therefore not yet deletable

Cleanup readiness:
- not ready for deletion
- ready for continued thinning in later passes
- strong candidates for future “compatibility shell only” end state

## Group B: helper extraction underway, but still mid-transition
These entries already have helper landing zones or partial forwarding, but still need more consolidation before any cleanup conversation:
- `publish/settings-actions.js`
- `publish/loading-actions.js`
- `publish/role-card-loading-actions.js`
- `publish/calendar-actions.js`

Current evidence:
- dedicated helper files already exist under `publish/ui/...`
- previous audits confirm first-pass helper movement or forwarding concentration
- top-level entries still visibly mix state mutation, runtime orchestration, and remaining UI composition

Cleanup readiness:
- not ready for deletion
- keep migrating helper-facing logic first
- reassess only after another thinning pass or two

## Group C: not yet in cleanup discussion
Entries outside the audited/thinned path should not be pulled into cleanup yet merely for symmetry.

Examples include:
- modules without an explicit helper audit
- modules whose top-level files still combine runtime rules, mutation, prompt assembly, and display composition without a clear landing zone
- platform bridge and host-related files used by web/desktop/mobile runtime assembly

Cleanup readiness:
- do not delete
- do not rename for aesthetics alone
- first create a stable landing zone and prove the boundary with an audit

## Stop boundaries before any legacy cleanup
- Do not delete a top-level entry only because some helper methods moved out.
- Do not remove files still referenced by `publish/index.html`, runtime boot flow, desktop renderer, or Android WebView asset assembly.
- Do not treat `publish/platform/`, `desktop/`, or `mobile/` host/runtime files as ordinary legacy clutter; they remain part of multi-platform assembly work.
- Do not mix “helper cleanup” with persistence, prompt generation, gameplay mutation, or platform bridge rewrites in the same pass.

## Recommended post-migration cleanup order
1. Keep helper-first thinning on audited entries until each top-level file is mostly orchestration plus compatibility forwarding.
2. Re-scan actual call sites and boot references before deleting any remaining legacy wrapper or duplicated block.
3. Clean temporary scripts, stale backups, and process-only artifacts before deleting runtime entries.
4. Only after web/desktop/mobile shared runtime paths are stable, evaluate whether top-level compatibility shells can be removed or merged.

## Current recommendation
The project is not yet at the “delete old entry files” phase. The safe next move is to continue boundary-thinning on audited entries and use this triage to decide what stays in scope for future cleanup.
