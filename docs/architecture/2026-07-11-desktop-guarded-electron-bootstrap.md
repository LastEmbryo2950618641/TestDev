# 2026-07-11 Desktop Guarded Electron Bootstrap

## Scope
- Add a guarded bootstrap plan for the desktop Electron shell.
- Make the shell explicitly describe what happens when Electron is available versus unavailable.
- Preserve the current browser development path by keeping real Electron bootstrap optional and shell-local.

## Updated artifacts
- `desktop/shell/electron-main.js`
- `desktop/shell/electron-shell-verify.js`

## What the guarded bootstrap adds
- `createElectronGuardedBootstrapPlan(...)`
- An `adapterAvailable` flag
- A `fallbackMode` description when Electron is missing
- Ordered bootstrap steps when Electron is available:
  - `app.whenReady`
  - `new BrowserWindow(browserWindowOptions)`
  - `browserWindow.loadFile(rendererEntry)`
- Safe fallback steps when Electron is unavailable:
  - `skip-real-electron-bootstrap`
  - `keep-shell-verification-mode`

## Verification command
- `node desktop/shell/electron-shell-verify.js`

## Verification result
- Desktop shell now exposes a guarded bootstrap plan in addition to its optional real-call metadata.
- The shell explicitly describes both the real Electron path and the safe fallback path.
- Verification still succeeds without requiring Electron to be installed.

## Why this matters
- The project is now one step closer to an activatable Electron host path.
- Future sessions can turn the guarded plan into actual runtime execution with much lower ambiguity.
- This keeps host activation work isolated from gameplay modules and from the current browser-first dev path.

## Recommended next follow-up
- Turn the guarded plan into an actual runtime branch that executes real Electron APIs only when explicitly requested.
- Then add the first desktop smoke-run checklist around window open, preload expose, and renderer load.
