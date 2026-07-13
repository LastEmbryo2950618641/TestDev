# WeChat App Orchestration Extraction - 2026-07-13

## Goal

Move WeChat app open/close orchestration out of the top-level legacy action entry while keeping the existing public `$store.game` methods stable.

## Boundary

- `publish/app/wechat/app-orchestration.js` owns WeChat app visibility and selected-contact identity jump orchestration.
- `publish/wechat-app-actions.js` remains the public compatibility facade.

## Public Methods Preserved

- `openWechatApp()`
- `closeWechatApp()`
- `openWechatIdentity()`

## Compatibility Rule

Do not delete `publish/wechat-app-actions.js` yet. It is still merged into the central game store and is called by desktop UI bindings and app skill definitions.

## Verification

Runtime dependency verification now requires `app/wechat/app-orchestration.js` to load before `wechat-app-actions.js` in Web and Android manifests.
