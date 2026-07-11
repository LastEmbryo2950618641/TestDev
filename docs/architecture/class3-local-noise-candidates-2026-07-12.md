# Class 3 Local-Only Noise Candidates (2026-07-12)

This note identifies the safest current candidates for local-only handling or ignore-policy consideration within the mobile shell workspace.

## Scope
Reviewed under `mobile/android-webview-shell/`:
- `.artifacts/`
- `.last-asset-sync.json`
- `.last-build-attempt.json`
- `local.properties`
- `local.properties.example`
- `local.properties.generated`

## Classification
### Keep as durable example
- `local.properties.example`

Reason:
- it is a reproducible onboarding/example file
- it documents the expected `sdk.dir` shape for local setup
- it is useful across machines and contributors

### Local-only or run-residue candidates
- `.artifacts/`
- `.last-asset-sync.json`
- `.last-build-attempt.json`
- `local.properties`
- `local.properties.generated`

Reason:
- they represent machine-bound configuration or per-run execution residue
- they are not primary gameplay/runtime source
- they can distract ordinary implementation work if left unmanaged

## Current recommendation
1. Keep `local.properties.example` as the durable tracked example.
2. Treat the other listed items as Class 3 local-only candidates for later ignore-policy review.
3. Do not change ignore behavior yet without a dedicated follow-up pass.
4. Keep this classification separate from Android mirror and tracked artifact policy decisions.

## Next step
A later follow-up can turn this candidate list into a concrete ignore-policy proposal, but only after confirming no required shell workflow still depends on tracking these files.
