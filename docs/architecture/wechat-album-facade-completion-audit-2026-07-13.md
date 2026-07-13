# WeChat Album Facade Completion Audit (2026-07-13)

## Decision

`publish/wechat-album-actions.js` is no longer a legacy implementation file.
It is the intentional public compatibility facade that exports the stable
`window.GameModules.wechatAlbumActions` surface consumed by templates and the
game-store merge process.

Deleting this file would break the public registration boundary. Keeping it is
not a temporary migration compromise: its permanent responsibility is public
method forwarding only.

## Completion Evidence

- The facade exposes 39 preserved public methods.
- Every method accepts `...args` and directly calls one method under
  `window.GameModules.app.wechat` with the original `this` context.
- The facade contains no store-state assignment.
- The facade contains no local business variables or control flow.
- The facade contains no `await this.*` orchestration.
- `tests/wechat-album-facade.test.js` enforces these invariants.
- `npm run verify:wechat-album-facade` is the repeatable gate.

## Migrated Owners

Album behavior now lives under focused `publish/app/wechat/` modules for:

- contact/profile and album list queries
- profile and album navigation
- delete and mark-real side-effect flows
- body-profile generator setup and body-figure asset persistence
- prompt editor setup and selected-prompt generation
- generation request state, draw retry, photo packaging, and photo-map updates
- complete asynchronous album generation

## Cleanup Result

The old inline implementations have been removed from the root action file.
No further business extraction from this facade is required. Future changes
must update an owning helper/orchestration module and preserve the facade gate.

## Remaining Project Scope

This audit proves completion only for the WeChat album action boundary. It does
not prove completion of the repository-wide architecture, desktop packaging,
Android packaging, Web direct-launch behavior, or other legacy action modules.
