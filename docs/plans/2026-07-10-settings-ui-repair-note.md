# Settings UI Helper Cluster Repair Note 2026-07-10

## Goal

Stabilize the `settings-actions.js` helper cluster after a failed incremental replacement attempt, without changing settings behavior or expanding the migration scope.

## Repaired cluster

The following helper cluster in `publish/settings-actions.js` was rebuilt into a clean compatibility-forwarding section:

- `aiOutputLimitEffectiveText`
- `selectedDrawModelId`
- `selectedDrawProviderId`
- `drawModelOptionLabel`
- `stage1MaterialMaxIterations`
- `stage1MaterialIterationLimitText`

The following nearby methods were intentionally kept local because they still own write/update behavior:

- `setAiOutputLimitMode`
- `setAiOutputLimitMax`
- `currentDrawModels`

## Result

`publish/settings-actions.js` now cleanly forwards UI-display helpers to:

- `publish/ui/settings/view-helpers.js`

without leaving duplicated definitions in the repaired cluster.

## Why this repair style was chosen

Earlier small string-based replacements proved too fragile for adjacent helper clusters.

The safer pattern for similar files is:

1. isolate the exact helper cluster
2. rebuild the whole cluster in one shot
3. keep neighboring write/orchestration methods local
4. verify the resulting line block directly

## Rule learned

For future UI migrations from legacy files:

- do not repeatedly patch the same adjacent helper cluster with many tiny replacements
- if a cluster becomes partially duplicated, stop and rebuild the cluster as one unit
- separate display helpers from write/orchestration methods before moving anything else
