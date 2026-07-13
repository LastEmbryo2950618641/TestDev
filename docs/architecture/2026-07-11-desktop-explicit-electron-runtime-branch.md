# 2026-07-11 Desktop Explicit Electron Runtime Branch

## Scope
- Add an explicitly enabled runtime branch for the desktop Electron shell.
- Keep real Electron bootstrap disabled by default so browser-first development remains unchanged.
- Make the activation path explicit and verifiable before any future live host execution.

## Updated artifacts
- `desktop/shell/electron-main.js`
- `desktop/shell/electron-shell-verify.js`

## What the runtime branch adds
- `createElectronRuntimeBranch({ enabled })`
- Explicit disabled mode:
  - `skip-real-electron-bootstrap`
  - `wait-for-explicit-enable`
- Explicit enabled mode:
  - follows the guarded bootstrap steps
  - only reports `willExecuteRealBootstrap` when Electron is actually available
- Default bootstrap behavior remains disabled-by-default.

## Verification command
- `node desktop/shell/electron-shell-verify.js`

## Verification result
- Desktop shell now exposes both disabled and enabled runtime branch states.
- Real bootstrap remains opt-in even after the branch exists.
- Verification still works without installing Electron or changing gameplay modules.

## Why this matters
- The project now has a concrete activation seam for future desktop host trials.
- This lowers the risk of accidentally coupling Electron activation to current browser development.
- Future sessions can enable the branch intentionally and move into smoke-run work with clearer boundaries.

## Recommended next follow-up
- Add the first desktop smoke-run checklist around window creation, preload expose, and renderer load.
- Then decide whether to install Electron locally and test the enabled branch in a controlled way.
