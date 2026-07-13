# WeChat Image UI Helper Extraction - 2026-07-13

## Goal

Move WeChat image confirmation and preview UI-state helpers into the app helper layer while preserving the public `$store.game` action surface.

## Extracted Surface

- `openWechatImageConfirm`
- `closeWechatImageConfirm`
- `openWechatImagePreview`
- `closeWechatImagePreview`
- `wechatImageConfirmPromptText`
- `updateWechatImageMessage`

These helpers now live in `publish/app/wechat/image-ui-helpers.js`.

## Compatibility

`publish/wechat-image-actions.js` remains the public facade. Existing Alpine bindings and image-generation orchestration keep calling the same method names.

## Risk Control

- The moved method bodies are compared against the previous `wechat-image-actions.js` implementation.
- Runtime manifests load `image-ui-helpers.js` before `wechat-image-actions.js`.
- Android assets are synchronized from the Web `publish/` source.
- This extraction avoids changing image prompt generation, draw provider calls, album writes, token recording, or save orchestration.

## Cleanup Note

Do not delete `wechat-image-actions.js` yet. It still owns image receive orchestration and drawing-side effects.
