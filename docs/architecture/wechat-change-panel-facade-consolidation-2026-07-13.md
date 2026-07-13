# WeChat Change Panel Facade Consolidation - 2026-07-13

## Goal

Keep the existing change-reason panel public methods stable while removing the last local state mutation from `publish/wechat-change-panel-actions.js`.

## Boundary

- `publish/app/wechat/change-panel-orchestration.js` owns the `toggleWechatChangePanel(msg)` UI state mutation.
- `publish/ui/wechat/view-helpers.js` owns read-only change-panel presentation helpers.
- `publish/domain/wechat/change-panel-helpers.js` owns read-only state/rule helpers.
- `publish/wechat-change-panel-actions.js` remains the public compatibility facade.

## Compatibility Rule

Do not delete `publish/wechat-change-panel-actions.js` yet. It is still merged into the central game store and existing templates can call the same public method names.

## Verification

Runtime dependency verification now requires the view helper, domain helper, and app orchestration helper to load before `wechat-change-panel-actions.js` in Web and Android manifests.
