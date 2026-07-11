# Documentation Curation Proposal Note (2026-07-12)

This note proposes a safe curation strategy for the current untracked documentation backlog.

## Current backlog snapshot
Current worktree evidence shows roughly:
- about 60 untracked files under `docs/architecture/`
- about 52 untracked files under `docs/plans/`

These files are not all equal in long-term value.
Treating them as one bulk submission set would likely reduce repository cleanliness rather than improve it.

## Proposed classification model

### Class A: durable architecture references
These are worth promoting into tracked long-term project knowledge when they satisfy one or more of the following:
- define stable boundaries or contracts
- describe host/platform structure that future work will repeatedly depend on
- record durable source-of-truth decisions
- summarize migration rules that outlive the immediate patch

Examples from the current backlog that look like strong Class A candidates:
- shared host/runtime/capability contract extraction notes
- platform capability registry and assembly notes
- desktop/mobile unified host parity maps
- packaging/runbook notes that describe stable host-shell obligations
- storage bridge contract notes if they capture enduring interface decisions

### Class B: active migration design notes
These are useful, but should be promoted selectively.
They often remain valuable while a migration track is active, but may later be superseded.

Examples from the current backlog:
- cross-module display/view migration contracts
- store migration coverage notes
- real-world map migration backlog
- local settings consumer unification notes

Promotion rule:
- keep only the versions that still match the current direction
- avoid tracking every intermediate iteration of the same migration thought

### Class C: validation or execution scratch notes
These should usually remain untracked unless they become canonical evidence.
They are often session-specific or temporary.

Examples from the current backlog:
- many `docs/plans/*validation*.md`
- ad hoc validation notes for one-off checks
- temporary staging lists
- throwaway skeleton/draft alternates that were never chosen

Promotion rule:
- do not track by default
- only promote if a later durable summary explicitly depends on them

## Immediate curation recommendation

### 1. Do not bulk-add the current `docs/plans/` backlog
The current `docs/plans/` set is too validation-heavy and too close to process scratch space.
Tracking it wholesale would likely increase noise.

### 2. Curate `docs/architecture/` in themed batches
Recommended batch order:
1. platform/shared contract notes
2. desktop/electron host notes that still match the current shell direction
3. mobile/android host notes that still match the current shell direction
4. game/runtime migration notes only where they encode lasting boundaries rather than one-off checkpoints

### 3. Preserve the current documented governance direction
Recent tracked governance notes already established that noise control matters.
The backlog should now be filtered through that governance lens rather than added opportunistically.

## Practical next step
The next safe documentation-governance pass should be:
1. produce a shortlist of 8-15 Class A architecture files from the current untracked set
2. explicitly mark a second shortlist as Class B hold candidates
3. leave Class C validation/process notes untracked

## Why this is the safest path
This approach supports the project objective because it:
- improves repository cleanliness instead of inflating tracked noise
- strengthens future AI collaboration with durable documents only
- keeps migration evidence usable without turning the repo into a scratch archive
- aligns with the larger goal of making the new structure clean, maintainable, and low-coupling
