# WeChat Album Delete Orchestration Plan (2026-07-13)

## Goal

Move `confirmDeleteWechatAlbumPhoto()` out of the legacy album action facade
while preserving validation, state transformation, confirmation closing, and
save ordering.

## Boundary

- New owner: `publish/app/wechat/album-delete-orchestration.js`.
- Compatibility owner: `publish/wechat-album-actions.js` keeps the public
  method and forwards the original context and arguments.
- Existing `album-photo-state-helpers.js` remains the pure list transform.
- Existing UI helper remains responsible for closing confirmation state.

## Preserved Behavior

1. Resolve profile contact, parse the stored delete index with `Number`, and
   read the current photo list in that order.
2. For missing contact, non-integer/negative index, or missing list item,
   close the confirmation and return without changing photos or saving.
3. For a valid item, apply the existing delete helper with the full photo map,
   contact ID, current list, and index.
4. Close confirmation before awaiting the single `save()` call.

## Verification

- Facade forwarding test preserves `this` and arguments.
- Valid deletion test asserts helper arguments, photo replacement, close-before-
  save ordering, and one save.
- Invalid deletion test asserts close-only behavior with no save.
- Existing album target and helper tests remain regression coverage.

## Stop Point

Do not move mark-real/avatar capture, contact profile loading, or any save/load
implementation beyond this one delete flow.
