# WeChat Worldline Orchestration Extraction - 2026-07-13

## Goal

Move WeChat dialogue worldline write orchestration out of the top-level legacy action entry while keeping the public `$store.game.recordWechatWorldline(...)` method stable.

## Boundary

- `publish/domain/worldline/wechat-event-service.js` builds the serializable worldline event object.
- `publish/app/wechat/worldline-orchestration.js` owns WeChat-specific event write orchestration.
- `publish/wechat-worldline-actions.js` remains the public compatibility facade.

## Compatibility Rule

Do not delete `publish/wechat-worldline-actions.js` yet. It is still merged into the central game store and is called by the WeChat chat send/reply orchestration.

## Verification

Runtime dependency verification now requires both:

- `domain/worldline/wechat-event-service.js`
- `app/wechat/worldline-orchestration.js`

to load before `wechat-worldline-actions.js` in Web and Android runtime manifests.
