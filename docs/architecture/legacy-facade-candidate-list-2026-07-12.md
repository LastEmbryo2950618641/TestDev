# Legacy Facade Candidate List (2026-07-12)

This list identifies the first top-level `publish/` files that appear closest to compat-facade status and are therefore the safest starting points for later cleanup verification.

## Candidate selection rule
A legacy top-level file is only a facade candidate if it already shows most of these traits:
- forwards view or helper calls into a newer structured module
- contains thin wrapper logic rather than deep gameplay state mutation
- can plausibly be verified caller-by-caller
- appears easier to thin further without touching core runtime behavior

## First candidate tier
### 1. `publish/wechat-view-actions.js`
Why it is a candidate:
- almost entirely forwards to `wechatViewHelpers`
- strongly resembles a compat view-action surface
- lower risk than broader wechat runtime/action files

### 2. `publish/save-actions.js`
Why it is a candidate:
- already resolves into `ui.save.slotView`
- helper-style wrappers are visible for save-slot display concerns
- likely suitable for verifying facade status around save panel presentation first

### 3. `publish/worldline-actions.js`
Why it is a candidate:
- includes explicit helper forwarder mapping for worldline display concerns
- appears to mix real logic with a visible forwarding layer, making it a good verification candidate before any cleanup

## Not first-tier candidates yet
### `publish/settings-actions.js`
Reason:
- still contains substantial active orchestration logic
- not yet close enough to pure facade status

### `publish/real-world-map-actions.js`
Reason:
- still appears to carry meaningful panel/runtime logic and map behavior coupling
- higher cleanup risk than pure forwarding candidates

## Recommended next step
Do not clean these files yet.
Instead, verify the first-tier candidates one by one:
1. identify live callers
2. confirm which methods are already pure forwarding
3. determine whether the file can be reduced to thinner compat surface
4. only then consider deeper consolidation or deletion
