# Desktop Host Documentation Review (2026-07-12)

This note classifies the current `desktop/docs/` files by long-term value so later cleanup can stay low-risk.

## Scope
Reviewed files:
- `desktop-bootstrap-to-electron-api-checklist-2026-07-11.md`
- `desktop-electron-replacement-checklist-2026-07-11.md`
- `desktop-entry-integration-checklist-2026-07-11.md`
- `desktop-ready-to-implement-checklist-2026-07-11.md`
- `desktop-runtime-adapter-map-2026-07-11.md`
- `desktop-safe-consumer-handshake-index-2026-07-11.md`
- `desktop-safe-consumer-handshake-template-2026-07-11.md`
- `platform-core-mapping.md`

## Classification
### Keep as durable host docs
These still define stable host-side boundaries, reusable rollout patterns, or desktop-specific mappings.

- `desktop-runtime-adapter-map-2026-07-11.md`
- `desktop-safe-consumer-handshake-index-2026-07-11.md`
- `desktop-safe-consumer-handshake-template-2026-07-11.md`
- `platform-core-mapping.md`

Reason:
- they describe reusable shell/runtime mapping rules
- they can still guide future desktop shell implementation
- they are not just one-off execution records

### Keep temporarily as active-thread implementation checklists
These are more procedural, but still useful while desktop shell rollout is unfinished.

- `desktop-bootstrap-to-electron-api-checklist-2026-07-11.md`
- `desktop-electron-replacement-checklist-2026-07-11.md`
- `desktop-entry-integration-checklist-2026-07-11.md`
- `desktop-ready-to-implement-checklist-2026-07-11.md`

Reason:
- they are checklist-heavy and implementation-phase oriented
- they still support unfinished desktop-host work
- they should not be deleted before desktop shell rollout stabilizes

## Current recommendation
1. Do not mass-delete `desktop/docs/`.
2. Treat the four mapping/handshake files as long-term host docs.
3. Treat the four checklist files as temporary-but-valuable until desktop host rollout is further along.
4. If a later cleanup pass is needed, merge overlapping checklist content only after desktop packaging and runtime binding are more stable.

## Tracking recommendation
If a future documentation promotion pass includes `desktop/docs/`, start with the durable host docs first, then decide whether the checklists still deserve tracking as a group.
