# Legacy Facade Migration Priority Table (2026-07-12)

This note converts the first verified facade candidates into an execution order for safe legacy-surface reduction.
The goal is not to delete files immediately.
The goal is to decide which legacy top-level entry surfaces can be thinned first with the lowest gameplay and platform risk.

## Priority rule
A file should move earlier in the queue when most of the following are true:
- most caller-facing behavior is already delegated into a newer structured module
- remaining local logic is small and explicit
- migration can be verified caller-by-caller
- the file is not a major state mutation hub
- changing it is unlikely to break save compatibility, prompt generation, or multi-platform assembly

A file should move later when it still owns:
- persistence orchestration
- runtime state synthesis
- heavy gameplay decisions
- cross-panel coupling
- host/platform-sensitive behavior

## Tier A: safest early migration targets

### 1. `publish/wechat-view-actions.js`
Priority: highest

Why it should go first:
- most methods already forward into `publish/ui/wechat/view-helpers.js`
- caller usage is concentrated around view-facing queries in `publish/index.html`
- the remaining residue is narrow: `setWechatTab(tab)`
- the file behaves much more like a compat view surface than a gameplay logic owner

Migration value:
- establishes the safest pattern for converting a legacy top-level file into a thinner compat shell
- reduces future temptation to put new WeChat display logic back into a legacy entry file
- improves UI-layer reuse without touching storage or plot logic

Main risk:
- low
- mainly tab/home view state continuity in existing WeChat panel flows

Recommended migration approach:
1. isolate `setWechatTab(tab)` ownership decision
2. keep pure forwarding methods intact as compat wrappers during caller migration
3. migrate caller expectations only after the state mutation home is stable

## Tier B: safe after one successful Tier A migration

### 2. `publish/save-actions.js`
Priority: medium

Why it should come after WeChat view actions:
- part of the file already behaves like a wrapper over `publish/ui/save/slot-view.js`
- caller surface is still understandable and bounded
- but it still owns save-meta refresh orchestration

Migration value:
- helps split display helpers from lightweight persistence inspection
- moves the project closer to a cleaner save/runtime boundary
- improves confidence that UI-oriented wrappers can be separated from storage probing logic

Main risk:
- medium
- save-slot freshness and slot metadata display depend on orchestration paths that still mutate local store state

Recommended migration approach:
1. keep `findEmptySaveSlot()` / `saveMeta()` / `formatSaveTime()` as display-oriented compat wrappers
2. separately classify `refreshSaveMetas()` and `refreshSaveMeta(slot)` as state orchestration
3. move orchestration only when a dedicated save-flow/state home is identified and verified

## Tier C: verify and split before any real thinning

### 3. `publish/worldline-actions.js`
Priority: medium-high complexity, lower cleanup priority

Why it should not be the first real thinning target:
- although it already has a visible forwarder map into `publish/ui/worldline/view-helpers.js`, it still owns meaningful runtime behavior
- it assembles real-world timeline data from live logs
- it persists worldline events and coordinates plot assignment
- it still owns some app-surface state transitions

Migration value:
- very high architectural value once split correctly
- can produce a cleaner distinction between display helpers, worldline state services, and compat entry surfaces
- directly supports long-term low-coupling goals around worldline/runtime reuse

Main risk:
- medium-high
- changes can affect worldline event continuity, save behavior, and narrative trace integrity

Recommended migration approach:
1. treat it as a mixed legacy orchestration surface, not a pure facade
2. first extract state/service ownership for `realWorldline()` and `updateWorldlineFromTurn(result)`
3. only then reduce the remaining top-level file toward a thinner compat layer

## Defer tier for now

### `publish/settings-actions.js`
Reason to defer:
- still contains substantial active orchestration logic
- cleanup risk is higher than the first verified candidates

### `publish/real-world-map-actions.js`
Reason to defer:
- still appears tightly coupled to panel/runtime behavior
- likely to require a broader service/view split before facade-style cleanup is safe

## Recommended execution order
1. `publish/wechat-view-actions.js`
2. `publish/save-actions.js`
3. `publish/worldline-actions.js`
4. reassess `settings-actions.js` and `real-world-map-actions.js` only after the first three produce reusable migration patterns

## Why this order best supports the project goal
This order aligns with the repository objective because it:
- minimizes gameplay regression risk
- builds repeatable migration patterns from low-risk to higher-risk files
- improves code reuse by moving view behavior toward structured modules first
- avoids mixing platform-shell work with gameplay cleanup work
- prepares old-code deletion based on evidence instead of file age or aesthetics

## Concrete next implementation target
The next practical code-facing target should be `publish/wechat-view-actions.js`.
It currently offers the best ratio of:
- low coupling risk
- high confidence in caller verification
- low likelihood of affecting save compatibility or narrative behavior

That makes it the best candidate for the first real thinning pass after the current documentation phase.
