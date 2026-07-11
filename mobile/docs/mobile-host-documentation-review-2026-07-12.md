# Mobile Host Documentation Review (2026-07-12)

This note classifies the current `mobile/docs/` files by long-term value so later cleanup can stay low-risk and aligned with the desktop host-doc review.

## Scope
Reviewed files:
- `mobile-assembly-entry-upgrade-note-2026-07-11.md`
- `mobile-runtime-entry-draft-2026-07-11.md`
- `mobile-runtime-structure-draft-2026-07-11.md`
- `platform-core-mapping.md`

## Classification
### Keep as durable host docs
These still define reusable host-side mapping or stable mobile runtime direction.

- `platform-core-mapping.md`

Reason:
- it defines long-term `platform.core.*` mapping for mobile host work
- it remains useful even if the concrete shell implementation evolves
- it is not just a one-off execution note

### Keep temporarily as active-thread rollout docs
These are more rollout-oriented or draft-oriented, but still useful while mobile shell work is unfinished.

- `mobile-assembly-entry-upgrade-note-2026-07-11.md`
- `mobile-runtime-entry-draft-2026-07-11.md`
- `mobile-runtime-structure-draft-2026-07-11.md`

Reason:
- they describe transition steps, runtime draft structure, and upgrade path
- they still support unfinished Android / WebView / Capacitor host work
- they should not be deleted before mobile host rollout stabilizes further

## Current recommendation
1. Do not mass-delete `mobile/docs/`.
2. Treat `platform-core-mapping.md` as the first durable host doc candidate.
3. Treat the three rollout/draft files as temporary-but-valuable while mobile shell work remains active.
4. Revisit consolidation only after mobile runtime entry, wrapper flow, and host bridge direction are more stable.

## Symmetry with desktop review
The mobile host-doc review should mirror the desktop rule set:
- durable mapping docs can be promoted first
- rollout checklists/drafts can stay temporarily
- deletion should happen only after host implementation becomes less draft-heavy
