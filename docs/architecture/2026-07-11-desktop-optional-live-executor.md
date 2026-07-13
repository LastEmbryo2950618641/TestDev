# 2026-07-11 Desktop Optional Live Executor

## Scope
- Add the last shell-local seam before the first true Electron window launch.
- Expose a final optional live executor layer without automatically executing a real window.
- Keep the execution boundary explicit and opt-in.

## New artifacts
- `desktop/shell/electron-optional-live-executor.js`
- `desktop/shell/electron-optional-live-executor-verify.js`

## Executor outputs
- `enabled`
- `executeMode`
- `plannedCalls[]`
- `result`

## Current behavior
- Disabled mode stays preview-only.
- Enabled mode exposes the ready-to-launch-real-window state when the underlying executor allows it.
- Real Electron window launch is still not automatically executed in this step.

## Verification command
- `node desktop/shell/electron-optional-live-executor-verify.js`

## Why this matters
- The project now has an explicit optional live executor directly above the controlled launch executor skeleton.
- This makes the final jump to the first true Electron launch extremely small and auditable.
- It preserves low coupling by keeping the final execution seam isolated to the desktop shell.
