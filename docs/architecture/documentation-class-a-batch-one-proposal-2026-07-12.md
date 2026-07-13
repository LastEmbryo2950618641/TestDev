# Documentation Class A Batch One Proposal (2026-07-12)

This note proposes the first actual promotion batch from the previously identified Class A shortlist.

## Batch-one selection rule
The first batch should favor documents that are:
- broadly reusable across later sessions
- least likely to be invalidated by near-term refactor churn
- strong top-level orientation artifacts for multi-platform work
- contract- or runbook-shaped rather than draft-implementation-shaped

## Proposed batch-one promotion set

### Shared contract foundation
1. `docs/architecture/2026-07-11-shared-host-capability-contract-extraction.md`
2. `docs/architecture/2026-07-11-shared-host-runtime-contract-extraction.md`
3. `docs/architecture/2026-07-11-shared-storage-runtime-contract-extraction.md`
4. `docs/architecture/2026-07-11-shared-platform-capability-registry.md`

Why these are batch-one quality:
- they define core reusable shared boundaries
- they are central to the Web/Desktop/Android convergence story
- they are more durable than narrower implementation notes

### Cross-host parity/orientation
5. `docs/architecture/desktop-mobile-unified-host-contract-parity-2026-07-11.md`
6. `docs/architecture/android-host-api-mapping-table-2026-07-11.md`

Why these are batch-one quality:
- they help future implementation stay aligned across host types
- they are high-value orientation references for future work
- they directly support the low-coupling, host-isolated architecture goal

### Stable runbook knowledge
7. `docs/architecture/desktop-packaging-runbook-2026-07-11.md`

Why this is batch-one quality:
- it captures repeatable operational knowledge that future collaborators are likely to need
- it already reads like a durable runbook rather than a scratchpad

## Deferred from the Class A shortlist for batch two or later
The following are still strong documents, but should be deferred from the first promotion batch:
- `docs/architecture/2026-07-11-shared-assets-capability-contract-extraction.md`
- `docs/architecture/2026-07-11-shared-files-capability-contract-extraction.md`
- `docs/architecture/2026-07-11-shared-keys-capability-contract-extraction.md`
- `docs/architecture/2026-07-11-shared-platform-packaging-gap-report.md`
- `docs/architecture/windows-host-placement-table-2026-07-11.md`

Why they are deferred:
- some are slightly narrower or more implementation-adjacent
- some may benefit from being promoted after the core host/runtime/storage contract set is tracked first
- the goal is to keep batch one compact and high-confidence

## Practical recommendation
If executing the first real curation batch, promote these seven documents first.
Then reassess whether the deferred shortlist items should be promoted as:
- batch two shared capability refinements
- host placement references
- packaging gap follow-up references

## Why this phased promotion is safest
This reduces repository noise while still strengthening the durable documentation spine.
It also prevents the curation pass from turning into another bulk-import of semi-stable material.
