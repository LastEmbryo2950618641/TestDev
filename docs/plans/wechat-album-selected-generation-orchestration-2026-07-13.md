# WeChat Album Selected Generation Orchestration Plan (2026-07-13)

## Goal

Move `generateWechatAlbumPhotoFromSelectedPrompt()` out of the legacy album
action facade while preserving prompt selection, fixed-tag normalization,
selected-list persistence, and generation ordering.

## Boundary

- New owner: `publish/app/wechat/album-selected-generation-orchestration.js`.
- Compatibility owner: `publish/wechat-album-actions.js` keeps the public
  method and forwards context and arguments.
- Existing prompt-list helper remains the pure selected-item update transform.
- Existing generation orchestration remains the image-generation boundary.

## Preserved Behavior

1. Read the selected prompt, then derive kind from selected prompt, draft, or
   `natural` fallback.
2. Resolve the album contact.
3. Derive source prompt from edited text or selected prompt text, then use the
   normalized fixed-tag result when truthy and the original source otherwise.
4. Derive negative prompt from edited negative text or selected prompt value.
5. When a selected prompt exists, replace only that item through the pure
   prompt-list helper and await one `save()` call.
6. After optional persistence, always call `generateWechatAlbumPhoto()` with
   the derived kind and `{ prompt, negativePrompt }`.
7. The public `generateWechatAlbumSelectedPhoto()` shortcut remains a thin
   wrapper that awaits the from-selected method and returns `undefined`.

## Verification

- Facade forwarding test preserves context and arguments.
- Selected-prompt flow asserts normalization input, helper arguments,
  save-before-generate ordering, and updated prompt map.
- No-selection flow asserts draft kind fallback, no save, and direct generation
  from edited prompt fields.

## Stop Point

Do not move prompt-list filtering, fixed-tag implementation, draw-provider
generation, token recording, or save implementation in this slice.
