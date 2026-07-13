# WeChat Mention Input Helper Extraction - 2026-07-13

## Goal

Move WeChat mention input-box mutation into the app helper layer while preserving the public `$store.game` action surface.

## Extracted Surface

- `insertWechatMention`
- `mentionWechatMessage`

These helpers now live in `publish/app/wechat/mention-input-helper.js`.

## Compatibility

`publish/wechat-mention-actions.js` remains the public facade. Existing UI bindings can still call `insertWechatMention` and `mentionWechatMessage` through `$store.game`.

## Preserved Behavior

The extraction keeps the existing order for:

- reading current `wechatInput`
- adding a spacing gap only when the input does not already end with whitespace
- appending the requested mention token and trailing space
- constructing message mention tokens with the readable `@消息` prefix
- resolving message mention ids through `wechatMessageMentionId`

## Risk Control

- Runtime manifests load `mention-input-helper.js` before `wechat-mention-actions.js`.
- The WeChat invariant verifier checks that mention input implementation moved to the helper and that the facade only forwards calls.
- Existing UTF-8 mention guards cover `@消息`, `@图片`, `玩家`, and `联系人` text.
- Android assets are synchronized from the Web `publish/` source.

## Cleanup Note

Do not delete `wechat-mention-actions.js` yet. It remains the public compatibility facade for mention view, base-photo, reference, and input helper methods.
