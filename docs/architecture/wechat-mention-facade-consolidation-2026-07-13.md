# WeChat Mention Facade Consolidation - 2026-07-13

## Goal

Keep the public WeChat mention action surface stable while moving the top-level entry closer to a pure compatibility facade.

This supports the larger multi-platform architecture goal:

- Web, desktop, and Android load the same browser-side helper modules.
- Top-level `publish/wechat-*.js` files remain stable public entry points during migration.
- Real mention behavior lives in focused helper modules under `publish/app/wechat/`.

## What changed

`publish/wechat-mention-actions.js` now uses declarative facade groups, matching the pattern already used by `publish/wechat-image-actions.js`.

The facade maps public method names to helper modules:

- `mentionInputHelper`: input insertion and message mention insertion
- `mentionBasePhotoHelper`: image mention ids and base-photo extraction
- `mentionReferenceHelpers`: message mention ids, image reference parsing, image-intent attachment
- `mentionViewHelpers`: mention source lists and prompt/context text assembly

`mention-view-helpers.js` now owns the view/helper implementations that the facade forwards to:

- `wechatImageMentionSources`
- `wechatMentionContextText`

## Compatibility rule

Do not delete `publish/wechat-mention-actions.js` yet.

It remains the public `$store.game` compatibility surface used by existing templates and runtime composition. Future migration should first prove that all call sites can consume the helper layer directly or through a newer explicit contract.

## Verification

The invariant verifier now checks:

- declarative mention facade groups
- generic mention module dispatch
- complete public method exposure
- helper ownership for mention input, base-photo, reference, and view behavior
- no mention business implementation leaking back into the legacy facade

Android assets must be synced after changes because the Android WebView shell embeds a copy of the `publish/` runtime.
