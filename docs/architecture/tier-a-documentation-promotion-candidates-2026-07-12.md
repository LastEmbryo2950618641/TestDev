# Tier A Documentation Promotion Candidates (2026-07-12)

This note records the current safest subset of untracked documentation that appears suitable for formal tracking in the next documentation pass.

## Selection standard
A file qualifies only if all of the following are true:
- it provides reusable architecture or migration guidance
- it remains useful beyond a single implementation turn
- it does not mainly duplicate a stronger tracked document
- its current content is readable and structurally healthy

## Selected candidates
### Architecture guidance
- `docs/architecture/multi-platform-execution-map-2026-07-12.md`
- `docs/architecture/store-migration-playbook-2026-07-11.md`
- `docs/architecture/module-migration-patterns-2026-07-11.md`
- `docs/architecture/module-readme-templates-2026-07-11.md`
- `docs/architecture/wechat-display-refactor-playbook-2026-07-11.md`
- `docs/architecture/requirement-audit-2026-07-12.md`
- `docs/architecture/requirement-audit-final-addendum-2026-07-12.md`

## Explicit exclusions for now
### Encoding or readability risk
- `docs/architecture/platform-core-contract-2026-07-11.md`
  - excluded because current content shows obvious encoding corruption and should be repaired before any tracking decision

### Not automatically promoted yet
- broad validation clusters in `docs/plans/`
- transient packaging/run notes
- candidate lists, sketches, and one-off execution notes
- desktop host docs that still need a host-doc review pass as a group

## Recommended next step
If the next documentation commit proceeds, start with the selected candidates above only.
Do not combine them with unreadable files, transient notes, or generated artifacts.
