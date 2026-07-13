# WeChat Image Receive Orchestration Extraction - 2026-07-13

## Goal

Move the final WeChat image receive confirmation flow into the app helper layer while preserving the public `$store.game` action surface and the existing gameplay order.

## Extracted Surface

- `confirmWechatImageReceive`

This orchestration now lives in `publish/app/wechat/image-receive-orchestration.js`.

## Compatibility

`publish/wechat-image-actions.js` remains the public facade. Existing UI bindings and save data still call `confirmWechatImageReceive` through `$store.game`.

## Preserved Behavior

The extraction keeps the existing order for:

- pending-message lookup and duplicate-generation guard
- base-photo lookup and missing-photo error handling
- request-id stale response protection
- dynamic tag generation through `buildWechatImageTags`
- prompt rendering through `common-image-edit-generate`
- draw provider edit call and token statistics recording
- generated image URL validation
- album insertion
- image read-record replacement
- chat message completion update
- save, modal close, pending recovery, and generation flag cleanup

## Risk Control

- The moved method body is compared against the previous `wechat-image-actions.js` implementation.
- Runtime manifests load `image-receive-orchestration.js` before `wechat-image-actions.js`.
- Browser control-flow validation checks that `window.GameModules.app.wechat.imageReceiveOrchestration.confirmWechatImageReceive` is loaded.
- Android assets are synchronized from the Web `publish/` source.

## Cleanup Note

Do not delete `wechat-image-actions.js` yet. It still owns image offer creation and remains the compatibility facade for image record, UI, album, prompt, and receive orchestration methods.
