# Host Documentation Triage (2026-07-12)

This note classifies `desktop/docs/` and `mobile/docs/` so host-side documentation follows the same keep / review / cleanup logic as the main `docs/` tree.

## Goal
- keep only host-side documents that still guide desktop or mobile shell evolution
- avoid letting draft/checklist files grow into a second unmanaged docs tree
- preserve the minimum set of mapping notes needed for multi-platform rollout

## Keep Tier A: Host-side long-term references
These should stay visible because they still explain host assembly or platform mapping.

### desktop/docs
- `platform-core-mapping.md`
- `desktop-runtime-adapter-map-2026-07-11.md`

### mobile/docs
- `platform-core-mapping.md`
- `mobile-assembly-entry-upgrade-note-2026-07-11.md`

## Review Tier B: Keep only while matching rollout is unfinished
These may still help if the shell thread is actively being resumed, but they should not be treated as permanent references.

### desktop review set
- `desktop-bootstrap-to-electron-api-checklist-2026-07-11.md`
- `desktop-electron-replacement-checklist-2026-07-11.md`
- `desktop-entry-integration-checklist-2026-07-11.md`
- `desktop-ready-to-implement-checklist-2026-07-11.md`
- `desktop-safe-consumer-handshake-index-2026-07-11.md`
- `desktop-safe-consumer-handshake-template-2026-07-11.md`

### mobile review set
- `mobile-runtime-entry-draft-2026-07-11.md`
- `mobile-runtime-structure-draft-2026-07-11.md`

## Cleanup Tier C: Draft/process noise candidates
These are the best low-risk cleanup candidates for a later dedicated host-doc cleanup pass.

### desktop cleanup candidates
- `desktop-assets-draft-notes-2026-07-11.md`
- `desktop-bootstrap-draft-2026-07-11.md`
- `desktop-executor-runtime-entry-draft-2026-07-11.md`
- `desktop-executor-shim-draft-2026-07-11.md`
- `desktop-files-draft-notes-2026-07-11.md`
- `desktop-handshake-draft-2026-07-11.md`
- `desktop-host-draft-notes-2026-07-11.md`
- `desktop-host-runner-draft-2026-07-11.md`
- `desktop-keys-draft-notes-2026-07-11.md`
- `desktop-preload-runtime-entry-draft-2026-07-11.md`
- `desktop-role-card-json-export-handshake-draft-2026-07-11.md`
- `desktop-role-card-json-import-preview-handshake-draft-2026-07-11.md`
- `desktop-runtime-adapter-draft-2026-07-11.md`
- `desktop-runtime-binding-draft-2026-07-11.md`
- `desktop-safe-consumer-handshake-runner-draft-2026-07-11.md`
- `desktop-settings-local-read-handshake-draft-2026-07-11.md`
- `desktop-storage-draft-notes-2026-07-11.md`
- `electron-entry-draft-2026-07-11.md`

### mobile cleanup candidates
- `mobile-host-runner-draft-2026-07-11.md`

## Next recommendation
1. Keep the mapping files and the minimum host rollout notes.
2. If host-shell implementation is not immediately continuing, clean up Tier C first.
3. Re-check Tier B only when desktop/mobile rollout becomes active again.
