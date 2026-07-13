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

If a new WeChat helper does not clearly belong to chat-session, chat-message, chat-reply, chat-orchestration, chat-prompt, history-context, image-record, image-ui, image-album, image-prompt, image-receive-orchestration, image-offer-orchestration, worldline-orchestration, change-panel-orchestration, app-orchestration, incoming-orchestration, memory-debug-orchestration, mention-view, mention-base-photo, mention-reference, or mention-input style boundaries, document the rationale before adding another module here.
