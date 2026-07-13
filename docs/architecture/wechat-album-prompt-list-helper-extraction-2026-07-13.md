# WeChat Album Prompt List Helper Extraction - 2026-07-13

## Goal

Move pure WeChat album prompt list lookup and preview helpers out of the top-level legacy prompt-list action entry while keeping the existing public `$store.game` methods stable.

## Boundary

- `publish/app/wechat/album-prompt-list-helpers.js` owns prompt list filtering, selected prompt lookup, and prompt preview text extraction.
- `publish/wechat-album-prompt-list.js` remains the public compatibility entry and still owns generation, manual-save, and prompt-edit mutations.

## Public Methods Preserved

- `wechatAlbumPromptList(contact)`
- `wechatAlbumSelectedPrompt()`
- `wechatAlbumPromptListPreview(item)`

## Compatibility Rule

Do not move `generateWechatAlbumPromptOnly`, `openWechatAlbumPromptList`, `addWechatAlbumPrompt`, `selectWechatAlbumPrompt`, or `saveWechatAlbumManualPrompt` in this pass. Those methods still mutate prompt UI state or perform async generation/save orchestration.

## Verification

Runtime dependency verification now requires `app/wechat/album-prompt-list-helpers.js` to load before `wechat-album-prompt-list.js` in Web and Android manifests.
