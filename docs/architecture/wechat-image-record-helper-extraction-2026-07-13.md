# WeChat Image Record Helper Extraction - 2026-07-13

## Goal

Move the low-risk WeChat image record utilities out of the legacy image action file while preserving the public `$store.game` image action surface.

## Extracted Surface

- `wechatImageRecordText`
- `wechatImageReadRecord`
- `replaceWechatImageRecord`
- `replaceWechatImageRecordInMemory`
- `replaceWechatImageRecordInWorldline`

These helpers now live in `publish/app/wechat/image-record-helpers.js`.

## Compatibility

`publish/wechat-image-actions.js` remains the public facade. Existing UI bindings and image-generation orchestration keep calling the same methods.

## Risk Control

- The moved method bodies are compared against the previous `wechat-image-actions.js` implementation.
- Runtime manifests load `image-record-helpers.js` before `wechat-image-actions.js`.
- Android assets are synchronized from the Web `publish/` source.
- The extraction avoids changing image generation, draw provider calls, token recording, or album writes.

## Cleanup Note

Do not delete `wechat-image-actions.js` yet. It still owns image offer orchestration, confirmation UI state, prompt collection, draw calls, and album updates.
