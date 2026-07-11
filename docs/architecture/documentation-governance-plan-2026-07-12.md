# Documentation Governance Plan (2026-07-12)

This plan defines the next safe cleanup path for documentation sprawl without risking loss of durable architecture knowledge.

## Goal
Reduce documentation noise while preserving the files that still materially support:
- low-coupling refactor work
- multi-platform rollout
- future AI/human handoff
- safe old-code migration and cleanup

## Current problem
The repository now contains a large amount of untracked documentation across:
- `docs/architecture/`
- `docs/plans/`
- `desktop/docs/`

Not all of these files have the same long-term value.
Some are durable architecture guidance, while others are one-off exploration notes, runbooks, or transient verification logs.

Without an explicit governance pass, later cleanup risks one of two bad outcomes:
1. useful architecture knowledge gets deleted by mistake
2. short-lived working notes stay forever and reduce signal-to-noise

## Safe governance principles
1. Do not delete documentation merely because it is untracked.
2. Prefer classification before deletion.
3. Preserve files that define reusable rules, templates, migration patterns, contracts, or enduring host structure.
4. Treat one-off execution notes, duplicate validations, and superseded sketches as cleanup candidates.
5. Separate documentation governance from gameplay/business logic changes.

## Classification buckets
### Bucket A: durable tracked documentation
These should be added to git when ready because they remain useful beyond one implementation turn.

Examples:
- stable architecture rules
- platform contracts
- migration playbooks
- module templates
- multi-platform rollout maps
- requirement audits that remain authoritative
- desktop host docs that still define shell/runtime boundaries

### Bucket B: active-thread support docs
These may stay temporarily if they support unfinished implementation threads, but should not automatically become permanent tracked docs.

Examples:
- active packaging notes
- host rollout validations tied to unfinished shell work
- targeted boundary notes still referenced by ongoing implementation

### Bucket C: process-only cleanup candidates
These are usually not worth keeping long-term at root level.

Examples:
- one-off run results
- duplicate validation passes
- transient candidate lists
- temporary checklists superseded by stronger summaries
- draft/sketch/note files whose contents have already been absorbed elsewhere

## Immediate next pass
The next cleanup pass should happen in this order:
1. classify currently untracked docs using the existing candidate notes
2. select a small Tier A tracked subset only
3. leave Bucket B files alone unless their active thread is closed
4. create an archive/drop policy for Bucket C before mass deletion

## Desktop docs recommendation
Current `desktop/docs/` should be treated as a host-scoped documentation area.

Recommended rule:
- keep files that define desktop runtime boundaries, shell handshakes, or implementation checklists still needed for shell rollout
- clean only the obviously duplicated or superseded notes after a host-doc review pass

## Required proof before future cleanup
Before deleting or ignoring any documentation cluster, confirm at least one of the following:
- the content is duplicated by a stronger tracked document
- the implementation thread is complete and the note no longer guides future work
- the file is a pure transient execution artifact with no architecture value

## Current recommendation
Do not start with mass deletion.
Start with governance, classification, and a small tracked-doc promotion pass.
That is the safest path toward a cleaner repository while preserving the project's long-term refactor knowledge.
