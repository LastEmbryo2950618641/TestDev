# Legacy Facade Migration Priority Table V2 (2026-07-12)

This note revisits the next migration targets after the first landed samples for:
- thin compat facade extraction
- facade plus orchestration residue separation
- worldline state/query/view boundary extraction

The purpose of this revision is to identify which legacy files now offer the best next return on effort after those patterns have been proven in live code.

## Re-evaluation criteria
A candidate moves upward when it now appears likely to support one of the already-proven migration patterns:
- thin compat facade conversion
- helper/query extraction while preserving public method names
- orchestration residue separation without changing gameplay behavior

A candidate moves downward when it still appears to be a dense owner of:
- remote/model/network flows
- local settings activation and persistence coupling
- panel/runtime state coupling across multiple concerns
- high-risk gameplay orchestration

## Updated priority judgment

### Tier A: highest-value next investigation target
#### `publish/wechat-chat-actions.js`
Why it moved up:
- it appears narrower than large system-wide action files
- its responsibilities are centered on chat selection, message list mutation, and send flow behavior
- it likely offers a promising split between:
  - selection/message state flow
  - compat public method names
  - UI/query helpers already living elsewhere in the WeChat surface
- it builds directly on the already-landed WeChat facade thinning work

Why it is promising now:
- the project already has a successful WeChat-related thin-facade sample in `publish/wechat-view-actions.js`
- that means further WeChat boundary cleanup is more likely to reuse context and avoid cold-start analysis cost
- the file is big enough to matter, but still much less sprawling than settings or map runtime surfaces

Expected migration pattern:
- probably a "state-flow plus compat shell" pattern rather than a pure facade

Main risk:
- medium
- chat send flow touches message persistence, unread counts, selected contact state, and incoming/outgoing message continuity

Recommended next step:
1. verify whether contact selection, message append/update, and send orchestration can be separated into smaller internal surfaces
2. avoid changing public method names at first
3. preserve message timeline behavior and unread semantics as primary invariants

### Tier B: hold for later targeted verification
#### `publish/settings-actions.js`
Why it moves down for now:
- it still owns substantial active orchestration
- it mixes app open/close state with provider/model loading, connection testing, local settings preparation, and startup fallback behavior
- it is much less likely to yield a safe early win from another small extraction pass

Expected migration pattern:
- likely requires a multi-surface split such as:
  - app-surface open/close actions
  - settings model catalog loader/service
  - local settings persistence/activation flow
  - settings view/query helpers

Main risk:
- high
- could affect model availability, API-key-dependent behavior, startup defaults, and settings UX continuity

#### `publish/real-world-map-actions.js`
Why it stays deferred:
- it still appears coupled to panel/runtime map behavior
- likely contains richer interaction state than a simple facade conversion can safely handle
- the payoff may be real, but the migration path is not yet as obvious as the WeChat/chat path

Expected migration pattern:
- probably requires a larger split between map state, map query helpers, panel actions, and rendering support

Main risk:
- high
- map interactions are often stateful and visually sensitive, which increases regression risk relative to the current migration phase

### Tier C: still too broad for the current momentum window
#### `publish/wechat-actions.js`
Why not yet:
- still likely too broad and central to treat as the next immediate target
- should wait until more focused WeChat sub-surfaces are separated first

#### `publish/player-aspiration-actions.js`
Why not yet:
- large file size and likely gameplay-rule density
- not a good candidate for a small low-risk follow-up after the current worldline and WeChat samples

#### `publish/player-identity-actions.js`
Why not yet:
- large and identity-centric logic tends to be behavior-sensitive
- better addressed after more repeatable migration scaffolds exist

## Recommended next implementation target
The best next live target is:
- `publish/wechat-chat-actions.js`

Why:
1. it reuses the strongest local context already built in the WeChat module family
2. it is more likely than settings or map actions to support a bounded decomposition
3. it advances low-coupling goals without immediately forcing platform or model-provider risk
4. it can help establish the next reusable pattern after view facade thinning and worldline service extraction

## Practical recommendation
Proceed in this order:
1. verify `publish/wechat-chat-actions.js` responsibilities and caller invariants
2. decide whether the first split should isolate selection state, message mutation flow, or outbound send orchestration
3. keep `settings-actions.js` and `real-world-map-actions.js` documented as deferred high-risk targets until more bounded migration wins accumulate
