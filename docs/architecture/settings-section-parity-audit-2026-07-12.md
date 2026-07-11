# Settings Section Parity Audit (2026-07-12)

This note compares the older duplicated settings block in `publish/index.html` with the later section-based settings surfaces.
Its purpose is to prevent premature cleanup before parity is confirmed.

## Scope compared
Old block:
- earlier activation/settings area in `publish/index.html`

New block:
- later section-based settings area driven by:
  - `textProviderSectionView()`
  - `textModelSectionView()`
  - `drawProviderSectionView()`
  - `drawModelSectionView()`

## Text settings parity
Covered by newer section-based surfaces:
- text provider selection
- DeepSeek base URL field
- DeepSeek API key field
- text model selection list

Still primarily coupled to the older block:
- fetch text model catalog action button
- test text model connection action button
- connection/test status message rendering
- system role test action and result area

## Draw settings parity
Covered by newer section-based surfaces:
- draw provider selection
- PixAI API Root field
- PixAI API Key field
- draw model selection list
- PixAI modelVersionId field
- PixAI mode field

Still coupled to direct template/store access even in the newer block:
- PixAI base URL value binding still reads from `$store.game.settingsState.pixaiBaseUrl`
- PixAI API key input still writes through direct `x-model` / store state
- draw provider/model selection still dispatches to store actions directly, which is acceptable for now because write-side orchestration has not moved

## Practical cleanup meaning
The older duplicated settings block is not yet removable as a whole.
It currently mixes:
- already-covered field surfaces
- still-unique action surfaces
- runtime test/status rendering

## Safe cleanup order
1. Continue treating the later section-based settings area as the primary migration target.
2. Do not add new long-term UI logic to the older duplicated block.
3. Migrate remaining action/status surfaces before removing the old block, especially:
   - fetch catalog action
   - connection test action
   - connection status display
   - system role test area
4. After action/status parity is proven, re-audit whether the old block can be deleted entirely.

## Current verdict
- field parity: partial to strong
- action parity: incomplete
- cleanup readiness for old duplicated block: not yet