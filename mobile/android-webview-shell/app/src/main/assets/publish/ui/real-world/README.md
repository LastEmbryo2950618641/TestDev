# Real-World UI Layer

This directory stores readonly real-world display helpers for panel, map, log, and interior presentation surfaces.

## Purpose

The purpose of `publish/ui/real-world/` is to keep display shaping out of top-level real-world action files and out of runtime-heavy map interaction code.

This layer should prepare panel-facing rows, labels, summaries, and display objects from already-available state without owning save orchestration, canvas drawing, or runtime interaction flow.

## Current modules

### `map-shell-view-helpers.js`
- top-level map shell title/location/empty-state text
- shell panel object assembly

### `map-info-view-helpers.js`
- selected node info text
- fact rows and derived info-panel display fields

### `map-control-view-helpers.js`
- control-state display lines
- readonly control-history formatting and rows

### `map-interior-view-helpers.js`
- interior panel display
- selected room display fields
- floor and room readonly row shaping

### `map-view-helpers.js`
- aggregation facade that composes shell/info/control/interior helpers
- compatibility surface for callers still bound to broader map view helper names

### `map-stage-view-helpers.js`
- stage shell helpers such as stage style, stage element, and canvas element lookup
- tiny readonly stage-facing helpers extracted ahead of any runtime canvas logic move
- readonly text shaping helpers such as wrapped canvas labels and shortened stage labels

### `panel-view-helpers.js`
- function panel labels
- icon and button text helpers

### `log-view-helpers.js`
- log display shaping
- deduplicated log row preparation
- log-related labels and panel helper reuse

## Boundary rules

Files in this directory should prefer:

- readonly panel objects
- row and label assembly
- derived display summaries
- grouping and shaping already-known state for templates

Files in this directory should avoid:

- direct runtime map mutation
- viewport/canvas interaction handling
- save persistence
- prompt generation
- model/provider orchestration

## Relationship to other layers

- `publish/real-world-*.js` and `publish/real-world-map-actions.js`: action/orchestration/runtime entry layer
- `publish/ui/real-world/`: readonly shaping and display layer
- future `publish/app/real-world/`: if runtime-adjacent but non-UI helper logic needs a distinct application-layer home

## Migration pattern

The preferred pattern for future moves into this directory is:

1. move readonly text/row/panel shaping first
2. keep canvas drawing, hit testing, zoom/pan, runtime caches, and canvas sizing writes out of this directory
3. when a broad helper surface grows, split it by shell/info/control/interior/panel/log responsibility rather than by arbitrary file size
4. use aggregation facades like `map-view-helpers.js` only when they reduce churn for still-migrating callers

## Immediate practical rule

If a helper needs mutable runtime caches, viewport sizing writes, or live interaction state, it probably belongs outside `publish/ui/real-world/` until its readonly portion is isolated. Tiny stage-shell accessors may still live here when they only expose a stable UI-facing element or style hook.

