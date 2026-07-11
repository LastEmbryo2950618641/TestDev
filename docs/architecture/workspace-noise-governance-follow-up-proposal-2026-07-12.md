# Workspace Noise Governance Follow-Up Proposal (2026-07-12)

This proposal turns the existing noise-governance evidence into a practical next-step order for future cleanup work.

## Existing evidence base
### Class 1: tracked generated artifact evidence
- `docs/architecture/shared-readiness-artifact-diff-evidence-2026-07-12.md`
- current conclusion: visible diff is timestamp-only artifact noise

### Class 2: tracked Android mirror evidence
- `docs/architecture/android-mirror-index-diff-evidence-2026-07-12.md`
- current conclusion: current `index.html` mirror diff is content-aligned with shared source

### Class 3: local-only candidate list
- `docs/architecture/class3-local-noise-candidates-2026-07-12.md`
- current conclusion: `local.properties.example` should remain durable; the rest are local-only/run-residue candidates

### Overarching governance model
- `docs/architecture/workspace-noise-governance-plan-2026-07-12.md`

## Recommended execution order
### Step 1: Class 3 proposal first
Prepare a narrow ignore-policy draft for local-only/run-residue candidates, because this class has the lowest architecture risk.

Target scope:
- `.last-asset-sync.json`
- `.last-build-attempt.json`
- local machine variants such as `local.properties` and `local.properties.generated`
- local shell `.artifacts/` only if no durable workflow still depends on them

Do not include:
- `local.properties.example`
- Android mirrored shared runtime inputs
- tracked shared platform artifacts

### Step 2: Class 2 mirror policy clarification
After Class 3, revisit Android mirror tracking policy using the current proof that `index.html` is content-aligned with root `publish/`.

Goal:
- decide whether mirror tracking stays explicit
- or whether a stricter sync/materialization policy should reduce routine tracked noise

### Step 3: Class 1 tracked artifact policy refinement
After Class 2, revisit whether shared readiness artifacts should remain tracked as milestone evidence only, or continue tracked with stronger no-artifact-write discipline.

Goal:
- reduce timestamp-only worktree noise
- preserve useful readiness evidence when actually needed

## What should not happen next
1. Do not delete broad sets of files without class-specific policy.
2. Do not mix ignore-policy work with gameplay or host-implementation changes.
3. Do not treat the current Android mirror diff as source divergence.
4. Do not treat the current readiness artifact diff as meaningful readiness regression.

## Current recommendation
The safest immediate implementation direction is:
1. draft Class 3 ignore policy
2. then revisit Android mirror tracking policy
3. then revisit tracked readiness artifact policy

This order minimizes risk while still making the worktree progressively cleaner.
