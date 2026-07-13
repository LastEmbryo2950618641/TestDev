# WeChat History Context Helper Extraction - 2026-07-13

## Goal

Move WeChat fixed-history and memory-context utilities into the app helper layer while preserving the public `$store.game` action surface.

## Extracted Surface

- `ensureWechatHistoryTable`
- `saveWechatHistoryRow`
- `wechatHistoryCreatedAt`
- `listWechatHistoryRows`
- `wechatHistoryQueryText`
- `wechatHistoryText`
- `wechatMemoryContext`
- `validateWechatHistoryDecision`
- `wechatHistoryContextForReply`
- `wechatHistoryQueryHint`

These helpers now live in `publish/app/wechat/history-context-helpers.js`.

## Compatibility

`publish/wechat-memory-context-actions.js` remains the public facade mixed into the game store. Existing callers keep using the same method names.

## Risk Control

- The helper was generated from the previous action object so Chinese prompt text and SQL behavior remain unchanged.
- Runtime manifests load `history-context-helpers.js` before `wechat-memory-context-actions.js`.
- Android assets are synchronized from the Web `publish/` source.
- `verify:wechat-chat-invariants` checks the facade, helper ownership, and manifest order.

## Cleanup Note

Do not delete `wechat-memory-context-actions.js` yet. It is still the compatibility surface used by `game.js` and `remerge-game-store.js`.
