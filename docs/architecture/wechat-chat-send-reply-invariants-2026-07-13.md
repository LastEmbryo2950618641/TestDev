# WeChat Chat Send/Reply Invariants (2026-07-13)

This note defines the guardrails required before any deeper split of `publish/wechat-chat-actions.js`.

## Why this gate exists

The remaining code in `wechat-chat-actions.js` is no longer a simple facade-only surface. It owns live orchestration for:

- message sending
- direct-contact AI reply generation
- group-chat early return behavior
- memory and worldline recording
- save timing
- `wechatSending` reset behavior

These flows affect gameplay continuity, so future extraction must preserve observable behavior before cleanup continues.

## Locked invariants

### `sendWechatMessage()`

- Trim `wechatInput` before any mutation.
- Return early when the text is empty, a reply is already sending, or no selected target exists.
- Clear `wechatError`, `wechatInput`, and `wechatMentionPanelOpen` before appending the self message.
- Append the player's self message before any group or direct-contact branch.
- For group chats, record the WeChat worldline event before saving.
- Save after the self message is appended.
- For group chats, return immediately after save and do not call `replyWechatContact()`.
- For direct contacts, call `replyWechatContact(target, text)` after save.

### `replyWechatContact()` success path

- Set `wechatSending = true` and increment `wechatReplyRequestId` before generating a reply.
- Ignore stale replies when `reqId !== wechatReplyRequestId`.
- Resolve `characterId` from `contact.id`.
- Resolve or ensure the target character state before applying generated changes.
- Apply character-card changes, metric updates, and inventory updates before advancing phone time.
- Advance phone time before appending the contact reply.
- Append the contact reply before image-intent, memory, faction, worldline, debug, and save side effects.
- Append pending image intent before recording memory/worldline side effects.
- Record character memory, faction archive, and worldline in the existing order.
- Save after all success side effects are applied.

### `replyWechatContact()` failure path

- Ignore stale failures when `reqId !== wechatReplyRequestId`.
- Store the error message before appending fallback content.
- Advance phone time by the fixed fallback duration before appending the fallback reply.
- Append fallback reply before memory, faction, worldline, and save side effects.
- Save after fallback side effects.
- Reset `wechatSending` only in `finally` and only when `reqId === wechatReplyRequestId`.

### `generateWechatReply()`

- When no completion provider exists, return the fallback reply shape without trying prompt generation.
- Ensure the contact profile before prompt construction when possible.
- Build the prompt before calling `generateJsonWithRetry`.
- Keep `source` and `promptId` as `wechat-chat-reply`.
- Validate raw JSON through `validateWechatReply(raw, contact)`.
- Apply `attachWechatMentionedImageIntent` after validation and before returning.

### Runtime module order

- `app/wechat/chat-reply-helpers.js` must load before `wechat-chat-actions.js`.
- Web and Android manifests must both contain this order.

## Automated gate

Run:

```powershell
npm run verify:wechat-chat-invariants
```

This gate is intentionally static and narrow. It does not prove full gameplay correctness by itself; it prevents accidental reordering while deeper refactors are prepared.

## Future extraction rule

Do not extract `sendWechatMessage()`, `replyWechatContact()`, or `generateWechatReply()` into another module unless:

- this invariant gate passes before and after the change
- HTTP and `file://` control validation pass
- desktop launch validation passes
- Android debug build passes
- the extracted module name and ownership are documented before old entry cleanup begins
