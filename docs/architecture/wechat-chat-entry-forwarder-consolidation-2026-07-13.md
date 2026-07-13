# WeChat Chat Entry Forwarder Consolidation (2026-07-13)

This note records a low-risk thinning pass for `publish/wechat-chat-actions.js`.

## What changed

- Introduced `wechatChatSessionForwarders` for public session APIs.
- Introduced `wechatChatMessageForwarders` for public message/time helper APIs.
- Replaced repeated one-line wrappers with shared facade registration loops.
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

## What intentionally did not change

- `sendWechatMessage()`
- `replyWechatContact()`
- `generateWechatReply()`
- prompt construction
- message persistence
- unread semantics
- contact selection behavior inside `app/wechat/chat-session.js`

## Why this is aligned

The entry file now more clearly separates:
- stable legacy public names on `$store.game`
- session/message helper ownership in `publish/app/wechat/`
- higher-risk outbound send and AI reply orchestration that should remain untouched until a dedicated plan exists

This advances the broader refactor without changing gameplay behavior or forcing caller migration.

## Next safe follow-up

Before extracting send/reply orchestration, first write a dedicated plan that names invariants for:
- self-message append behavior
- group-chat worldline recording
- direct-contact reply generation
- save timing
- unread/latest-message continuity
