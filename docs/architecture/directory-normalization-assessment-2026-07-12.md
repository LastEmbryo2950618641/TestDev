# Directory Normalization Assessment (2026-07-12)

This note records the current normalization status of the repository structure so later cleanup can be staged without breaking gameplay, runtime assembly, or multi-platform reuse goals.

## Assessment scope
- repository root structure
- browser runtime structure under `publish/`
- host-shell separation under `desktop/` and `mobile/`
- documentation placement and remaining noise
- cleanup readiness for old code and generated residue

## Summary
The repository is materially more structured than the earlier flat runtime stage.
It now has a recognizable split between:
- browser runtime
- host shells
- development tooling
- documentation
- source assets
- tests

However, the structure is still in a transition state rather than an end-state.
The current shape should be described as:
- normalized at the top-level intent layer
- partially normalized at the internal runtime layer
- not yet fully normalized at the migration residue and tracked-noise layer

## Normalized areas

### 1. Top-level responsibility split is now clear
Current root directories already show a strong responsibility split:
- `publish/` for browser runtime delivery
- `dev/` for development server and tooling
- `docs/` for plans, architecture, and collaboration guidance
- `desktop/` for Windows shell direction
- `mobile/` for Android shell direction
- `assets/` for source materials
- `tests/` for verification work

This is a meaningful normalization gain because gameplay code, host code, process documents, and raw resources are no longer forced into a single flat surface.

### 2. Browser runtime has moved beyond a single undifferentiated pile
Current `publish/` structure now includes recognizable runtime subdomains such as:
- `boot/`
- `config/`
- `domain/`
- `init/`
- `inference/`
- `platform/`
- `shared/`
- `ui/`

This indicates a real architectural direction toward layered runtime responsibilities instead of continuing to accumulate behavior in top-level legacy files.

### 3. Host-shell separation exists as a real project boundary
The repository now has dedicated host areas:
- `desktop/`
- `mobile/`

This is important for the long-term target because multi-platform reuse requires shell responsibilities to be isolated from gameplay logic.
The current directory layout supports that direction even though implementation migration is still in progress.

### 4. Collaboration and governance documents now have a defined home
The root `README.md` and the `docs/` tree already establish:
- architecture notes
- plans
- workflow guidance
- encoding rules
- cleanup/governance notes

This reduces future AI drift and gives the project a durable place to record migration contracts before code deletion begins.

## Transitional areas

### 1. Legacy top-level runtime entry files are still live
Even though `publish/` contains newer layered directories, legacy files such as top-level action surfaces remain active in the runtime merge path.
This means the project is not yet fully normalized inside the browser runtime.
At present the correct strategy remains:
- keep old top-level files as compat surfaces
- move internals behind them
- delete only after caller migration is verified

### 2. Documentation volume is not yet fully curated
There is now a useful documentation structure, but a large number of untracked notes and plans still remain in the worktree.
This means documentation placement is better, yet documentation curation is not finished.
The directory is serving as a staging area as well as a durable knowledge base.

### 3. Android mirrored runtime assets are still a governance hotspot
The Android shell mirror under `mobile/android-webview-shell/app/src/main/assets/publish/` is structurally correct for packaging, but still creates cleanup pressure because it mirrors browser runtime assets and can appear as tracked noise.
This is a process and source-of-truth problem more than a directory naming problem.

## Not-yet-normalized areas

### 1. Generated and mirrored residue is still visible in the main worktree
Current worktree evidence still shows tracked churn in:
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `publish/platform/.artifacts/unified-platform-readiness.json`

This means the repository has not yet fully separated durable source files from generated or mirrored operational residue.

### 2. Old-code cleanup has not reached the safe-delete stage
The project has already begun facade verification for legacy action files, but those files still participate in live runtime composition.
That means internal structure is improving, but old-code removal is not yet authorized by evidence.

### 3. Some runtime-adjacent directories still mix durable assets with temporary local residue
Examples already identified elsewhere include build outputs, verification storage, local Android properties, and mirrored shell artifacts.
The first ignore wave has started, but the cleanup policy is not yet fully closed.

## Current maturity judgment

### Already strong
- root responsibility split
- documented collaboration boundaries
- host shell placement
- publish runtime subdomain naming direction

### Meaningfully improving but not finished
- migration from legacy top-level runtime files to thinner facades
- documentation curation
- mirrored asset governance
- generated artifact governance

### Still pending before the structure can be called fully clean
- verified caller migration away from residual legacy surfaces
- stable source-of-truth rules for mirrored host assets
- final cleanup of tracked operational artifacts
- a smaller, curated durable document set after migration closes

## Practical conclusion
The structure is already more standardized and safer than before.
It is now good enough to support disciplined migration work.
It is not yet clean enough to justify large-scale deletion or to claim that normalization is complete.

The safest interpretation is:
1. architecture skeleton and directory responsibilities are now in place
2. old runtime entry surfaces are being reduced behind compat layers
3. final normalization still depends on migration evidence and cleanup sequencing

## Recommended next step
1. continue facade verification for live top-level legacy files
2. finish caller-migration evidence for first-tier candidates
3. keep mirrored/generated residue policies minimal and explicit
4. only then perform old-code deletion and final directory cleanup
