# WeChat Album Profile Orchestration Plan (2026-07-13)

## Goal

Move contact-profile navigation methods out of the legacy album action facade
while preserving all public method names and asynchronous profile reuse.

## Boundary

- New owner: `publish/app/wechat/album-profile-orchestration.js`.
- Compatibility owner: `publish/wechat-album-actions.js` keeps
  `openWechatContactProfile()`, `backWechatContactProfile()`, and
  `openWechatAlbum()` as context-preserving forwarders.
- Existing contact selection, profile reuse, save, missing-role-card message,
  and templates remain unchanged.

## Preserved Behavior

### Open Profile

1. Update selected contact from explicit ID, current selection, or
   `player-self` fallback.
2. Return immediately when the selected contact is a group.
3. Set view and album mode to `profile`.
4. Resolve the selected contact again and return for missing/group contacts.
5. Reuse profile asynchronously; save when a state is returned, otherwise set
   the existing missing-role-card error message.
6. Preserve the existing warning-only promise rejection handling.

### Navigation

- Back from `album` switches only to `profile`.
- Back from profile switches view to `home` and keeps mode `profile`.
- Open album switches only `wechatAlbumMode` to `album`.

## Verification

- Facade tests cover all three public methods and argument/context forwarding.
- Normal contact test covers profile view/mode and save on successful reuse.
- Missing-profile test covers error assignment without save.
- Group test covers selection update with navigation/reuse short-circuit.
- Navigation tests cover both back levels and album entry.

## Stop Point

Do not move contact selection helpers, profile loading implementation, save,
templates, chat navigation, or avatar behavior in this slice.
