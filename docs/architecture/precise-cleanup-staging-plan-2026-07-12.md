# Precise Cleanup Staging Plan (2026-07-12)

## Stage modified tracked files
- `docs/README.md`
- `docs/architecture/legacy-cleanup-triage-2026-07-12.md`

## Stage new governance docs
- `docs/architecture/documentation-retention-triage-2026-07-12.md`
- `docs/architecture/next-cleanup-candidates-2026-07-12.md`
- `docs/architecture/host-documentation-triage-2026-07-12.md`
- `docs/architecture/validation-retention-split-2026-07-12.md`
- `docs/architecture/commit-scope-triage-2026-07-12.md`

## Stage tracked deletions
### publish legacy backup removals
- `publish/predefined-role-cards_bak/liu-siqi.js`
- `publish/predefined-role-cards_bak/liu-siqi.json`
- `publish/predefined-role-cards_bak/liu-siyao.js`
- `publish/predefined-role-cards_bak/liu-siyao.json`
- `publish/predefined-role-cards_bak/liu-you.js`
- `publish/predefined-role-cards_bak/liu-you.json`
- `publish/predefined-templete_bak/all-role-cards.json`
- `publish/predefined-templete_bak/part1-base-identity.json`
- `publish/predefined-templete_bak/part2-abilities-professions.json`
- `publish/predefined-templete_bak/part3-inventory-wearing-rpg.json`
- all tracked files under `publish/prompts_bak/`
- all tracked files under `publish/prompts_bak2/`

### tracked docs cleanup deletions
- `docs/architecture/2026-07-11-desktop-electron-smoke-run-checklist.md`
- `docs/architecture/android-toolchain-status-snapshot-2026-07-12.md`
- `docs/architecture/commit-candidate-triage-2026-07-12.md`
- `docs/plans/2026-07-10-control-domain-refactor-phase1-validation.md`

## Do not expect deletion records for these
These were mostly untracked workspace docs, so they should not be part of git staging unless newly added on purpose.

- most removed files under `desktop/docs/`
- most removed files under `mobile/docs/`
- many removed `docs/plans/*validation*` files that never entered git

## Commit message suggestion
- `chore: clean legacy backups and tighten documentation governance`
