# WeChat Album Orchestration Extraction - 2026-07-13

## Goal

Move WeChat album contact/profile lookup and album photo list refresh logic out of the top-level legacy action entry while keeping the existing public `$store.game` methods stable.

## Boundary

- `publish/app/wechat/album-orchestration.js` owns contact/profile resolution and album photo list refresh helpers used by album flows.
- `publish/wechat-album-actions.js` remains the public compatibility facade.

## Public Methods Preserved

- `wechatContactFromState(id)`
- `wechatProfileContact()`
- `wechatAlbumContact(targetId)`
- `wechatAlbumPhotoListForContact(contact)`
- `wechatAlbumPhotoList()`
- `wechatAlbumPhoto()`
- `refreshWechatAlbum()`

## Compatibility Rule

Do not delete `publish/wechat-album-actions.js` yet. Other album body-figure and prompt methods still live there and continue to use the same public names.

## Verification

Runtime dependency verification now requires `app/wechat/album-orchestration.js` to load before `wechat-album-actions.js` in Web and Android manifests.
