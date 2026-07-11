# WeChat View Actions Facade Verification Note (2026-07-12)

This note verifies whether `publish/wechat-view-actions.js` is currently close to true compat-facade status.

## File under review
- `publish/wechat-view-actions.js`

## Current structure
The file currently exports `window.GameModules.wechatViewActions` and contains:
- a series of methods that forward directly into `window.GameModules.wechatViewHelpers.*`
- one small local state mutation helper: `setWechatTab(tab)`

## Forwarding evidence
The following methods are pure forwarding wrappers in current worktree evidence:
- `wechatContacts()`
- `wechatThreadRows()`
- `wechatContactRows()`
- `wechatMeEntryRows()`
- `wechatChatsPanelView()`
- `wechatContactsPanelView()`
- `wechatAlbumPhotoRows()`
- `wechatAvatarCropView()`
- `wechatProfileHeaderView()`
- `wechatAlbumPromptChoiceView()`
- `wechatAlbumPromptListView()`
- `wechatAlbumPromptDetailView()`

These methods appear to exist primarily as a compat surface over the newer helper layer in `publish/ui/wechat/view-helpers.js`.

## Caller evidence
Current caller evidence shows:
- `publish/index.html` uses methods such as `wechatChatsPanelView()` and `wechatContactsPanelView()` through `$store.game`
- `publish/game.js` still merges `gm.wechatViewActions` into the store/action surface

This means the file is still live, but its live role appears to be forwarding access rather than owning the underlying view logic.

## Non-forwarding residue
The file still contains:
- `setWechatTab(tab)`

This is small but means the file is not yet a completely pure facade.
It still owns a local state transition for `wechatTab` and `wechatView`.

## Current conclusion
`publish/wechat-view-actions.js` is a strong first-tier legacy facade candidate because:
1. most methods are already thin forwarding wrappers
2. the underlying view logic clearly lives in the newer helper layer
3. the remaining non-forwarding behavior is small and explicit

## Safe next step
Do not delete the file yet.
The next safe move would be:
1. verify whether `setWechatTab(tab)` should remain here, move to a more appropriate action surface, or become the only residual compat method
2. keep the existing forwarding methods as a thin compat layer until caller migration strategy is finalized
3. only then evaluate whether the file can be reduced further or split into an even thinner facade
