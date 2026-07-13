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

### `mention-view-helpers.js`
- mention-context text assembly and contact-mention parsing
- mention-related readonly source formatting for prompt/context usage

### `mention-base-photo-helper.js`
- base-photo extraction from image-intent payloads
- image mention id helpers
- image mention action helper slices that stay close to image mention utility flow

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

If a new WeChat helper does not clearly belong to chat-session, chat-message, chat-reply, mention-view, or mention-base-photo style boundaries, document the rationale before adding another module here.

