# Real-World Map Stage Helper Boundary (2026-07-12)

This note records the current safe stopping point for `publish/ui/real-world/map-stage-view-helpers.js`.

## What is already safe in this helper

The following helper types are now considered safe residents of `map-stage-view-helpers.js`:

- stage shell accessors such as stage style and stage element lookup
- canvas element lookup
- readonly text shaping used by stage rendering preparation
- tiny display-only helpers that do not mutate runtime state

Current examples:

- `stageStyle()`
- `stageElement()`
- `canvasElement()`
- `wrapText()`
- `shortLabel()`

## Why these helpers are safe

These helpers are safe because they:

- do not write save data
- do not own runtime caches
- do not mutate viewport state
- do not write canvas width or height
- do not orchestrate draw order or interaction flow

They only expose stable UI-facing values or perform readonly text shaping.

## What should stay out for now

The following categories should remain in `publish/real-world-map-actions.js` for now:

- canvas sizing writes
- direct drawing commands
- hit-region construction
- pan / zoom / pointer interaction logic
- runtime cache reads and writes
- post-paint scheduling

Current examples that should stay out for now:

- `realWorldMapCanvasSize()`
- `realWorldMapRoundRect()`
- `realWorldMapDrawPill()`
- `drawRealWorldMapCanvas()`

## Why not move `realWorldMapCanvasSize()` yet

`realWorldMapCanvasSize()` looks small, but it is not readonly.
It reads viewport geometry, writes canvas pixel dimensions, and updates canvas style width and height.
That makes it runtime-adjacent rather than a pure UI-shaping helper.

## Why not move drawing helpers yet

`realWorldMapRoundRect()` and `realWorldMapDrawPill()` are reusable drawing helpers, but they still operate as direct canvas drawing primitives.
They are closer to render/runtime behavior than to readonly panel or view shaping.
If they move later, they should likely move into a runtime-adjacent map rendering helper boundary rather than the current readonly UI layer.

## Recommended next move

Prefer one of these next steps:

1. continue extracting only tiny readonly stage helpers when they have no runtime writes
2. stop this line temporarily and switch to another proven low-risk helper boundary
3. create a future runtime-adjacent real-world map rendering helper home before moving any direct canvas drawing primitives

## Practical rule

If a candidate stage helper touches `canvas.width`, `canvas.height`, viewport geometry, pointer state, hit regions, or draw calls, do not move it into `publish/ui/real-world/map-stage-view-helpers.js` yet.
