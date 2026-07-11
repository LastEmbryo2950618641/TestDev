# 2026-07-11 Shared Host Runtime Contract Extraction

## Scope
- Extract the smallest neutral runtime contract that both desktop and mobile unified host contracts can map to.
- Keep host-specific behavior in platform shell files while moving only shared structural fields into a shared platform layer.
- Avoid leaking Electron or WebView objects into shared gameplay code.

## New artifacts
- `publish/platform/host/shared-runtime-contract.js`
- `desktop/shell/shared-runtime-contract-entry.js`
- `mobile/shell/shared-runtime-contract-entry.js`
- `desktop/shell/shared-runtime-contract-parity-verify.js`

## Shared contract fields
- `runtime`
- `hostKind`
- `shellLocalOnly`
- `publishTouched`
- `lifecycle.boot`
- `lifecycle.attach`
- `lifecycle.load`
- `lifecycle.teardown`
- `view.id`
- `view.title`
- `view.containerKind`
- `renderer.entry`
- `renderer.loadStrategy`
- `bridge.namespace`
- `bridge.assemblyReady`
- `mapper.readyHook`
- `mapper.attachApi`
- `mapper.loadApi`
- `mapper.focusApi`
- `mapper.reloadApi`
- `mapper.closeApi`
- `checkpoints`

## Verification command
- `node desktop/shell/shared-runtime-contract-parity-verify.js`

## Verification result
- Desktop unified host contract can map into the shared contract shape.
- Mobile unified host contract can map into the shared contract shape.
- Shared parity confirms:
  - same runtime family
  - shell-local-only preservation
  - no `publish/*` gameplay mutation in platform shells
  - shared field presence on both platforms

## Why this matters
- The project now has a real cross-platform runtime contract candidate instead of only parallel platform structures.
- Desktop and mobile can continue evolving independently at the shell layer while still reporting into one neutral shared contract.
- This is the first step toward true multi-end reuse without forcing false platform sameness.

## Constraint preserved
- No gameplay logic in `publish/game.js` or other core gameplay files was rewritten for this extraction.
- Electron-specific and WebView-specific semantics remain in `desktop/shell/*` and `mobile/shell/*`.

## Recommended next follow-up
- Use this shared runtime contract as the basis for future packaging/build orchestration metadata.
- Then identify whether save/files/host capability reporting can align to the same shared contract style.
