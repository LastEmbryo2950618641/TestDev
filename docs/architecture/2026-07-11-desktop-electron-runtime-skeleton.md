# 2026-07-11 Desktop Electron Runtime Skeleton

## Scope
- Add a minimal real Electron-oriented shell skeleton without rewriting shared gameplay modules.
- Keep the first real host entry points inside `desktop/shell/` so later Electron integration replaces shell-local files only.
- Reuse the existing unified host contract instead of starting a separate desktop runtime branch.

## New artifacts
- `desktop/shell/package.json`
- `desktop/shell/electron-main.js`
- `desktop/shell/electron-preload.js`
- `desktop/shell/electron-shell-verify.js`

## What the skeleton provides
- A shell-local `package.json` with an Electron-oriented main entry.
- A runtime main skeleton that resolves:
  - preload path
  - renderer entry path
  - BrowserWindow options from the unified host contract
- A runtime preload skeleton that exposes the current `platformBridge` payload shape.
- A verify script that proves the main/preload skeletons can be assembled without touching `publish/*` gameplay files.

## Verification command
- `node desktop/shell/electron-shell-verify.js`

## Verification result
- Desktop shell can now produce a real Electron-oriented main skeleton.
- Desktop shell can now produce a matching preload skeleton.
- The shell reuses the unified host contract and existing bridge payload shape.
- No gameplay module in `publish/*` is modified by this first real Electron entry layer.

## Why this matters
- This is the first step beyond architecture-only artifacts toward a genuine `exe` host entry path.
- Future Electron wiring can now replace shell-local skeleton internals instead of rediscovering structure or editing gameplay files.
- It creates a safer seam for adding actual Electron APIs later with lower coupling risk.

## Recommended next follow-up
- Replace the runtime skeleton bootstrap with actual Electron `app`, `BrowserWindow`, and `contextBridge` calls once the dependency is installed and the user wants the live host path activated.
- After that, add a dedicated packaging config step for desktop distribution.
