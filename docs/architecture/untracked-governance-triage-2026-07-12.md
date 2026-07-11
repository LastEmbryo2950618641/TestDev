# Untracked Governance Triage (2026-07-12)

This note classifies the current large untracked set without deleting or staging anything yet.

## Why this triage exists
- the repository currently contains a large amount of untracked material across docs, desktop, and mobile work areas
- mixing real long-term artifacts with caches/build outputs makes later cleanup and future commits risky
- the goal is to decide what should be tracked, ignored, or deferred before taking destructive action

## Current untracked group snapshot
- `docs/architecture/`: 61 items
- `docs/plans/`: 52 items
- `desktop/`: 5 top-level untracked paths
- `mobile/`: 26 top-level untracked paths

## Group A: likely track-worthy documentation
These are candidates to eventually track because they can influence future implementation or handoff quality:
- architecture notes that define boundaries, contracts, or implementation sequencing
- plan documents that are still actively referenced by current work
- top-level host README files such as `mobile/README.md`

Current caution:
- not every untracked doc deserves tracking
- many of these appear to be narrow skeletons, quick validations, or one-off probes
- they should be triaged for “long-term reference” vs “process noise” before staging

## Group B: should remain untracked or ignored as build/runtime evidence
These should not be pulled into ordinary source commits:
- `desktop/shell/dist/`
- `desktop/shell/dist-minimal/`
- `desktop/shell/.artifacts/`
- `desktop/shell/.verify-storage/`
- `mobile/android-webview-shell/.gradle/`
- `mobile/android-webview-shell/app/build/`
- `mobile/shell/.verify-storage/`
- `mobile/shell/.bridge-verify-storage/`
- `mobile/tools/` when it contains downloaded local toolchains

Rationale:
- these are build outputs, execution evidence, local caches, or machine-specific environments
- they may remain useful locally, but should not be mixed into normal refactor commits

## Group C: needs explicit policy before deciding track vs ignore
These areas are mixed and need conscious governance rather than blanket staging or blanket deletion:
- `mobile/android-webview-shell/app/src/main/assets/publish/...` mirrored asset trees
- `mobile/android-webview-shell/local.properties` and `local.properties.generated`
- `mobile/android-webview-shell/.last-asset-sync.json` / `.last-build-attempt.json`
- `desktop/docs/` and `mobile/docs/` if they contain platform-specific long-term notes

Questions this group raises:
- are these source-of-truth inputs or generated mirrors?
- are they portable across machines?
- do they need to exist in Git, or should they be rebuilt from tracked upstream sources?

## Group D: likely cleanup/defer candidates among untracked docs
Based on naming alone, many untracked files look like temporary execution notes rather than long-term project rules:
- `*skeleton*`
- `*verify*`
- `*validation*`
- `*quick*`
- narrow one-day probe notes that duplicate later summary docs

These should not be auto-deleted now, but they are strong candidates for later consolidation or non-tracking.

## Recommended next governance moves
1. Make an allowlist of untracked docs that truly deserve version control because they still guide implementation.
2. Add or refine ignore rules for build outputs, caches, machine-local settings, and mirrored runtime artifacts.
3. Decide whether Android mirrored `publish/` assets are tracked source, generated mirror, or packaging byproduct before staging any of them.
4. Keep cleanup and tracking policy separate from gameplay or runtime refactors.

## Current recommendation
The next safest step is not deletion. It is to create an explicit allowlist/ignore-policy pass so future commits stop competing with untracked noise.
