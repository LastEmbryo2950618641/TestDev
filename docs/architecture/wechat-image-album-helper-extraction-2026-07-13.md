# WeChat Image Album Helper Extraction - 2026-07-13

## Goal

Move WeChat image album lookup and insertion utilities into the app helper layer while preserving the public `$store.game` action surface.

## Extracted Surface

- `wechatRealPhotoForContact`
- `addWechatImageToAlbum`

These helpers now live in `publish/app/wechat/image-album-helpers.js`.

## Compatibility

`publish/wechat-image-actions.js` remains the public facade. Existing image receive orchestration keeps calling the same method names.

## Risk Control

- The moved method bodies are compared against the previous `wechat-image-actions.js` implementation.
- Runtime manifests load `image-album-helpers.js` before `wechat-image-actions.js`.
- Android assets are synchronized from the Web `publish/` source.
- This extraction avoids changing image prompt generation, draw provider calls, token recording, or save orchestration.

## Cleanup Note

Do not delete `wechat-image-actions.js` yet. It still owns image receive orchestration and drawing-side effects.
