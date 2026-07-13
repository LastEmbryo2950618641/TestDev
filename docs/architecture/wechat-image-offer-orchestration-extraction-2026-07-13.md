# WeChat Image Offer Orchestration Extraction - 2026-07-13

## Goal

Move WeChat image offer creation and recording into the app helper layer while preserving the public `$store.game` action surface and the existing gameplay order.

## Extracted Surface

- `appendWechatPendingImageMessage`
- `recordWechatImageOffer`

These orchestration methods now live in `publish/app/wechat/image-offer-orchestration.js`.

## Compatibility

`publish/wechat-image-actions.js` remains the public facade. Chat reply orchestration still calls `appendWechatPendingImageMessage` through `$store.game`, and the method name remains stable for saved UI bindings or future scripts.

## Preserved Behavior

The extraction keeps the existing order for:

- contact name fallback
- generated image id creation
- image description normalization and truncation
- phone/WeChat time lookup and dialogue label formatting
- pending image chat message append
- image offer memory recording for the contact and `player-self`
- memory promotion and compaction
- worldline event seed/id construction
- duplicate worldline event replacement
- final append-worldline-event call

## Risk Control

- The moved method bodies are compared against the previous `wechat-image-actions.js` implementation.
- Runtime manifests load `image-offer-orchestration.js` before `wechat-image-actions.js`.
- Browser control-flow validation checks that `window.GameModules.app.wechat.imageOfferOrchestration.appendWechatPendingImageMessage` is loaded.
- Android assets are synchronized from the Web `publish/` source.

## Cleanup Note

Do not delete `wechat-image-actions.js` yet. It is now mostly a compatibility facade for image record, UI, album, prompt, receive orchestration, and offer orchestration methods. Remove or collapse it only after all public `$store.game` registrations and saved entry expectations have been audited.
