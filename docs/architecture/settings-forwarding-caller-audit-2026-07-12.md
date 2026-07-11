# Settings Forwarding Caller Audit (2026-07-12)

This note records which `settings-actions.js` forwarding facade methods are still directly consumed by page/store callers.

## Direct template/store-facing dependencies confirmed
The following methods are still called directly from `publish/index.html` or other runtime callers through `$store.game.*` and therefore should remain exposed for now.

- `aiOutputLimitKinds()`
- `aiOutputLimitEffectiveText(kind)`
- `currentDrawModels()`
- `selectedDrawProviderId()`
- `selectedDrawModelId()`
- `stage1MaterialIterationLimitText()`
- `stage1MaterialMaxIterations()`
- `textModelOptionLabel(model)`
- `textModelSectionView()`
- `textProviderSectionView()`

## Internal/helper-facing dependencies confirmed
Some forwarding methods are primarily consumed by `publish/ui/settings/view-helpers.js` itself or by adjacent helper composition, for example:
- `currentTextModelRows()`
- `currentDrawModelRows()`
- `drawModelSectionView()`
- `drawProviderSectionView()`
- `currentSettingsSummaryRows()`
- `currentModelSummaryView()`
- `stage1MaterialSettingView()`
- `aiOutputLimitSectionView()`
- `settingsSummaryView()`

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
