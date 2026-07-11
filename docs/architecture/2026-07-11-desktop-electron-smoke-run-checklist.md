# 2026-07-11 Desktop Electron Smoke-Run Checklist

## Scope
- Add a minimal smoke-run checklist for the first controlled Electron trial on desktop.
- Reuse the execution checklist and explicit runtime branch instead of introducing a separate desktop readiness path.
- Focus only on the smallest meaningful host-run milestones before any live Electron launch.

## New artifacts
- `desktop/shell/electron-smoke-run-checklist.js`

## Checklist focus
1. window creation
2. preload expose
3. renderer load

## Step outputs
- `key`
- `priority`
- `action`
- `ready`
- `evidence`

## Verification command
- `node desktop/shell/electron-smoke-run-checklist.js`

## Verification result
- Desktop shell can now emit a smoke-run checklist derived from its existing execution/checklist/runtime branch layers.
- The checklist verifies:
  - BrowserWindow creation prerequisites
  - preload namespace expose prerequisites
  - renderer entry/load prerequisites
- The artifact stays shell-local and does not change gameplay modules.

## Why this matters
- This gives the project a safe first-run checklist before attempting an actual Electron smoke run.
- It reduces the chance of enabling the desktop branch without a clear minimum verification surface.
- It creates a concrete bridge from architecture work to the first host trial.

## Recommended next follow-up
- If the user wants to go further, install Electron locally and test the enabled runtime branch in a controlled smoke run.
- After that, record the first real desktop smoke-run results in a follow-up validation document.
