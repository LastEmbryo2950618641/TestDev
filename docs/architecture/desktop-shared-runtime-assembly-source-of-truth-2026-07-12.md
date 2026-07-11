# Desktop Shared Runtime Assembly Source-of-Truth Note (2026-07-12)

This note records the current desktop shell source-of-truth and runtime assembly model so later cleanup and packaging decisions can distinguish shared runtime source code from desktop host-only assembly files.

## Conclusion
- The shared gameplay/runtime source of truth remains the repository root `publish/` tree.
- The desktop shell does not currently maintain a second mirrored `publish/` tree under `desktop/`.
- Instead, desktop packaging includes the root `publish/` directory directly into the packaged desktop app.
- Desktop-specific code stays in `desktop/shell/` and is responsible for host bootstrapping, preload exposure, bridge assembly, and packaging only.

## Code evidence
### Packaging includes root publish directly
`desktop/shell/desktop-packaging-config.js` defines a `files` entry:
- `from: <project-root>/publish`
- `to: 'publish'`

This means the packaged desktop app carries the shared runtime directly from the repository root source tree during packaging.

### Packaging paths resolve publish from project root
`desktop/shell/desktop-packaging-paths.js` resolves:
- project root from `desktop/shell/`
- shared runtime path from `<project-root>/publish`

This confirms that desktop packaging treats root `publish/` as the authoritative runtime source.

### Desktop runtime drafts point to publish/index.html
`desktop/shell/main.js` declares:
- `sharedEntry: 'publish/index.html'`
- `url: 'publish/index.html'`

`desktop/shell/electron-main.js` also describes the runtime load step as `browserWindow.loadFile(entry)`.

This shows the desktop host is intended to load the packaged shared runtime entry rather than a desktop-local gameplay copy.

## Documentation evidence
`desktop/README.md` states:
- reuse the shared runtime and static assets from `publish/`
- desktop shell should not directly carry gameplay logic

`desktop/shell/README.md` also states:
- this directory should not carry shared gameplay modules
- current work should stay focused on host-layer entry, preload, bridge, and packaging

## Governance implication
### What desktop/shell is
- host bootstrap and lifecycle wiring
- preload / bridge / storage / host capability assembly
- packaging and distribution config
- desktop-only adaptation around the shared runtime

### What desktop/shell is not
- not the authoritative place to edit gameplay logic
- not a second gameplay runtime source tree
- not a replacement for `publish/` as the shared runtime source of truth

## Desktop vs Android difference
Current multi-platform assembly differs in an important way:
- Android currently syncs selected shared-runtime paths into `app/src/main/assets/publish/`
- Desktop packaging currently includes root `publish/` directly into the packaged app

So:
- Android has a mirrored packaging tree under host assets
- Desktop currently has packaging-time inclusion without a desktop-local mirrored runtime tree

## Safe policy for now
1. Keep shared gameplay/runtime edits rooted in `publish/`.
2. Keep desktop-only code inside `desktop/shell/`.
3. Do not duplicate gameplay modules into `desktop/` just to simplify packaging.
4. Treat `desktop/shell/dist/` and similar outputs as packaging artifacts, not source.
5. Continue evaluating whether desktop and Android should converge further on a more unified assembly contract later.

## Recommended next step
The next safe move is to compare desktop packaging-time inclusion against Android asset-sync materialization and decide whether future multi-platform assembly should standardize on:
- direct packaging inclusion
- explicit materialization/sync
- or a shared build-time assembly contract with platform-specific final adapters
