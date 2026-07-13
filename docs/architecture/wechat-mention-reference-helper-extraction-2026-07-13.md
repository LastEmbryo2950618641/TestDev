# WeChat Mention Reference Helper Extraction - 2026-07-13

## Goal

Move low-risk WeChat mention reference utilities out of the legacy top-level action file while preserving the public `$store.game` method surface.

## Extracted Surface

- `wechatMessageMentionId`
- `wechatMentionedImages`
- `attachWechatMentionedImageIntent`

These helpers now live in `publish/app/wechat/mention-reference-helpers.js`.

## Compatibility

`publish/wechat-mention-actions.js` remains the public facade. Existing UI bindings and orchestration calls keep using the same method names, but the implementation delegates to `window.GameModules.app.wechat.mentionReferenceHelpers`.

## Risk Control

- The moved method bodies were compared with the previous `wechat-mention-actions.js` implementation.
- Runtime manifests load `mention-reference-helpers.js` before `wechat-mention-actions.js`.
- Android assets are synchronized from the Web `publish/` source instead of edited independently.
- `verify:wechat-chat-invariants` now checks the mention reference facade and manifest order.

## Cleanup Note

Do not delete `wechat-mention-actions.js` yet. It is still the public action surface used by UI templates and existing orchestration code.
