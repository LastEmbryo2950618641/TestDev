# Desktop Checklist Index (2026-07-12)

This index groups the current desktop checklist-style process documents so later work can find the right entry point without treating every checklist as an equally primary architecture artifact.

## Why this index exists

The desktop documentation set currently includes multiple checklist-style notes that are all useful, but they serve different moments in the desktop host rollout.

Without an index, they create unnecessary worktree noise and force later sessions to repeatedly guess which one to read first.

## Recommended reading order

### 1. Readiness gate first

- `desktop-ready-to-implement-checklist-2026-07-11.md`

Use this first when deciding whether a new round is allowed to begin real desktop-host implementation at all.

### 2. Entry integration flow second

- `desktop-entry-integration-checklist-2026-07-11.md`

Use this when the question is how a future desktop host entry should attach platform core and run handshake verification without touching the shared gameplay chain.

### 3. Bootstrap/API shape checklist third

- `desktop-bootstrap-to-electron-api-checklist-2026-07-11.md`

Use this when the work has already narrowed to the first Electron-facing shell/API shape and the goal is to keep changes inside `desktop/shell/*`.

### 4. Replacement sequencing checklist fourth

- `desktop-electron-replacement-checklist-2026-07-11.md`

Use this when planning the longer replacement order from runtime binding to preload, bridge realization, and packaging.

## Role of each checklist

### `desktop-ready-to-implement-checklist-2026-07-11.md`
- gating checklist
- answers whether implementation should start yet
- emphasizes what not to touch in shared runtime files

### `desktop-entry-integration-checklist-2026-07-11.md`
- integration-flow checklist
- focuses on host entry assembly and safe-consumer handshake order
- useful once desktop runtime entry is actually being exercised

### `desktop-bootstrap-to-electron-api-checklist-2026-07-11.md`
- shell-local bootstrap checklist
- focuses on first Electron API shape and bootstrap wiring
- useful for the earliest host-shell implementation step

### `desktop-electron-replacement-checklist-2026-07-11.md`
- staged replacement checklist
- focuses on longer-sequence migration after the first shell wiring exists
- more roadmap-like than gating-like

## Triage classification

For documentation governance purposes, these checklist files should currently be treated as:

- process documentation
- still useful short-term
- not all equal to long-term architecture entry documents

That means they should be discovered through an index like this one rather than all competing as top-level entry points.

## Immediate practical rule

If a future desktop doc is another checklist, draft, or implementation gate, add it to this index or merge it into an existing checklist family instead of letting desktop/docs fill up with parallel entry points again.
