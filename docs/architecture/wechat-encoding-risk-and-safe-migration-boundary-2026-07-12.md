# WeChat Encoding Risk And Safe Migration Boundary (2026-07-12)

This note records the current boundary between WeChat modules that are still safe for structure-first refactor passes and files that now require extra encoding caution before any further extraction.

## Why this note exists

Recent migration passes proved that some WeChat modules can still support low-risk helper or service extraction when the work stays inside pure query, event-builder, or text-assembly boundaries.

At the same time, one follow-up attempt confirmed that not every remaining WeChat action file is equally safe to treat as a normal refactor target.

The practical problem is not only complexity. It is also baseline encoding stability.

If a file already shows historical encoding corruption in live source text, mixing structural extraction with opportunistic text rewriting can easily turn a bounded cleanup task into a wider behavior and content risk.

## Safe migration files right now

The following files have already demonstrated that they can support the current migration pattern:

- `publish/wechat-chat-actions.js`
- `publish/wechat-worldline-actions.js`
- `publish/wechat-mention-actions.js`

Why these are currently safe enough:
- they already accepted small helper or service extraction without forcing a full prompt or provider refactor
- the landed changes were limited to helper extraction, compat forwarding, or event assembly separation
- the resulting files still passed local syntax checks after each extraction round

Current landed companion files for that safe path include:

- `publish/app/wechat/chat-session.js`
- `publish/app/wechat/chat-message-helpers.js`
- `publish/app/wechat/mention-view-helpers.js`
- `publish/domain/worldline/wechat-event-service.js`

## High-risk files that should not be used for routine structural extraction yet

### `publish/wechat-actions.js`

Current risk status:
- high encoding risk
- not suitable for ordinary helper extraction until encoding handling is isolated as its own task

Why:
- the file contains historical text corruption severe enough that `node --check` fails on the baseline file
- this means a structural refactor in that file is not only a refactor; it is also an encoding-repair attempt whether intended or not
- that violates the current low-risk migration rule because it couples architecture cleanup with source recovery

Practical rule:
- do not use `publish/wechat-actions.js` as a normal next-step helper extraction target
- if work there becomes necessary, first treat it as a dedicated encoding-governance task with its own evidence and rollback boundary

### `publish/wechat-past-event-actions.js`

Current risk status:
- structurally coupled to the reply-generation path
- not a good target for the current small helper-first migration rhythm

Why:
- it combines past-event detection, archive/history/memory context usage, and reply prompt assembly in one surface
- extracting inside that file is much closer to modifying the AI reply pipeline than to moving a passive helper
- the regression surface includes prompt inputs and conversation behavior, not just readonly formatting

Practical rule:
- defer `publish/wechat-past-event-actions.js` until the project explicitly chooses to work on the reply prompt pipeline
- do not mix it into the current helper-first cleanup passes

## Recommended migration rule for the next WeChat passes

Prefer only these categories for the next rounds:

- readonly query helpers
- event builders
- mention/context text assembly
- message formatting helpers
- compat facade thinning

Avoid these categories for now:

- reply prompt composition
- AI generation orchestration
- provider/model loading
- image generation execution flow
- files whose baseline source text already fails syntax or encoding sanity checks

## Decision rule before touching another WeChat file

Before the next extraction attempt, verify all of the following:

1. the file still passes a basic syntax check in its current baseline state
2. the target methods are either readonly or object-assembly oriented
3. the change can preserve public method names through compat forwarding
4. the extraction does not require editing prompt text-heavy regions in the same pass

If any of the above fails, the task should be reclassified as either:

- a dedicated encoding remediation pass
- a prompt-pipeline refactor
- or a deferred high-risk migration candidate

## Immediate practical conclusion

The current safest momentum path is:

1. continue only within already-proven safe WeChat sub-surfaces
2. treat `publish/wechat-actions.js` as encoding-risk-gated
3. treat `publish/wechat-past-event-actions.js` as reply-pipeline-adjacent and therefore deferred
4. keep using helper/service extraction plus compat facade retention as the default low-coupling migration pattern

