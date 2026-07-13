# WeChat Incoming Orchestration Extraction - 2026-07-13

## Goal

Move incoming WeChat action application out of the top-level legacy action entry while keeping the existing public `$store.game` methods stable.

## Boundary

- `publish/app/wechat/incoming-orchestration.js` owns generated incoming message application, contact lookup, past-message time packaging, and incoming memory recording.
- `publish/wechat-incoming-actions.js` remains the public compatibility facade.

## Public Methods Preserved

- `applyWechatActions(actions)`
- `applyWechatIncomingAction(action)`
- `findWechatIncomingContact(value)`
- `wechatPastMessageTime(timeIso)`
- `wechatPastLabel(date)`

## Compatibility Rule

Do not delete `publish/wechat-incoming-actions.js` yet. `publish/real-world-actions.js` still calls `applyWechatActions`, and the central game store expects the top-level action bundle to remain mergeable.

## Verification

Runtime dependency verification now requires `app/wechat/incoming-orchestration.js` to load before `wechat-incoming-actions.js` in Web and Android manifests.
