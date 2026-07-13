# 2026-07-11 Mobile Unified Host Contract Verification

## Scope
- Align mobile bootstrap/runtime-binding/runtime-adapter/host-runner/runtime-entry outputs behind one WebView-like host contract.
- Mirror the desktop unified host contract pattern so both platforms now have a single shell-local host authority.
- Keep all host assembly work outside `publish/*` gameplay modules.

## New artifacts
- `mobile/shell/unified-host-contract.js`
- `mobile/shell/unified-host-contract-verify.js`

## What the unified contract aggregates
- Bootstrap manifest and checkpoints
- Runtime binding draft
- Runtime execution plan
- Runtime adapter draft
- Host runner draft
- Runtime host action contract
- WebView-like mapper for host behavior

## Execution sequence represented
1. `webview-ready`
2. `attach-main-webview`
3. `load-renderer-entry`
4. `webview.requestFocus`
5. `webview.reload`
6. `destroy-webview`

## Verification command
- `node mobile/shell/unified-host-contract-verify.js`

## Verification result
- Existing mobile runtime entry helpers can execute against the unified host contract mapper.
- Mobile shell now has one authority for host semantics instead of separate assembly pieces.
- The unified contract exposes readiness checkpoints for:
  - lifecycle
  - window
  - load
  - assembly
  - binding
  - adapter
  - runner
  - mapper
- No shared gameplay file in `publish/*` is touched by this alignment layer.

## Why this matters
- Desktop and mobile now both have a unified host contract pattern.
- This makes future Electron/Capacitor/WebView integration more symmetric and lowers long-term platform coupling.
- It creates a safer base for deciding what can become a shared runtime contract later.

## Recommended next follow-up
- Update parity documentation so the unified host contract becomes an explicit cross-platform milestone.
- Then identify the smallest truly shared runtime contract that can sit above both unified host contracts without leaking Electron or WebView specifics.
