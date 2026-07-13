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

## Follow-up Extraction: Generation Start State

`publish/app/wechat/album-generate-helpers.js` now owns the pure
`wechatAlbumGenerationStartState()` helper. It packages the next request ID,
the busy-generation flag, and prompt-panel closing state without touching the
store or any provider. `publish/wechat-album-actions.js` remains responsible
for applying that returned state and continues to own the asynchronous draw,
save, avatar-capture, and error-handling orchestration.

This slice deliberately preserves the previous request-ID expression and the
existing draw-provider call order. The direct helper regression test lives in
`tests/wechat-album-generate-helpers.test.js`.
