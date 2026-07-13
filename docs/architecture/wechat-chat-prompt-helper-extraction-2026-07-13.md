# WeChat Chat Prompt Helper Extraction (2026-07-13)

This note records the extraction of the effective WeChat chat reply prompt surface.

## Why this target changed

`publish/wechat-chat-actions.js` still contained a base `wechatReplyPrompt()` method, but the effective runtime prompt is extended by `publish/wechat-past-event-actions.js`.

`wechat-past-event-actions.js` runs after `wechat-chat-actions.js` in the WeChat runtime group and uses `Object.assign(window.GameModules.wechatChatActions || {}, ...)` to provide the effective `wechatReplyPrompt()` with the past-event query block.

Therefore the safe extraction target is the past-event prompt surface, not only the base prompt method.

## What changed

- Added `publish/app/wechat/chat-prompt-helpers.js`.
- Moved the implementations of:
  - `isWechatPastEventQuestion(text)`
  - `wechatPastEventContext(contact, playerText, state)`
  - `wechatReplyPrompt(contact, playerText)`
- Kept `publish/wechat-past-event-actions.js` as the public facade that extends `wechatChatActions`.
- Added the helper to Web and Android runtime manifests before `wechat-past-event-actions.js`.
- Extended `npm run verify:wechat-chat-invariants` to guard prompt helper ownership and load order.
- Extended browser validation to verify `chatPromptHelpers` is loaded.

## What intentionally did not change

- prompt template id: `wechat-chat-reply`
- prompt variable names
- past-event query trigger regex
- `pastEventQuery.query(...)` parameters
- memory/history/archive collection order
- public method names on `$store.game`

## Current boundary

- `publish/wechat-chat-actions.js`: legacy public facade and base prompt residue.
- `publish/wechat-past-event-actions.js`: prompt/past-event public facade extension.
- `publish/app/wechat/chat-prompt-helpers.js`: effective prompt and past-event context helper ownership.

## Follow-up

The base `wechatReplyPrompt()` still present in `publish/wechat-chat-actions.js` is likely shadowed by `wechat-past-event-actions.js` during the standard WeChat boot flow. Do not delete it until a dedicated callsite/load-order audit confirms no partial loader path depends on the base method before the past-event extension is loaded.
