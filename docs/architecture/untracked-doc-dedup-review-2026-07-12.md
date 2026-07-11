# Untracked Doc Dedup Review (2026-07-12)

This note records the duplication check for the two strongest Tier 1 candidates before promoting them into version control.

## 1. `docs/architecture/host-integration-priority-2026-07-11.md`
Recommendation: keep as a standalone tracked document.

Dedup finding:
- current tracked overview documents mention desktop/mobile sequencing implicitly, but do not preserve this file's explicit host-integration priority rule as a short standalone reference
- the document is small, stable, and cheap to keep

Conclusion:
- not meaningfully duplicated
- suitable to promote as-is

## 2. `docs/architecture/multi-platform-assembly-alignment-2026-07-11.md`
Recommendation: still worth tracking as a focused companion note.

Dedup finding:
- there is clear thematic overlap with `docs/architecture/multi-platform-implementation-overview.md`
- however, the alignment note is more focused on the target attach shape and the rule that browser/desktop/mobile should expose parallel assembly boundaries
- the tracked overview is broader and mixes evidence, status, sequencing, and cleanup notes

Conclusion:
- partially overlapping, but not redundant
- suitable to track if kept as a focused assembly-boundary reference

## Current promotion recommendation
- promote `host-integration-priority-2026-07-11.md`
- promote `multi-platform-assembly-alignment-2026-07-11.md`
- continue deferring `web-core-desktop-mobile-shell-split-plan-2026-07-11.md` until encoding is stabilized
- continue deferring `windows-host-placement-table-2026-07-11.md` until overlap with newer tracked desktop notes is reviewed in more detail

## Suggested next step
Create a very small follow-up commit that stages only the two promoted Tier 1 source documents plus this review note, so the repository gains a higher-signal multi-platform doc baseline without bulk-importing the wider untracked set.
