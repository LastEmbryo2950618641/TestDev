# Worldline Domain Layer

This directory stores worldline-specific business logic that has already been separated from top-level action files.

## Purpose

The purpose of `publish/domain/worldline/` is to keep durable worldline logic out of legacy entry surfaces so that:

- top-level action files can keep shrinking into orchestration and compat shells
- event/query/state logic can be reused without dragging whole UI or action modules with it
- shared browser-side logic stays easier to carry across web, desktop, and mobile shells later

## Current modules

### `state-service.js`
- real-world worldline state assembly
- lore worldline selection
- event append orchestration bridge
- per-turn worldline update flow

### `query-service.js`
- plot and faction queries
- read-oriented worldline lookup helpers
- compatibility surface for query-style consumers

### `format-helpers.js`
- worldline-safe id generation
- turn event id formatting
- turn detail text assembly
- connection event assembly
- faction display formatting helpers

### `wechat-event-service.js`
- WeChat conversation worldline event assembly
- event object creation kept separate from write-back orchestration

## Boundary rules

Files in this directory should prefer:

- state assembly
- query logic
- event object construction
- shared formatting used by multiple callers
- business logic that is worldline-specific but not UI-specific

Files in this directory should avoid:

- direct DOM work
- top-level panel open/close orchestration
- action-entry glue that only exists for one legacy file surface
- provider/model loading
- prompt-heavy gameplay orchestration unless the logic is truly worldline-domain logic rather than chat/runtime flow

## Relationship to other layers

- `publish/worldline-actions.js`: compat shell and orchestration entry surface
- `publish/domain/worldline/`: state/query/format/event domain layer
- `publish/ui/worldline/`: readonly view helper layer

## Migration pattern

The preferred pattern for future moves into this directory is:

1. extract pure state, query, or event-builder logic first
2. keep public action names stable through compat forwarding when callers still depend on them
3. do not mix UI rendering concerns into domain files
4. keep high-risk gameplay orchestration outside this directory until the boundary is proven safe

## Immediate practical rule

If a candidate function both mutates runtime UI state and assembles business data, split the readonly/business portion first and only then consider moving it into `publish/domain/worldline/`.

