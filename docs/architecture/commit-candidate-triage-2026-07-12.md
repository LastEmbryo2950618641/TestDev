# Commit Candidate Triage

This document prepares a safe staging boundary before commit/push.
It does not stage, commit, or delete anything.

## Goal
- Commit and push the new multi-platform architecture/results first
- Delay legacy cleanup until after the main multi-platform milestone is safely recorded
- Avoid accidentally committing temporary scripts, logs, or unclear shared-runtime churn

## Stage Now
These are the strongest candidates for the first architecture milestone commit.

### A. Host shell directories
- `desktop/`
- `mobile/`

### B. Shared platform and newly introduced structured shared directories
- `publish/platform/`
- `publish/app/`
- `publish/domain/`
- new platform-adjacent verification helpers such as:
  - `publish/character-state-store.js`
  - `publish/character-state-store-verify.js`
  - `publish/real-world-log-store.js`
  - `publish/real-world-log-store-verify.js`
  - `publish/platform-body-figure-source.js`
  - `publish/ui-theme-actions-platform-consumer-verify.js`
  - `publish/ui/`

### C. Architecture / handoff / multi-platform documentation
- multi-platform architecture docs under `docs/architecture/`
- relevant plans/validation docs under `docs/plans/`
- cleanup triage docs:
  - `docs/architecture/legacy-cleanup-triage-2026-07-12.md`

## Hold For Manual Review
These files may belong to the current milestone, but they are part of the authoritative shared runtime and should not be staged blindly as one lump.

- modified shared-runtime root files under `publish/`, including but not limited to:
  - `publish/index.html`
  - `publish/game.js`
  - `publish/boot/script-manifest.js`
  - `publish/body-figure.js`
  - `publish/local-settings.js`
  - `publish/storage.js`
  - `publish/settings-actions.js`
  - `publish/worldline-actions.js`
  - `publish/wechat-*.js`
  - `publish/real-world-*.js`
  - other changed top-level runtime modules currently listed by `git status`

Reason:
- these files are likely important and may absolutely need to be committed,
- but they are also the highest-risk part of the worktree,
- so they should be staged intentionally after a final human-reviewed boundary decision.

## Exclude From This Commit
These should not be part of the architecture milestone commit.

### Temporary scripts
- all root `tmp_*` files

### Logs
- `logs/dev-server.err.log`
- `logs/dev-server.log`

### Backup / scratch files
- `publish/settings-actions.js.bak2`
- `publish/worldline-actions.js.bak`

## Recommended Commit Sequence
1. Stage `desktop/`, `mobile/`, structured shared additions, and architecture docs first.
2. Separately review whether the modified `publish/*.js` root runtime files should join the same milestone commit.
3. Commit and push the milestone.
4. Only after push, begin cleanup passes starting with the excluded temporary files.
