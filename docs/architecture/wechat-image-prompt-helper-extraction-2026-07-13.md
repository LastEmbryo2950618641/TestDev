# WeChat Image Prompt Helper Extraction - 2026-07-13

## Goal

Move WeChat image prompt context and tag collection utilities into the app helper layer while preserving the public `$store.game` action surface.

## Extracted Surface

- `wechatMemorySections`
- `wechatWearingContext`
- `cleanWechatImageTags`
- `buildWechatImageTags`

These helpers now live in `publish/app/wechat/image-prompt-helpers.js`.

## Compatibility

`publish/wechat-image-actions.js` remains the public facade. Existing image receive orchestration keeps calling the same method names.

## Risk Control

- The moved method bodies are compared against the previous `wechat-image-actions.js` implementation.
- Runtime manifests load `image-prompt-helpers.js` before `wechat-image-actions.js`.
- Android assets are synchronized from the Web `publish/` source.
- This extraction avoids changing draw provider calls, token recording for draw requests, album writes, or save orchestration.

## Cleanup Note

Do not delete `wechat-image-actions.js` yet. It still owns image receive orchestration and drawing-side effects.
