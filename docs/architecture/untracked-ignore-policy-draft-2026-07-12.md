# Untracked Ignore Policy Draft (2026-07-12)

This draft proposes which current untracked paths should eventually be covered by ignore rules, and which paths need separate policy review before any ignore rule is added.

## Why an ignore policy is needed
- current untracked noise is dominated by build outputs, verification caches, local environment files, and mirrored runtime artifacts
- without an explicit ignore policy, ordinary commits will continue competing with machine-local and generated content
- ignore policy should complement the doc allowlist rather than replace it

## Group A: strong ignore candidates
These are good candidates for explicit ignore rules because they are clearly generated, machine-local, or runtime evidence:
- `desktop/shell/dist/`
- `desktop/shell/dist-minimal/`
- `desktop/shell/.artifacts/`
- `desktop/shell/.verify-storage/`
- `mobile/android-webview-shell/.gradle/`
- `mobile/android-webview-shell/app/build/`
- `mobile/shell/.verify-storage/`
- `mobile/shell/.bridge-verify-storage/`
- `mobile/tools/` when it only contains downloaded local toolchains

## Group B: likely ignore, but verify intent first
These look machine-local or run-specific, but should be confirmed before rules are added:
- `mobile/android-webview-shell/local.properties`
- `mobile/android-webview-shell/local.properties.generated`
- `mobile/android-webview-shell/.last-asset-sync.json`
- `mobile/android-webview-shell/.last-build-attempt.json`

Questions to answer first:
- are these purely local machine settings?
- are they safe to regenerate on demand?
- do any scripts or handoff docs expect them to remain visible by default?

## Group C: do not ignore until source-of-truth policy is decided
These areas should not be added to ignore rules yet because they may be generated mirrors or may currently be standing in for source material:
- `mobile/android-webview-shell/app/src/main/assets/publish/boot/`
- `mobile/android-webview-shell/app/src/main/assets/publish/domain/`
- `mobile/android-webview-shell/app/src/main/assets/publish/ui/`
- `mobile/android-webview-shell/app/src/main/assets/publish/assets/...`
- `mobile/android-webview-shell/app/proguard-rules.pro`
- `desktop/docs/` and `mobile/docs/`

Reason:
- some of these may be generated mirrors of tracked web assets
- some may be packaging inputs rather than packaging outputs
- ignoring them too early could hide a real source-of-truth problem

## Group D: docs should be governed by allowlist, not ignore-first policy
For `docs/architecture/` and `docs/plans/`, the primary mechanism should remain review + allowlist rather than broad ignore rules.

Reason:
- some untracked docs are high-value architecture references
- broad ignore rules here would hide signal instead of reducing noise safely

## Recommended next action
1. Implement ignore rules only for Group A first.
2. Decide local-settings and last-run file policy before touching Group B.
3. Audit Android mirrored `publish/` asset trees before adding any ignore rule for Group C.
4. Continue handling docs via allowlist/review rather than ignore expansion.

## Current recommendation
The next safe repo-hygiene step is a very small ignore-rule pass covering only obviously generated runtime/build evidence. Everything else should remain under review.
