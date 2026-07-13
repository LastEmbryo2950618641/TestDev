# WeChat Album Mark-Real Orchestration Plan (2026-07-13)

## Goal

Move `markWechatAlbumPhotoReal()` out of the legacy album action facade while
preserving photo-state updates, save ordering, and avatar-capture behavior.

## Boundary

- New owner: `publish/app/wechat/album-mark-real-orchestration.js`.
- Compatibility owner: `publish/wechat-album-actions.js` keeps the public
  method and forwards context and arguments.
- Existing `album-photo-state-helpers.js` remains the pure `real: true` list
  transform.
- Existing `autoCaptureWechatAvatar()` remains the avatar-capture boundary.

## Preserved Behavior

1. Resolve profile contact and current album list before any mutation.
2. Return without side effects when contact is absent or the indexed photo is
   missing.
3. Replace the photo map using the existing mark-real helper with the full map,
   contact ID, list, and index.
4. Await `save()` before invoking `autoCaptureWechatAvatar(index)`.
5. Preserve the default index of `0` and the public method signature contract.

## Verification

- Facade forwarding test preserves context and index argument.
- Valid flow asserts helper arguments, real flag update, save-before-avatar
  ordering, and exact index forwarding.
- Invalid flow asserts no state mutation, save, or avatar capture.
- Existing album target tests remain regression coverage.

## Stop Point

Do not move avatar image loading/crop logic, body-profile generation, or save
implementation in this slice.
