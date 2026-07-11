# WeChat Chat Actions Decomposition Note (2026-07-12)

This note records the first decomposition assessment for `publish/wechat-chat-actions.js`.

## Current conclusion
`publish/wechat-chat-actions.js` is not a thin-facade candidate today.
It is better described as a mixed WeChat chat runtime surface containing:
- chat selection state flow
- message append/list helpers
- time/format helpers
- outbound send orchestration
- reply-generation orchestration
- reply validation and fallback behavior

That means the right next move is not full facade thinning in one pass.
The right move is to split the file by responsibility while preserving public method names.

## Main responsibility clusters

### 1. Chat selection and conversation entry state
Representative methods:
- `selectWechatContact(id)`
- `wechatMessageKey(contact)`
- `wechatMessages()`
- `updateWechatLatest(id, latest, incoming)`

Why this cluster matters:
- it owns currently selected contact state
- it resets unread counts
- it decides what the current conversation view shows
- it looks like the cleanest first candidate for extraction into a smaller state/query-oriented surface

### 2. Message append and timestamp helpers
Representative methods:
- `appendWechatMessage(id, msg)`
- `wechatMessageTime()`
- `wechatMemoryTime()`
- `wechatDialogueTimeLabel(label)`
- `formatWechatDialogueLog(...)`
- `wechatTimeValue(d)`
- `wechatTimeDisplay(d)`

Why this cluster matters:
- these methods are more helper-like than reply-orchestration-like
- they are likely reusable across send flow and history flow
- they appear lower risk than the AI reply generation path

### 3. Outbound send and inbound reply orchestration
Representative methods:
- `sendWechatMessage()`
- `replyWechatContact(contact, playerText)`
- associated prompt, memory, and persistence behavior used by reply generation

Why this cluster is higher risk:
- it touches message persistence, save timing, worldline recording, memory archive lookup, prompt rendering, and reply validation
- it is behaviorally central to the actual WeChat chat experience
- this is not the right place for the first cut unless lower-risk helper/state surfaces are already separated

### 4. Reply shaping and fallback logic
Representative methods:
- `validateWechatReply(raw, contact)`
- `fallbackWechatReply(contact, text)`
- contact profile/prompt composition helpers near the reply pipeline

Why this cluster matters:
- it is adjacent to orchestration, but some of it may later move into a reply-format or prompt-preparation helper surface
- still not the safest first extraction target because it sits close to gameplay-visible AI response behavior

## Safest first split
The safest first split is:
1. chat selection and message-list state helpers
2. message append/time-format helper methods

Why:
- these areas are easier to verify locally
- they are less coupled to AI reply generation
- they can reduce file density without immediately risking reply quality or memory/prompt behavior

## Suggested migration pattern
The likely next pattern for this file is:
- `chatState` or `chatSession` helper/service for selection and current-conversation state
- `chatMessageHelpers` for append/time/format utilities
- keep `sendWechatMessage()` and `replyWechatContact(...)` in the legacy compat/orchestration file until the lower-risk extractions are proven safe

## Why this file is the right next target overall
Compared with currently deferred alternatives such as `settings-actions.js` and `real-world-map-actions.js`, this file offers:
- better continuity with the already-landed WeChat facade work
- more bounded early extraction opportunities
- lower platform and model-provider risk for the first pass

## Recommended next step
1. create a small internal helper surface for chat selection/message-list responsibilities
2. move append/time helpers only if the write path remains unchanged
3. leave reply-generation orchestration in place for the first live refactor pass
