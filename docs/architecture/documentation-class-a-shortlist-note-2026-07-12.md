# Documentation Class A Shortlist Note (2026-07-12)

This note proposes the first shortlist of durable Class A architecture documents from the current untracked `docs/architecture/` backlog.

## Selection rule
A document qualifies for this shortlist when it appears to do one or more of the following:
- define a stable cross-platform or host boundary
- record capability contracts that future implementation work can repeatedly rely on
- capture host placement or packaging decisions likely to remain relevant beyond one session
- serve as a durable orientation artifact for future AI or human collaborators

## Proposed Class A shortlist

### Shared/platform contract references
1. `docs/architecture/2026-07-11-shared-assets-capability-contract-extraction.md`
2. `docs/architecture/2026-07-11-shared-files-capability-contract-extraction.md`
3. `docs/architecture/2026-07-11-shared-host-capability-contract-extraction.md`
4. `docs/architecture/2026-07-11-shared-host-runtime-contract-extraction.md`
5. `docs/architecture/2026-07-11-shared-keys-capability-contract-extraction.md`
6. `docs/architecture/2026-07-11-shared-storage-runtime-contract-extraction.md`
7. `docs/architecture/2026-07-11-shared-platform-capability-registry.md`
8. `docs/architecture/2026-07-11-shared-platform-packaging-gap-report.md`

Why these qualify:
- they define reusable shared capability boundaries
- they support the long-term Web/Desktop/Android convergence goal
- they describe contracts rather than only one-off execution details

### Host parity and placement references
9. `docs/architecture/desktop-mobile-unified-host-contract-parity-2026-07-11.md`
10. `docs/architecture/android-host-api-mapping-table-2026-07-11.md`
11. `docs/architecture/windows-host-placement-table-2026-07-11.md`

Why these qualify:
- they orient future host implementation work
- they help prevent platform-specific logic from leaking back into gameplay layers
- they look reusable across many later sessions

### Durable packaging/runbook references
12. `docs/architecture/desktop-packaging-runbook-2026-07-11.md`

Why this qualifies:
- it captures a repeatable execution path for Windows packaging
- it appears intended as an ongoing runbook rather than a single temporary note
- it preserves hard-won environment-specific knowledge that would otherwise be rediscovered repeatedly

## Strong Class B hold candidates
These look useful, but should be promoted only after another relevance check against the current direction:
- `docs/architecture/platform-core-assembly-examples-2026-07-11.md`
- `docs/architecture/browser-platform-assembly-safe-migration-2026-07-11.md`
- `docs/architecture/shell-assembly-map-2026-07-11.md`
- `docs/architecture/local-settings-consumer-unification-2026-07-11.md`
- `docs/architecture/cross-module-display-migration-contract-2026-07-11.md`
- `docs/architecture/cross-module-view-contract-2026-07-11.md`
- `docs/architecture/real-world-map-actions-migration-backlog-2026-07-10.md`
- `docs/architecture/store-migration-coverage-tail-2026-07-11.md`
- `docs/architecture/store-migration-focus-sweep-2026-07-11.md`

Why these are not immediate Class A:
- some may still reflect active migration rather than settled architecture
- some may duplicate later, better summaries
- some may matter only while a specific refactor track is still open

## Current non-shortlist direction
The following kinds of files should generally remain out of the first Class A promotion batch:
- temporary skeleton variants
- execution scratch notes
- one-off staging lists
- validation-heavy notes duplicated in `docs/plans/`
- the currently unsafe `wechat-chat-session` extraction note

## Recommended next step
1. stage and submit the Class A shortlist note itself as governance guidance if desired
2. then perform a dedicated curation pass that promotes the shortlisted architecture files in one or two themed batches
3. keep Class B candidates deferred until their overlap and current relevance are checked
