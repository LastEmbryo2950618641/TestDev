# Next Safe Work Queue Note (2026-07-12)

This note records the next safe work queue after the recent landed refactor commits and the isolated WeChat chat encoding-risk attempt.

## Current remaining tracked modifications
The current tracked-but-uncommitted modifications are:
- `mobile/android-webview-shell/app/src/main/assets/publish/index.html`
- `publish/platform/.artifacts/unified-platform-readiness.json`
- `publish/wechat-chat-actions.js`

## Current judgment
These tracked changes do not represent the best next safe implementation targets:
- the Android mirror `index.html` is host-mirror noise, not the current refactor priority
- the readiness artifact is operational residue, not durable architecture work
- `publish/wechat-chat-actions.js` currently contains an unsafe encoding-risk attempt and should not be extended from its present state

## Practical implication
The next safe work should not be selected from the currently modified tracked files.
Instead, it should come from one of these two directions:

### 1. Safe documentation curation and promotion
There is still a large pool of untracked architecture notes.
A future pass can classify which of those are:
- durable architecture references worth preserving
- temporary planning artifacts that should remain out of version control

This is low-risk and supports repository cleanliness directly.

### 2. Clean-slate implementation passes from verified analysis
For code work, the next safe step should begin from a clean-slate implementation target whose migration shape is already understood.
At the moment, the strongest such candidate remains:
- `publish/wechat-chat-actions.js`

But only under these constraints:
- do not build on the current unsafe modified file state
- start from a clean baseline
- only attempt the first low-risk extraction boundary
- avoid touching reply-generation orchestration or fragile text-heavy sections

## Recommended queue order
1. preserve and use the already-landed analysis for WeChat chat migration
2. when ready, redo the first WeChat chat extraction from a clean baseline using only the lowest-risk methods
3. separately schedule a documentation curation pass for the large untracked architecture backlog
4. defer Android mirror and readiness artifact handling until their governance/source-of-truth policy is the active task

## Why this order is safest
This order best matches the project objective because it:
- keeps low-coupling progress moving
- avoids smuggling noise into architecture work
- avoids deepening a known encoding-risk experiment
- continues building durable migration evidence before old-code cleanup begins
