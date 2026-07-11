# Settings Helper Extraction Candidates (2026-07-12)

This note records the first low-risk helper candidates discovered inside `publish/settings-actions.js`.

## Confirmed already-owned-by-viewHelpers helpers
The following methods are already fully implemented under `publish/ui/settings/view-helpers.js` and `settings-actions.js` currently acts as a thin forwarding layer for them.

- `textModelOptionLabel(model)`
- `currentTextModelRows()`
- `aiOutputLimitKinds()`
- `aiOutputLimitRows()`
- `aiOutputLimitPrefix(kind)`
- `aiOutputLimitEffectiveText(kind)`
- `selectedDrawModelId()`
- `selectedDrawProviderId()`
- `currentDrawModels()`
- `currentDrawModelRows()`
- `textModelSectionView()`
- `drawModelSectionView()`
- `textProviderSectionView()`
- `drawProviderSectionView()`
- `currentSettingsSummaryRows()`
- `currentModelSummaryView()`
- `stage1MaterialSettingView()`
- `aiOutputLimitSectionView()`
- `drawModelOptionLabel(model)`
- `stage1MaterialMaxIterations()`
- `stage1MaterialIterationLimitText()`
- `settingsSummaryView()`

## Practical implication
These methods do not need a second logic extraction pass.
The safer next step is to decide whether the top-level forwarding surface should be reduced, while preserving callers.

## Next low-risk candidates after this discovery
The next functions worth reviewing are the ones that still perform lightweight state-derived computation but are not provider-orchestration heavy, for example:
- `aiOutputLimitMode(kind)`
- `aiOutputLimitMax(kind)`
- any pure model-label/row derivation that does not trigger provider calls

## Caution
Do not remove the forwarding methods until all callers are verified to consume `window.GameModules.ui.settings.viewHelpers` directly or through a stable facade.
