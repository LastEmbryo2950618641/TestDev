# Shared Readiness Artifact Tracking Policy Implementation Note (2026-07-12)

This note describes the safest future implementation shape for revisiting tracked shared readiness artifact policy.

## Purpose
Translate the current Class 1 evidence and tracking-policy draft into a low-risk implementation boundary for any future artifact-policy change.

## Current proven facts
1. `publish/platform/.artifacts/unified-platform-readiness.json` is generated report output.
2. The current tracked diff is visible only in `generatedAt`.
3. The current visible diff is not evidence of meaningful readiness-state change.
4. Shared readiness artifacts are evidence outputs, not primary gameplay/runtime source.

## What future implementation should optimize for
- reduce routine timestamp-only tracked noise
- preserve intentionally useful readiness evidence when needed
- keep report-source changes distinct from artifact refreshes
- avoid confusing ordinary implementation commits with evidence snapshots

## Safe implementation boundary
### Allowed future focus
- tracked artifact policy
- no-artifact-write verification discipline
- milestone evidence snapshot rules
- handling of volatile fields such as timestamps

### Explicitly avoid combining with
- gameplay/runtime logic edits
- Android mirror tracking policy changes
- Class 3 local-only ignore changes
- desktop/mobile shell implementation changes

## Minimum proof required before stronger artifact-policy change
Before reducing or changing tracked artifact handling more aggressively, confirm all of the following:
1. the report can still be regenerated when needed for milestone evidence
2. verification flows can still operate without relying on ordinary tracked artifact refreshes
3. contributors can distinguish report-source changes from artifact-output changes
4. any comparison workflow that matters does not depend on volatile timestamp noise

## Recommended implementation phases
### Phase 1: commit discipline only
Keep the artifact tracked, but rely on the current rule that timestamp-only refreshes should stay out of ordinary commits.

### Phase 2: verification discipline hardening
Prefer `--no-artifact-write` or equivalent flows where practical, so routine verification does not keep refreshing tracked evidence.

### Phase 3: tracking-policy decision
Only after stronger discipline exists, decide whether the shared readiness artifact should remain tracked as milestone evidence only, move toward generated-only handling, or use a less volatile comparison form.

## Verification checklist for any future policy change
- shared readiness report can still be produced intentionally when needed
- routine verification no longer creates unwanted artifact noise
- milestone evidence snapshots can still be committed deliberately
- tracked artifact diffs do not reappear as timestamp-only churn during unrelated work

## Current recommendation
Do not treat the current tracked artifact diff as meaningful readiness regression.
Treat it as evidence that future policy work should focus on report discipline and artifact-purpose clarity rather than content repair.
