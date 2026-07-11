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
## 2026-07-12 addendum: action parity refinement
Further inspection of the later section-based settings area confirms that the following action/status surfaces are already duplicated there as well:
- fetch text model catalog action button
- test text model connection action button
- connection/test status message rendering

This means the remaining uniquely old-block-coupled action surface is primarily:
- system role test action and result area

Updated practical reading:
- text field parity is already strong
- text action parity is mostly complete except for the system-role test surface
- old duplicated settings block is still not removable as a whole, but its cleanup blocker is now narrower than initially assessed

## 2026-07-12 addendum: system test duplication note
Further inspection shows that `system role test` is not only present inside the older duplicated settings block.
A dedicated `systemTestState.open` app surface already exists later in `publish/index.html` and provides the fuller test flow, including:
- system text input
- user text input
- run action
- result/error rendering
- additional thinking-test related fields

This changes the interpretation of the old settings-block `system role test` section:
- it is no longer the sole owner of that capability
- it behaves more like a historical shortcut / duplicate entry fragment
- cleanup risk should now be framed around whether that shortcut is still intentionally needed, not around loss of the underlying system-test capability itself
