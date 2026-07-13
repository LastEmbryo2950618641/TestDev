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

Generated body-figure persistence is now isolated in
`app/wechat/album-body-figure-asset-orchestration.js`. The facade keeps
`saveGeneratedBodyFigureAsset()` as a compatibility method, while the new
module owns only platform asset saving, entry registration, current-figure
binding, and the existing failure recovery. Album insertion, avatar capture,
and game save remain outside this boundary.

The complete `generateWechatAlbumPhoto()` async sequence is now owned by
`app/wechat/album-generation-orchestration.js`. The legacy action keeps the
same public method as a compatibility forwarder. Request staleness checks,
token recording, draw ordering, body-figure coordination, album insertion,
avatar capture, game save, and conditional busy-state cleanup remain in their
original order.

Prompt editor opening is now owned by
`app/wechat/album-prompt-editor-orchestration.js`. The facade retains the
public method while profile preparation, option lookup, draft key assignment,
and the `edit` step transition are isolated from drawing and persistence.

Body-profile image-generator opening is now owned by
`app/wechat/album-body-profile-generator-orchestration.js`. It resolves the
section target, assigns the selected contact, creates body-figure context,
opens the prompt dialog, clears its error state, and delegates to the existing
prompt-editor orchestration.

Album deletion is now owned by `app/wechat/album-delete-orchestration.js`.
The compatibility facade preserves the public method while the new module
keeps validation, pure photo-map transformation, confirmation closing, and
save ordering together as one small side-effect boundary.

Marking an album photo as real is now owned by
`app/wechat/album-mark-real-orchestration.js`. The public facade remains stable
while the new module keeps photo validation, pure state transformation,
save-before-avatar ordering, and index forwarding together.

Generating from the selected album prompt is now owned by
`app/wechat/album-selected-generation-orchestration.js`. The module preserves
prompt/draft fallback, fixed-tag normalization, selected-list update,
save-before-generation ordering, and the public generation handoff.

Contact profile opening and profile/album/home navigation are now owned by
`app/wechat/album-profile-orchestration.js`. Group short-circuit behavior,
asynchronous profile reuse, save-on-success, missing-profile errors, warning
handling, and two-level back navigation remain unchanged.
