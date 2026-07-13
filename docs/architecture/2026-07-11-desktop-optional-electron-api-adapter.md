# 2026-07-11 Desktop Optional Electron API Adapter

## Scope
- Add an optional real Electron API adapter layer without forcing Electron installation or immediate host activation.
- Keep real-call entry points shell-local so future Electron integration remains isolated from gameplay modules.
- Extend existing runtime skeleton files rather than creating a parallel host path.

## New artifacts
- `desktop/shell/electron-api-adapter.js`

## Updated artifacts
- `desktop/shell/electron-main.js`
- `desktop/shell/electron-preload.js`
- `desktop/shell/electron-shell-verify.js`

## What the adapter layer provides
- Attempts to load the `electron` module dynamically.
- Reports whether Electron APIs are currently available.
- Supplies optional real-call metadata for:
  - `app.whenReady`
  - `new BrowserWindow(options)`
  - `browserWindow.loadFile(entry)`
  - `contextBridge.exposeInMainWorld(...)`
- Keeps the desktop shell verifiable even when Electron is not installed.

## Verification command
- `node desktop/shell/electron-shell-verify.js`

## Verification result
- Desktop shell can now detect whether Electron is available without crashing when it is missing.
- Main/preload runtime skeletons now expose optional real-call layers.
- The real-call seam remains shell-local and still reuses the unified host contract and existing preload payload shape.

## Why this matters
- The project now has a safer bridge from architecture skeletons to real Electron APIs.
- Future activation can happen by installing Electron and replacing adapter internals, rather than redesigning the shell boundary.
- This reduces coupling risk while moving meaningfully closer to a real desktop `exe` path.

## Recommended next follow-up
- Add a guarded bootstrap path that executes real Electron calls only when the adapter is available and the user wants the shell activated.
- After that, add packaging metadata and a first-run desktop smoke checklist.
