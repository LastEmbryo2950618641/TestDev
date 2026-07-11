# WeChat Chat Clean-Slate Minimal Extraction Plan (2026-07-12)

This note records the clean-slate plan for reattempting the first `publish/wechat-chat-actions.js` extraction without reusing the unsafe encoding-risk experiment.

## Verified low-risk cut line
Current inspection confirms that the lowest-risk boundary sits at the top of the file and includes only these methods:
- `selectWechatContact(id)`
- `wechatMessageKey(contact)`
- `wechatMessages()`
- `updateWechatLatest(id, latest, incoming)`

These methods are currently positioned before the main send/reply orchestration region.
That means a future reattempt can isolate them without entering the deeper reply-generation path.

## Verified high-risk boundary to avoid on first reattempt
The first high-risk entry begins at:
- `sendWechatMessage()`

Everything from there downward quickly touches:
- reply generation
- save timing
- worldline recording
- archive/memory lookup
- fallback/error message text
- text-heavy prompt/profile composition

Those regions should remain untouched during the first clean-slate retry.

## Safe reattempt rule
A future code reattempt should:
1. start from a clean file baseline rather than the current unsafe modified file
2. move only the four verified low-risk methods first
3. avoid broad search-and-replace or whole-block rewrites
4. preserve all existing text-heavy downstream regions byte-for-byte on the first pass

## Recommended extraction order
1. `wechatMessageKey(contact)`
2. `wechatMessages()`
3. `updateWechatLatest(id, latest, incoming)`
4. `selectWechatContact(id)`

Why this order:
- `wechatMessageKey` is the smallest helper and easiest anchor
- `wechatMessages` depends on the selected conversation view but is still read-oriented
- `updateWechatLatest` is a narrow state mutation helper
- `selectWechatContact` is the largest of the four and should move last after the smaller helpers prove safe

## Recommended destination shape
The eventual helper surface can still be session-oriented, but the first retry should avoid creating a broad helper module before the minimal transfer is proven safe.
A safer path is:
- establish the helper file only for the first four methods
- wire each method individually through explicit wrappers
- stop there and verify the file before considering any message append/time helper movement

## Practical conclusion
The project is now ready for a clean-slate first retry of WeChat chat extraction, but only under an explicitly narrow scope.
The goal of the next code pass should be:
- prove one minimal safe extraction boundary
- not complete the larger chat decomposition in a single attempt
