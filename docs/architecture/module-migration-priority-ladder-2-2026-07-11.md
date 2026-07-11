# Module migration priority ladder 2.0 (2026-07-11)

## Purpose

This document turns the current multi-module refactor progress into a practical next-step ladder.
It answers two questions for future AI / human work:

1. Which modules are safest to continue now?
2. Which surfaces inside each module are the best low-risk cut points?

The goal remains unchanged:

- lower coupling
- preserve gameplay logic
- reduce related-impact risk
- improve code reuse
- prepare the frontend layer for future Windows `exe` and Android `apk` shells

## Current proven sample status

### Tier A: proven sample modules

These modules already prove the migration pattern works.

#### `real-world`

Proven surfaces:

- `realWorldMapPanelView()`
- `realWorldMapInteriorPanelView()`
- `realWorldMapInfoPanelView()`

Why it matters:

- demonstrates shell / panel / modal layering
- demonstrates compat forwarders in action file
- demonstrates `publish/index.html` block replacement discipline

#### `event`

Proven surfaces:

- `eventPanelView()`
- `selectedEventDetailView()`

Why it matters:

- demonstrates a lighter module with panel + detail split
- demonstrates small-file stabilization before continuing display migration

#### `faction`

Proven surfaces:

- `selectedFactionOverviewView()`

Why it matters:

- demonstrates a heavier detail modal can still be split safely by only migrating its upper read-only zone first

## Priority ladder

### Priority 1: continue `faction` lower-risk read-only sections

Reason:

- helper layer is already rich
- upper modal area is already migrated
- the next useful surfaces are still read-only and visually self-contained

Recommended cut order:

1. relation chips section
2. change log section
3. archive list summary section
4. structure section header/notice wrapper

Do not jump first into:

- org chart behavior
- role dialog behavior
- generation / audit workflow

### Priority 2: finish `event` as a fully normalized light module

Reason:

- `event` is closest to becoming a complete reference module
- low behavior risk
- good candidate for showing how a small app should look after normalization

Recommended cut order:

1. event list rows wrapper
2. tab strip / list / detail combined app shell view only if it stays read-only
3. draft form labels only after panel/detail are stable

Avoid mixing with:

- event creation flow changes
- prompt-context behavior changes unless it is a stabilization-only turn

### Priority 3: `calendar` as the next lightweight module sample

Reason:

- visually small
- low branching behavior
- useful for showing cross-module consistency beyond modal-heavy apps

Recommended first cut:

1. calendar header + month navigation summary view
2. calendar grid day-cell wrapper rows

### Priority 4: `real-world` non-map read-only panels

Reason:

- map area is already a strong sample
- non-map zones can extend the sample breadth without re-opening riskier map internals

Recommended first cut:

1. function menu summary surface
2. read-only inventory/wearing summaries
3. real-world side panel summary cards

## Surface selection rules

Choose the next cut only if most of these are true:

- the surface is read-only
- the surface already calls 3 or more helpers directly from template
- the surface has a clear header/body/actions structure
- the surface can be validated with `node --check` and a template-range readback
- behavior changes are not required to complete the migration

Avoid as next cuts:

- save/load flows
- AI generation entrypoints
- multi-step mutation wizards
- high-coupling init logic

## Stabilization-before-migration rule

If a target file shows any of these conditions, do a stabilization-only turn first:

- garbled Chinese literals
- broken quoting
- BOM or encoding confusion
- syntax check failure
- mixed behavior and display edits in the same local block

This rule already proved useful for:

- `publish/index.html`
- `publish/event-actions.js`
- `publish/faction-actions.js`
- `publish/real-world-map-actions.js`

## Template migration rule

For medium and large surfaces, prefer:

- `x-data="{ view: ... }"`
- `x-effect="view = ..."`

and then bind only to `view.*`.

If repeated row collections exist, prefer precomputed rows from helper layer rather than constructing them inline in template.

## Validation minimum per turn

Every migration turn should leave behind:

1. syntax checks for touched JS files
2. Node-based readback of the affected template range when `index.html` changes
3. one validation note in `docs/plans/`

## Immediate next recommendation

Best next action after this document:

1. `faction` relation chips section view
2. `faction` change log section view
3. `event` list row wrapper view

That order keeps risk low while continuing to deepen one heavy module and one light module in parallel.
