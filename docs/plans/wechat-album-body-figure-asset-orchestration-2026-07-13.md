# WeChat Album Body Figure Asset Orchestration Plan (2026-07-13)

## Goal

Move generated body-figure asset persistence out of
`publish/wechat-album-actions.js` while preserving the public
`saveGeneratedBodyFigureAsset()` method and all observable behavior.

## Classification And Boundary

- Change type: small application orchestration around the existing platform
  asset adapter.
- New owner:
  `publish/app/wechat/album-body-figure-asset-orchestration.js`.
- Compatibility owner: `publish/wechat-album-actions.js` keeps the public
  method and forwards with the original `this` context and arguments.
- This slice does not change game save/load/restore, draw-provider calls,
  album photo insertion, avatar capture, or request cancellation.
- The existing `platform.core.assets.bodyFigure.saveImage` contract remains
  the only storage boundary used by this flow.

## Preserved Behavior

1. Build metadata before entering the persistence `try` block.
2. Capture one timestamp and pass it with image URL, owner ID, kind, and meta.
3. Parse a missing or invalid JSON response as an empty object.
4. Treat a non-OK HTTP response or `{ ok: false }` payload as failure.
5. Register the returned entry before binding it as the current figure.
6. Preserve fallback metadata for registration when response metadata is absent.
7. Preserve contact-name fallback and `{ stateKind, force: true }` binding options.
8. Return response data on success; return `null` and set `wechatError` on failure.

## Runtime Ordering

The new module must load after `album-body-figure-helpers.js` and before
`wechat-album-actions.js` in Web and Android runtime lists. The dependency
verifier must enforce the facade ordering.

## Test-First Verification

- Facade test proves the public method delegates without changing arguments or
  `this` context.
- Success test proves save, register, bind, and return ordering/data.
- Failure test proves `null` return and the existing user-facing error update.
- Existing album target tests continue proving generated-photo and avatar flows.
- Runtime coverage, dependency order, asset parity, Android sync, syntax, and
  diff checks must pass before commit.

## Stop Point

Do not move album photo insertion, `save()` calls, avatar capture, draw retries,
or request-state cleanup in this slice. Those remain separate migration units.
