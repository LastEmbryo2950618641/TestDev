# WeChat App Helpers

This directory stores WeChat-specific helper modules that have already been extracted away from top-level legacy action files.

## Purpose

The goal of this directory is to hold small, reusable, non-entry helper surfaces so that:

- top-level `publish/wechat-*.js` files can keep shrinking into compat and orchestration shells
- WeChat query, formatting, and helper logic can be reused without dragging in whole action files
- later desktop/mobile/web convergence can share the same browser-side helper boundaries more safely

## Current modules

### `chat-session.js`
- current-contact selection flow
- chat message key selection
- default message list selection
- latest-message/unread update flow

### `chat-message-helpers.js`
- message append helpers
- WeChat message time packaging
- dialogue label and formatting helpers
- readonly time-display helpers used by chat and worldline recording

### `chat-reply-helpers.js`
- contact profile text assembly used by reply, image, and past-event prompts
- reply JSON validation and normalization helpers
- fallback reply text helper for unavailable AI paths

### `chat-orchestration.js`
- message-send orchestration for self-message append, save, and group/direct branching
- direct-contact reply orchestration for generated replies, fallback replies, and side-effect ordering
- reply generation wrapper around prompt creation, JSON retry, validation, and image-intent attachment

### `chat-prompt-helpers.js`
- WeChat chat reply prompt assembly
- past-event question detection and query context assembly for chat replies
- prompt variable packaging used by `wechat-past-event-actions.js` facades

### `history-context-helpers.js`
- fixed WeChat history table setup and row persistence
- history text/query helpers used by chat replies and image prompts
- memory context assembly and on-demand history decision flow

### `image-record-helpers.js`
- WeChat image record text generation
- image read-record conversion
- memory and worldline record replacement after an offered image is accepted

### `image-ui-helpers.js`
- image receive confirmation modal state
- image preview modal state
- image confirmation prompt text display
- in-chat image message patching during generation and completion

### `image-album-helpers.js`
- real-photo lookup for WeChat image editing
- generated WeChat image insertion into contact albums
- duplicate image URL guarding before album state updates

### `image-prompt-helpers.js`
- short-term and long-term memory section packaging for image prompts
- current wearing context packaging for image prompts
- WeChat image dynamic tag cleanup
- prompt rendering and AI completion for WeChat image edit tags

### `image-receive-orchestration.js`
- final WeChat image receive confirmation flow
- draw-edit request orchestration after an offered image is accepted
- album insertion, image record replacement, message update, save, and pending/error recovery ordering

### `image-offer-orchestration.js`
- pending WeChat image message insertion after a contact offers an image
- image offer memory recording for the contact and player-self
- image offer worldline event insertion and duplicate event guarding

### `worldline-orchestration.js`
- WeChat dialogue worldline event write orchestration
- real-worldline event de-duplication and rolling window update
- append-worldline call coordination after the domain event service builds the event

### `change-panel-orchestration.js`
- WeChat change-reason panel interaction state toggle
- small UI state mutation kept outside the legacy public action entry
- compatibility support for existing message change panel bindings

### `app-orchestration.js`
- WeChat app open/close orchestration
- desktop/app visibility state coordination when entering WeChat
- WeChat contact identity jump coordination from the selected chat target

### `incoming-orchestration.js`
- incoming WeChat action application from real-world stage results
- direct-contact lookup for generated incoming messages
- past-message timestamp packaging and incoming memory recording

### `memory-debug-orchestration.js`
- WeChat memory and worldline debug report generation
- SQLite-backed memory/archive inspection for selected contacts
- runtime worldline fallback used when SQLite is unavailable

### `cleanup-orchestration.js`
- WeChat cleanup version gate and execution entry
- old worldline/event/message memory cleanup logic
- SQLite memory archive cleanup and cleanup-state persistence

### `album-orchestration.js`
- WeChat album contact/profile lookup helpers
- album photo list and refresh helpers for profile/body-figure flows
- shared album contact state resolution used by album actions

### `album-body-figure-helpers.js`
- WeChat album body-figure section and target-state helpers
- body-figure part layout and normalized part packaging
- generated body-figure metadata assembly kept away from image generation and local asset persistence

### `album-body-figure-context-helpers.js`
- WeChat album body-figure context object assembly
- section title and started-at packaging used by the image generator flow
- pure context object creation kept away from prompt loading and save flows

### `album-body-profile-generator-orchestration.js`
- body-profile section target and contact resolution
- body-figure context creation and prompt-dialog state preparation
- handoff to prompt-editor orchestration without drawing or persistence

### `album-delete-orchestration.js`
- album delete confirmation validation and current-photo lookup
- photo-map deletion through the pure photo-state helper
- confirmation closing and game-save ordering for a valid deletion

### `album-mark-real-orchestration.js`
- valid album-photo lookup before real-photo marking
- photo-map update through the pure photo-state helper
- game-save and avatar-capture ordering for the marked photo

### `album-body-figure-asset-orchestration.js`
- generated body-figure asset persistence through the platform asset adapter
- body-figure entry registration and current-figure binding order
- save failure recovery kept away from the public album action facade

### `album-generate-helpers.js`
- WeChat album generation-side pure object assembly
- body-figure context lookup, draw-option packaging, and generated photo object helpers
- pure data helpers kept away from draw provider calls, save flows, and prompt loading

### `album-generation-orchestration.js`
- complete asynchronous WeChat album photo generation sequence
- request cancellation, draw-provider, token-record, album insertion, and save ordering
- body-figure persistence and avatar-capture coordination through existing public boundaries

### `album-photo-state-helpers.js`
- WeChat album photo-list state update helpers
- delete, prepend generated photo, and mark-real list transforms
- pure list/map transforms kept away from save, avatar capture, and draw-provider orchestration

### `album-draw-helpers.js`
- WeChat album draw retry helper
- retryable draw-provider failure handling and exponential backoff
- utility flow kept away from album state mutation and photo persistence

### `album-ui-state-helpers.js`
- WeChat album delete-confirm and prompt-editor UI state toggles
- prompt choice open/close state used by the album editor flow
- pure UI state mutation kept away from delete/save side effects

### `avatar-crop-helpers.js`
- WeChat avatar text and avatar style helpers for contact cards and message avatars
- avatar crop geometry helpers used by crop preview and face-detected crop calculations
- pure crop display math extracted away from image loading and save flow

### `album-prompt-list-helpers.js`
- WeChat album prompt list filtering and selected-prompt lookup
- prompt preview text extraction for album prompt list rows
- selected prompt list update transform used before drawing from edited prompt text
- pure prompt-list view helpers kept away from generation and save orchestration

### `album-selected-generation-orchestration.js`
- selected prompt and draft-kind resolution for album generation
- fixed-tag normalization and selected prompt-list persistence
- save-before-generation ordering through existing public boundaries

### `album-prompt-helpers.js`
- WeChat album state/profile material packaging for prompt editing
- identity/body prompt option assembly and selected-text summaries
- prompt preview helpers kept away from image generation, persistence, and AI calls

### `album-prompt-editor-helpers.js`
- WeChat album prompt editor draft initialization
- body-figure context carry-over for prompt editing
- pure draft object assembly kept away from async profile loading and save flows

### `album-prompt-editor-orchestration.js`
- prompt editor contact/profile preparation
- prompt option lookup and draft key assignment
- editor-open state transition kept away from drawing and persistence

### `album-tag-helpers.js`
- WeChat album fixed-tag and prompt-tag parsing helpers
- fallback and compact draw-tag prompt text helpers
- pure tag cleanup, placeholder detection, and prompt render helpers kept away from AI request orchestration

### `mention-view-helpers.js`
- mention-context text assembly and contact-mention parsing
- mention-related readonly source formatting for prompt/context usage

### `mention-base-photo-helper.js`
- base-photo extraction from image-intent payloads
- image mention id helpers
- image mention action helper slices that stay close to image mention utility flow

### `mention-reference-helpers.js`
- message mention id generation
- mentioned image reference parsing
- reply-result image-intent attachment for mentioned base images

### `mention-input-helper.js`
- WeChat input-box mention insertion
- message mention token insertion using readable `@消息` prefixes

## Boundary rules

Helpers in this directory should prefer:

- readonly query behavior
- pure formatting
- id generation
- small object assembly
- low-risk action-local utility logic

Helpers in this directory should avoid:

- AI reply generation orchestration
- provider/model loading
- large prompt composition surfaces
- direct save orchestration unless the helper has already been proven stable as a tiny utility slice

## Migration pattern

The preferred migration pattern for new work here is:

1. move one tiny helper or one tightly-related helper cluster at a time
2. keep public method names alive in the legacy action file through compat forwarding
3. run syntax checks after each small extraction
4. avoid mixing encoding repair and structural migration in the same pass

## Relationship to other layers

- `publish/wechat-*.js`: entry/orchestration/compat layer
- `publish/app/wechat/`: helper and small utility layer
- `publish/domain/worldline/`: shared worldline business logic when the helper is no longer WeChat-local

## Immediate practical rule

If a new WeChat helper does not clearly belong to chat-session, chat-message, chat-reply, chat-orchestration, chat-prompt, history-context, image-record, image-ui, image-album, image-prompt, image-receive-orchestration, image-offer-orchestration, worldline-orchestration, change-panel-orchestration, app-orchestration, incoming-orchestration, memory-debug-orchestration, cleanup-orchestration, album-orchestration, album-body-figure, album-body-figure-context, album-body-profile-generator-orchestration, album-delete-orchestration, album-mark-real-orchestration, album-body-figure-asset-orchestration, album-generate, album-generation-orchestration, album-selected-generation-orchestration, album-photo-state, album-draw, album-ui-state, album-prompt-editor, album-prompt-editor-orchestration, avatar-crop-helpers, album-prompt-list, album-prompt, album-tag, mention-view, mention-base-photo, mention-reference, or mention-input style boundaries, document the rationale before adding another module here.
