# WeChat Chat Reply Helper Extraction (2026-07-13)

This note records the second bounded cleanup pass for `publish/wechat-chat-actions.js`.

## What changed

- Added `publish/app/wechat/chat-reply-helpers.js`.
- Moved reply-adjacent helper ownership behind `window.GameModules.app.wechat.chatReplyHelpers`.
- Kept the legacy public `$store.game` method names alive through `wechatChatReplyForwarders`.
- Added the new helper module to Web and Android runtime manifests.
- Extended browser control validation to check both the public methods and the concrete helper module.

## Public API names preserved

- `wechatContactProfileText(contact, playerText)`
- `validateWechatReply(raw, contact)`
- `fallbackWechatReply(contact, text)`

## Why these helpers moved

These functions are reply-supporting helpers rather than chat entry orchestration:

- `wechatContactProfileText()` assembles contact profile text consumed by chat, image, and past-event prompt flows.
- `validateWechatReply()` normalizes generated reply JSON into the runtime shape.
- `fallbackWechatReply()` provides the unavailable-AI reply fallback.

Moving them reduces entry-file coupling while keeping all callers stable.

## What intentionally did not change

- `sendWechatMessage()`
- `replyWechatContact()`
- `generateWechatReply()`
- `wechatReplyPrompt()`
- message append timing
- save timing
- unread/latest-message behavior
- worldline and memory recording side effects

## Follow-up boundary

The next deeper split should not move send/reply orchestration until a dedicated invariant plan covers:

- self-message append before AI reply
- group chat early return behavior
- direct contact reply request id cancellation
- result application order
- image-intent pending message flow
- memory, faction archive, and worldline recording order
- final save and `wechatSending` reset behavior
