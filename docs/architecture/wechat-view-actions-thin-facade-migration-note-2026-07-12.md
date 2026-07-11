# WeChat View Actions Thin Facade Migration Note (2026-07-12)

This note records the first low-risk thinning pass for `publish/wechat-view-actions.js`.

## What changed
- `publish/wechat-view-actions.js` was reduced to a pure compat-forwarding surface
- `setWechatTab(tab)` was moved into `publish/ui/wechat/view-helpers.js`
- the legacy file now forwards every public method, including `setWechatTab`, through a single helper-forwarding path

## Why this is safer than changing callers first
Current caller evidence showed that `setWechatTab(tab)` is still referenced from:
- `publish/index.html`
- `publish/skills-definitions-apps.js`

Changing those callers first would have increased rollout surface without improving architecture quality immediately.
Moving the state mutation into the helper layer while preserving the legacy facade keeps:
- public method names stable
- `$store.game` call shape stable
- UI behavior stable
- migration risk low

## Architectural effect
Before this pass:
- `publish/wechat-view-actions.js` was mostly facade-like but still owned one local state mutation

After this pass:
- the file is now a true thin compat layer
- helper ownership is more internally consistent because the WeChat view state transition now lives with other WeChat view-facing behavior

## What did not change
- caller method names
- runtime merge surface through `gm.wechatViewActions`
- existing `$store.game.setWechatTab(...)` usage
- WeChat panel behavior expectations

## Why this matters for the broader refactor
This is the first real code-facing example of the intended cleanup strategy:
1. move residual local behavior into the newer structured layer
2. keep the old top-level file alive as a thin compat surface
3. verify behavior continuity before attempting caller migration or file deletion

## Next safe step
1. verify that no additional local logic remains in `publish/wechat-view-actions.js`
2. use this pattern as the reference approach for `publish/save-actions.js`
3. defer caller migration until a broader store-surface reduction plan is ready
