# Shared Report Artifact Tracking Policy Draft (2026-07-12)

This draft defines the safest current tracking policy for generated report artifacts under `publish/platform/.artifacts/`.

## Why this policy is needed
The project now has shared platform-level report scripts that write machine-generated JSON snapshots under `publish/platform/.artifacts/`.

At least one such file is currently tracked:
- `publish/platform/.artifacts/unified-platform-readiness.json`

Routine verification can refresh this file even when no gameplay logic, host contract, or platform capability rule changed.

Without an explicit policy, report execution can create accidental tracked diffs that interfere with unrelated implementation commits.

## Current facts
1. `publish/platform/unified-platform-readiness-report.js` writes `publish/platform/.artifacts/unified-platform-readiness.json` automatically.
2. The file includes a `generatedAt` timestamp, so repeated execution can change the file even when readiness meaning is unchanged.
3. The file is evidence/report output, not primary gameplay/runtime source code.
4. Tracked report-artifact diffs can appear while working on unrelated desktop/mobile assembly code.

## Policy goal
Keep shared readiness reporting available without allowing routine timestamp or snapshot refreshes to pollute ordinary implementation commits.

## Draft policy
### Rule 1: treat `.artifacts` report files as generated evidence first
Files under `publish/platform/.artifacts/` should be treated primarily as generated report evidence, not as primary source.

### Rule 2: do not auto-stage artifact-only diffs
If a change affects only generated report artifacts such as:
- `publish/platform/.artifacts/unified-platform-readiness.json`

it should not be staged automatically with unrelated implementation work.

### Rule 3: timestamp-only refreshes should not drive commits
If a tracked artifact diff only changes fields such as:
- `generatedAt`
- other run-specific timestamps or volatile metadata

that diff should remain out of ordinary commits unless the current task explicitly updates or snapshots reporting evidence.

### Rule 4: artifact commits require explicit purpose
Generated shared report artifacts should be committed only when at least one of these is true:
1. the task explicitly records a milestone snapshot of shared readiness evidence
2. the structure or semantics of the report itself changed and a refreshed artifact is intentionally part of that change
3. the project later adopts a formal policy that certain artifact snapshots are versioned deliverables

### Rule 5: separate report-source commits from artifact-refresh commits
Changes to report-producing source files such as:
- `publish/platform/unified-platform-readiness-report.js`
- future report adapters or verify scripts

should, where practical, stay separate from refreshed artifact outputs unless the refreshed output is intentionally part of the milestone evidence.

## Commit guidance
### Safe to commit
- source code for shared report generation
- source code for host assembly adapters and verify scripts
- documentation that defines report contracts or tracking policy

### Do not auto-commit
- timestamp-only artifact refreshes
- snapshot refreshes caused only by routine verification
- unrelated report artifact updates while working on desktop/mobile implementation files

## Recommended next decision
The project should later choose one explicit policy for `publish/platform/.artifacts/`:
1. keep tracked as milestone evidence only
2. move toward ignore/generated-only handling
3. keep tracked but strip volatile fields such as timestamps from ordinary comparison outputs

## Current recommendation
Until that decision is finalized, the safest rule is:
- treat shared report artifacts as generated evidence
- keep artifact-only diffs out of unrelated commits
- commit them only with explicit evidence-snapshot intent
