# Worldline UI Layer

This directory stores readonly worldline view helpers used to prepare panel-facing data for rendering.

## Purpose

The purpose of `publish/ui/worldline/` is to keep worldline display preparation out of top-level action files and out of domain services.

This layer should transform already-available domain/state data into row, panel, and display objects that templates or entry surfaces can consume directly.

## Current modules

### `view-helpers.js`
- compatibility surface for callers still using the broader worldline helper entry
- aggregation facade over lore, timeline, and plot-facing readonly helpers

### `lore-view-helpers.js`
- lore expand/collapse readonly behavior
- control lore filtering
- real-world lore display object shaping

### `timeline-view-helpers.js`
- timeline item shaping
- newest-first event ordering for readonly timeline consumption

## Boundary rules

Files in this directory should prefer:

- readonly row assembly
- panel view object construction
- derived display text for already-known worldline data
- sorting, grouping, and shaping data for UI consumption

Files in this directory should avoid:

- mutating worldline persistence state
- generating ids for storage ownership
- writing to save backends
- prompt generation or gameplay orchestration
- direct DOM querying or canvas drawing

## Relationship to other layers

- `publish/worldline-actions.js`: entry/orchestration/compat layer
- `publish/domain/worldline/`: worldline state/query/format/event domain logic
- `publish/ui/worldline/`: readonly panel and row shaping layer

## Migration pattern

The preferred rule is:

1. if logic only reads worldline state and reshapes it for display, prefer moving it here
2. if logic constructs domain events or manipulates worldline records, keep it in `publish/domain/worldline/` instead
3. if logic mixes entry mutation and readonly shaping, split the readonly view portion first

## Immediate practical rule

Any new helper added here should return display-ready rows, labels, summaries, or panel objects rather than raw side effects.
