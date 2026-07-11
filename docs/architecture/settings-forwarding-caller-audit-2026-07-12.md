# Settings Forwarding Caller Audit (2026-07-12)

This note records which `settings-actions.js` forwarding facade methods are still directly consumed by page/store callers.

## Direct template/store-facing dependencies confirmed
The following methods are still called directly from `publish/index.html` or other runtime callers through `$store.game.*` and therefore should remain exposed for now.

- `aiOutputLimitKinds()`
- `aiOutputLimitEffectiveText(kind)`
- `currentDrawModels()`
- `drawModelOptionLabel(model)`
- `selectedDrawProviderId()`
- `selectedDrawModelId()`
- `stage1MaterialIterationLimitText()`
- `stage1MaterialMaxIterations()`
- `textModelOptionLabel(model)`
- `textModelSectionView()`
- `textProviderSectionView()`
- `drawModelSectionView()`
- `drawProviderSectionView()`

## Direct template/store-facing callsite snapshot
Confirmed direct usages in `publish/index.html` currently include:

- text model `<option>` labels via `$store.game.textModelOptionLabel(model)`
- draw model `<select>` value and option labels via:
  - `$store.game.selectedDrawModelId()`
  - `$store.game.currentDrawModels()`
  - `$store.game.drawModelOptionLabel(model)`
- settings status summaries via:
  - `$store.game.selectedDrawProviderId()`
  - `$store.game.selectedDrawModelId()`
  - `$store.game.stage1MaterialIterationLimitText()`
  - `$store.game.aiOutputLimitEffectiveText('stage3')`
- settings app section composition via:
  - `$store.game.textProviderSectionView()`
  - `$store.game.textModelSectionView()`
  - `$store.game.drawProviderSectionView()`
  - `$store.game.drawModelSectionView()`
- settings constraints UI via:
  - `$store.game.stage1MaterialMaxIterations()`
  - `$store.game.aiOutputLimitKinds()`
  - `$store.game.aiOutputLimitEffectiveText(item.kind)`

## Internal/helper-facing dependencies confirmed
Some forwarding methods are primarily consumed by `publish/ui/settings/view-helpers.js` itself or by adjacent helper composition, for example:

- `currentTextModelRows()`
- `currentDrawModelRows()`
- `currentSettingsSummaryRows()`
- `currentModelSummaryView()`
- `stage1MaterialSettingView()`
- `aiOutputLimitSectionView()`
- `settingsSummaryView()`
- `aiOutputLimitRows()`
- `aiOutputLimitPrefix(kind)`

## Practical implication
Do not remove or rename the direct template/store-facing forwarding methods yet.
They are still part of the active `$store.game` surface.

## Safer next-step path
1. Keep the forwarding facade stable.
2. Only shrink it after callers are redirected or a stable alternative facade is introduced.
3. Focus future low-risk refactor work on:
   - provider/runtime extraction boundaries
   - dedicated settings state helper boundaries
   - caller-side migration if facade reduction becomes desirable
4. Prefer batching caller migration by section surface, for example:
   - draw-model section callers as one slice
   - text-provider/model section callers as one slice
   - output-limit and summary callers as one slice