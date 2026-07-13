# Cross-module display migration contract (2026-07-11)

## Purpose

This document turns recent successful refactors into a stable project-wide contract for future AI / human collaboration.
The goal is to keep gameplay logic unchanged while progressively reducing coupling, improving reuse, and preparing the frontend layer for future Windows `exe` and Android `apk` shells.

## Proven pattern

The current proven pattern is:

1. Real implementation lives in `publish/ui/<module>/...`
2. Legacy action files stay as compat shells
3. Templates consume a single `view object` whenever a surface is large enough to justify aggregation
4. Behavior changes and display refactors are not mixed in the same turn unless strictly necessary

## Required layering

### 1. UI helper layer

Place read-only display logic under:

- `publish/ui/real-world/`
- `publish/ui/event/`
- `publish/ui/faction/`
- future `publish/ui/<module>/`

Allowed responsibilities:

- label generation
- summary text generation
- list wrapping
- presentational grouping
- read-only state mapping
- section/detail/view object creation

Disallowed responsibilities:

- state mutation
- save/load chains
- init orchestration
- AI inference flow
- DOM querying unless already part of a view-only bridge boundary
- canvas drawing
- runtime cache mutation

### 2. Compat action layer

Action files such as:

- `publish/real-world-map-actions.js`
- `publish/event-actions.js`
- `publish/faction-actions.js`

should increasingly become compat forwarders.

Preferred shape:

- action entry remains stable for callers
- implementation forwards to `window.GameModules.ui.<module>.*`
- old public API stays available while templates are migrated gradually

### 3. Template layer

In `publish/index.html`, prefer:

- `x-data="{ view: ... }"`
- `x-effect="view = ..."`

and bind only to `view.*` fields for medium or large surfaces.

Avoid continuing to grow templates that directly call many separate store helpers.

## When to create a view object

Create a `view object` when a surface has one or more of these traits:

- 3 or more helper calls in the same local block
- mixed labels, summary text, rows, and empty states
- a header + body + actions pattern
- repeatable structure likely to be reused on desktop/mobile shells
- a modal/panel/detail surface that should be independently testable

## Naming contract

Use clear names by surface role:

- `...PanelView()` for panel shells
- `...DetailView()` for detail surfaces
- `...SectionView()` for section summaries
- `...Rows()` for repeated display rows
- `...SummaryView()` for compact read-only summaries

Examples already landed:

- `realWorldMapPanelView()`
- `realWorldMapInteriorPanelView()`
- `realWorldMapInfoPanelView()`
- `selectedEventDetailView()`
- `selectedFactionOverviewView()`

## Migration order

For each surface, use this order:

1. add helper-layer aggregation in `publish/ui/<module>/...`
2. add compat forwarder in action file if needed
3. switch template block to consume `view`
4. run syntax checks on touched JS files
5. document the migration in `docs/plans/`

## Encoding and Windows safety

For high-risk HTML files such as `publish/index.html`:

- do not trust PowerShell console rendering as the source of truth for Chinese text
- use Node to read/write UTF-8 and verify specific template ranges
- prefer exact block replacement or exact line-range rewrites via Node
- avoid broad search-and-replace through shell text operations

For JS files on Windows:

- avoid accidental BOM persistence
- when needed, rewrite with Node buffers and strip leading `U+FEFF`

## Validation minimum

For each migration turn, verify:

- touched JS files pass `node --check`
- target template range matches expected `view` consumption
- behavior-facing files are not widened beyond the intended display boundary
- a plan/validation note is written under `docs/plans/`

## Current proven sample modules

As of 2026-07-11, the pattern is proven in:

- `real-world`
- `event`
- `faction`

These modules should be treated as reference samples when migrating additional modules.

## Preferred next targets

Good next targets follow the same rules:

- `calendar` small panel summaries
- remaining `event` header/toolbar summaries
- additional `faction` read-only sections
- non-map `real-world` read-only panels

## Non-goals

This contract does not require:

- one-shot rewrite of legacy action files
- immediate removal of legacy helper APIs
- behavior rewrites disguised as display refactors
- forcing every tiny label into its own view object

The emphasis is steady normalization with low related-impact risk.
