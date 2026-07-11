# Settings Forwarding Facade Map (2026-07-12)

This note isolates the methods in `publish/settings-actions.js` that currently act as pure forwarding facade over `window.GameModules.ui.settings.viewHelpers`.

## Confirmed pure forwarding facade methods
- `aiOutputLimitEffectiveText()`
- `aiOutputLimitKinds()`
- `aiOutputLimitPrefix()`
- `aiOutputLimitRows()`
- `aiOutputLimitSectionView()`
- `currentDrawModelRows()`
- `currentDrawModels()`
- `currentModelSummaryView()`
- `currentSettingsSummaryRows()`
- `currentTextModelRows()`
- `drawModelOptionLabel()`
- `drawModelSectionView()`
- `drawProviderSectionView()`
- `selectedDrawModelId()`
- `selectedDrawProviderId()`
- `settingsSummaryView()`
- `stage1MaterialIterationLimitText()`
- `stage1MaterialMaxIterations()`
- `stage1MaterialSettingView()`
- `textModelOptionLabel()`
- `textModelSectionView()`
- `textProviderSectionView()`

## What this means
These methods already have their implementation owned by `publish/ui/settings/view-helpers.js`.
At the `settings-actions.js` level they now mainly provide:
- a stable top-level facade for existing callers
- compatibility while callers still access `$store.game.*` methods directly

## Practical next-step options
1. Keep the facade as-is while continuing other low-risk refactors.
2. Audit callers and gradually reduce the forwarding surface only after direct dependencies are understood.
3. Do not count these methods as remaining "logic to extract"; that extraction is already complete.

## Separate from future settings state helper work
Do not mix this forwarding-facade layer with:
- provider/runtime orchestration
- local settings/bootstrap glue
- normalized settings-state accessors such as `aiOutputLimitMode()` / `aiOutputLimitMax()`
