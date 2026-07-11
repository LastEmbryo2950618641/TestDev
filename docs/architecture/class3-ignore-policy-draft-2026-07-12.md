# Class 3 Ignore Policy Draft (2026-07-12)

This draft proposes the safest first ignore-policy scope for Class 3 local-only and run-residue files in the mobile shell workspace.

## Goal
Reduce repeat local worktree noise without hiding shared runtime source, mirrored Android assembly inputs, or durable onboarding examples.

## Candidate scope
Reviewed under `mobile/android-webview-shell/`:
- `.artifacts/`
- `.last-asset-sync.json`
- `.last-build-attempt.json`
- `local.properties`
- `local.properties.example`
- `local.properties.generated`

## Proposed ignore candidates
### Recommended first-wave ignore candidates
- `mobile/android-webview-shell/.last-asset-sync.json`
- `mobile/android-webview-shell/.last-build-attempt.json`
- `mobile/android-webview-shell/local.properties`
- `mobile/android-webview-shell/local.properties.generated`

Reason:
- machine-bound or run-bound state
- not authoritative gameplay/runtime source
- not useful as stable shared evidence in ordinary commits

### Conditional ignore candidate
- `mobile/android-webview-shell/.artifacts/`

Condition:
- only if no active shell workflow still depends on browsing these local artifacts directly from the worktree

Reason:
- likely local execution residue
- but may still have temporary debugging value during unfinished shell rollout

## Explicit non-ignore items
Do not include these in the first-wave ignore scope:
- `mobile/android-webview-shell/local.properties.example`
- `mobile/android-webview-shell/app/src/main/assets/publish/`
- `publish/platform/.artifacts/unified-platform-readiness.json`

Reason:
- `local.properties.example` is a durable onboarding example
- mirrored Android shared-runtime inputs belong to Class 2, not Class 3
- tracked shared readiness artifact belongs to Class 1, not Class 3

## Preconditions before implementation
1. Confirm no contributor workflow relies on staging `.last-*` snapshots as evidence.
2. Confirm `.artifacts/` is not currently required as a durable local debugging contract.
3. Keep the actual `.gitignore` or equivalent change separate from gameplay, shell implementation, and mirror-policy work.

## Recommended rollout order
1. First implement ignore rules for `.last-*` and `local.properties*` machine-bound files.
2. Re-evaluate `.artifacts/` separately.
3. Only after that move on to Class 2 and Class 1 policy changes.

## Current recommendation
This draft is ready to guide a later ignore-rule change, but the policy and the actual ignore-file edit should remain separate steps.
