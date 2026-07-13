# WeChat Album Prompt Editor Orchestration Plan (2026-07-13)

## Goal

Move `openWechatAlbumPromptEditor()` out of the legacy album action facade
without changing editor state, profile preparation, option selection, or draft
contents.

## Boundary

- New owner: `publish/app/wechat/album-prompt-editor-orchestration.js`.
- Compatibility owner: `publish/wechat-album-actions.js` keeps the public
  `openWechatAlbumPromptEditor()` method and forwards context and arguments.
- Existing `albumPromptHelpers` and `albumPromptEditorHelpers` remain the pure
  option/draft providers.
- This slice does not touch prompt saving, selected-prompt updates, drawing,
  body-figure persistence, game save/load, or UI template code.

## Preserved Sequence

1. Resolve the current album contact.
2. Ensure player RPG state for `player-self`, otherwise ensure the WeChat user
   profile for the contact.
3. Read prompt options for the requested kind.
4. Build the draft from kind and current body-figure context.
5. Copy identity and body option keys into the draft.
6. Assign the draft and set `wechatAlbumPromptStep` to `edit`.

## Verification

- Facade test proves `this` and arguments are forwarded.
- Success tests prove player and NPC preparation branches, option lookup,
  draft key assignment, draft storage, and final editor step.
- Runtime coverage and dependency checks require the new module before the
  facade in Web and Android manifests.

## Stop Point

Do not move prompt generation, prompt persistence, image generation, or body
figure context creation in this slice.
