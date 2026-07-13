# WeChat Album Generation Orchestration Plan (2026-07-13)

## Goal

Move the complete `generateWechatAlbumPhoto()` asynchronous flow out of
`publish/wechat-album-actions.js` while preserving the public method and every
observable state transition, side effect, call order, and error path.

## Ownership

- New owner: `publish/app/wechat/album-generation-orchestration.js`.
- Compatibility owner: `publish/wechat-album-actions.js` keeps
  `generateWechatAlbumPhoto()` and forwards the original context and arguments.
- Existing pure helpers continue to own request-state packaging, draw options,
  generated-photo packaging, and album photo-map transforms.
- Existing public methods continue to own draw retry, generated body-figure
  persistence, avatar capture, contact/profile loading, and game save behavior.

## Preserved Sequence

1. Return immediately when another album generation is active.
2. Resolve and validate the album contact before changing request state.
3. Capture body-figure context, increment request ID, mark generation active,
   and close the prompt editor.
4. Ensure player or contact profile state before validating prompt text.
5. Normalize fixed tags and safe replacements before creating draw options.
6. Record the token request before drawing and the response immediately after.
7. Stop stale requests after response recording without mutating album state.
8. Persist a generated body figure before packaging the album photo when body
   figure context is active.
9. Insert the photo, capture avatar when applicable, clear body-figure context,
   and save in the existing order.
10. Ignore errors from stale requests; otherwise preserve logging and
    `wechatError` behavior.
11. Clear the generating flag only when the finishing request is still current.

## Test-First Evidence

- Facade forwarding test for context and argument preservation.
- Normal-photo success test for request state, prompt processing, draw call,
  token response, photo insertion, save, and final busy-state cleanup.
- Empty-prompt failure test for error state and final busy-state cleanup.
- Stale-request test proving no photo/save/error mutation and no cleanup of the
  newer request's generating flag.
- Existing body-figure target test remains the integration evidence for asset
  persistence and avatar capture through the public method.

## Runtime Boundary

The new module loads after album generation/photo-state helpers and before
`wechat-album-actions.js` in Web and Android manifests. Runtime dependency
verification must enforce that ordering.

## Stop Point

Do not move `generateWechatAlbumPhotoFromSelectedPrompt()`, prompt-list save,
draw retry, body-figure asset persistence, photo-map helpers, avatar capture,
or game save implementation in this slice.
