# Settings Actions Split Map (2026-07-12)

This note classifies `publish/settings-actions.js` before further refactor work.

## Why this file is higher risk
Unlike `save-actions.js` and `loading-actions.js`, this file mixes:
- provider integration
- local settings/bootstrap glue
- runtime store mutation
- model catalog loading
- connection testing
- UI-facing section/state helpers

So it should not be treated as an immediate thin-entry cleanup target.

## Current responsibility layers
### Layer 1: Provider/runtime state orchestration
These parts still belong close to runtime logic for now.

- `prepareActivationModelSetup()`
- `loadSettingsModels(force = false)`
- `fetchTextModelCatalog()`
- `testTextModelConnection()`
- any logic that coordinates:
  - `window.GameModules.aiProvider`
  - `window.GameModules.drawProvider`
  - `window.GameModules.tokenStats`
  - runtime `modelId`
  - provider-selected model synchronization

### Layer 2: Local settings/bootstrap glue
These are still coupled to activation/startup and should be treated as integration glue.

- interaction with `window.GameModules.localSettings`
- interaction with `window.GameModules.uiThemeActions`
- activation-page prefetch/prepare flow
- startup model fallback selection

### Layer 3: Candidate helper/view extraction zone
These are the best future low-risk split targets.

- readonly display shaping
- section-level field visibility/composition
- model option enrichment or display mapping that does not directly call providers
- pure selection/default-resolution helpers once detached from store mutation

## Recommended next-step strategy
1. Do not start by moving provider calls.
2. First identify pure helper functions that:
   - do not call provider APIs
   - do not write local settings
   - do not own async runtime orchestration
3. Extract those helpers to `publish/ui/settings/` or a focused settings helper module.
4. Keep `settings-actions.js` as the orchestration entry until the provider/bootstrap glue is thinner.

## Immediate conclusion
`publish/settings-actions.js` is currently:
- not removable
- not a thin compatibility shell
- a future split target, but only via helper-first extraction
