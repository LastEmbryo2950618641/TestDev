# WeChat Chat Orchestration Extraction (2026-07-13)

This note records the first guarded extraction of the live WeChat chat send/reply flow.

## What changed

- Added `publish/app/wechat/chat-orchestration.js`.
- Moved the implementations of:
  - `sendWechatMessage()`
  - `replyWechatContact(contact, playerText)`
  - `generateWechatReply(contact, playerText)`
- Kept the public `$store.game` methods exposed by `publish/wechat-chat-actions.js`.
- Updated Web and Android runtime manifests so `chat-orchestration.js` loads before `wechat-chat-actions.js`.
- Updated `npm run verify:wechat-chat-invariants` to guard the new ownership boundary.

## Why this is safe

The moved method bodies were copied exactly from the previous `wechat-chat-actions.js` implementation before changing the facade surface.

The invariant gate now checks:

- legacy public methods still exist as facades
- `wechat-chat-actions.js` no longer owns the orchestration implementations
- `chat-orchestration.js` owns the moved implementations
- send-message order is preserved
- reply success/failure/finally order is preserved
- reply generation order is preserved
- Web and Android load order is preserved

## What intentionally did not change

- public method names
- `wechatReplyPrompt()`
- prompt content
- message append timing
- save timing
- group-chat early return behavior
- direct-contact reply generation behavior
- memory, faction archive, and worldline recording order

## Current boundary

- `publish/wechat-chat-actions.js`: public compat facade plus prompt composition that still depends on store-level prompt sections.
- `publish/app/wechat/chat-orchestration.js`: send/reply orchestration using store state and existing public helper methods.
- `publish/app/wechat/chat-reply-helpers.js`: reply-support formatting, fallback, and validation helpers.

## Follow-up

Do not delete `wechat-chat-actions.js` yet. It is still the public store surface consumed by existing callers and merged into `game.js`.

The next safe follow-up is to audit whether `wechatReplyPrompt()` should stay in the public facade, move into a prompt-specific helper, or remain until broader prompt ownership is clarified.
