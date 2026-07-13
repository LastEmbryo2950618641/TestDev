# WeChat Chat Entry Forwarder Consolidation (2026-07-13)

This note records a low-risk thinning pass for `publish/wechat-chat-actions.js`.

## What changed

- Replaced the older per-cluster forwarder objects with one declarative `wechatChatFacadeGroups` table.
- Kept `publish/wechat-chat-actions.js` as the public `$store.game` compatibility surface.
- Forwarded public methods to focused helper modules under `publish/app/wechat/`.
- Added browser validation coverage for the public WeChat chat helper API surface.

## Public API names preserved

Session-facing methods:
- `selectWechatContact()`
- `wechatMessageKey()`
- `wechatMessages()`
- `updateWechatLatest()`

Message/time helper methods:
- `appendWechatMessage()`
- `wechatMessageTime()`
- `wechatMemoryTime()`
- `wechatDialogueTimeLabel()`
- `formatWechatDialogueLog()`
- `wechatTimeValue()`
- `wechatTimeDisplay()`

Reply helper methods:
- `wechatContactProfileText()`
- `validateWechatReply()`
- `fallbackWechatReply()`

Send/reply orchestration methods:
- `sendWechatMessage()`
- `replyWechatContact()`
- `generateWechatReply()`

## What intentionally did not change

- prompt construction
- message persistence
- unread semantics
- contact selection behavior inside `app/wechat/chat-session.js`
- send/reply orchestration behavior inside `app/wechat/chat-orchestration.js`

## Why this is aligned

The entry file now more clearly separates:
- stable legacy public names on `$store.game`
- session/message/reply/orchestration helper ownership in `publish/app/wechat/`
- prompt ownership in `publish/app/wechat/chat-prompt-helpers.js`, surfaced through `publish/wechat-past-event-actions.js`

This advances the broader refactor without changing gameplay behavior or forcing caller migration.

## Current compatibility rule

Do not delete `publish/wechat-chat-actions.js` yet. It is still merged into the central game store and remains the compatibility bridge for existing templates and runtime callers.

The invariant verifier now guards:

- complete public method exposure through the declarative facade groups
- helper ownership for session, message, reply, orchestration, and prompt behavior
- send/reply execution order inside `chat-orchestration.js`
- Web and Android runtime load order
