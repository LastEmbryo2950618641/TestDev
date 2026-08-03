# Real World Stage Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现实推演正文后落库逻辑按阶段拆分，避免新闻、地图、社交驱动等独立阶段继续被误认为 Stage4 职责。

**Architecture:** 保留现有业务顺序和输出结果，只把 `publish/real-world-actions.js` 中的 `applyRealWorldResult()` 后半段拆成命名明确的小 helper。Stage4-4 只承接 Stage4 结算自身产出的系统记录/事件写入；新闻热榜、地图、社交队列、微信等各自进入独立 helper。

**Tech Stack:** Browser runtime JavaScript, Node-based smoke tests.

---

### Task 1: Add stage split structure test

**Files:**
- Create: `tests/real-world-stage-split.test.js`

- [ ] **Step 1: Write failing test**

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const actionsPath = path.join(root, 'publish', 'real-world-actions.js');
const source = fs.readFileSync(actionsPath, 'utf8');

[
  'applyStage44SettlementRecords',
  'applyPostStageTimeAndNews',
  'applyPostStageCommunicationAndDrive',
  'applyPostStageMapAndLocation',
].forEach((name) => {
  assert(
    new RegExp(`async\\s+${name}\\s*\\(|${name}\\s*\\(`).test(source),
    `missing helper: ${name}`,
  );
});

assert(source.includes('const settledEvents = await this.applyStage44SettlementRecords?.(result, legacyResult, settlement, id)'));
assert(source.includes('const timing = this.applyPostStageTimeAndNews?.(result, settlement, id)'));
assert(source.includes('await this.applyPostStageCommunicationAndDrive?.(result, settlement, id, timing)'));
assert(source.includes('await this.applyPostStageMapAndLocation?.(result, settlement, id, state)'));

console.log('real-world stage split structure ok');
```

- [ ] **Step 2: Verify red**

Run: `node tests/real-world-stage-split.test.js`

Expected: FAIL with `missing helper`.

### Task 2: Split helpers without changing behavior

**Files:**
- Modify: `publish/real-world-actions.js`

- [ ] **Step 1: Extract Stage4-4 records helper**

Create `applyStage44SettlementRecords(result, legacyResult, settlement, id)` and move these responsibilities into it:

```js
const remainingGeneric = (result.genericUpdates || []).filter((item) => !legacyHandled.has(item?.updateType));
await window.GameModules.updateRegistry?.applyGeneric?.(this, remainingGeneric);
const settledEvents = this.addEventsFromSettlement?.(result.events || [], { logId: id }) || [];
if (settledEvents.length) settlement.push(`事件：已写入${settledEvents.length}条事件。`);
settlement.push(...(await window.GameModules.realWorldProfileStage5?.applyPatches?.(this, result.profilePatches || []) || []));
const initApplied = await window.GameModules.initPromptRegistry?.apply?.(this, result.initUpdates || []) || [];
if (initApplied.length) settlement.push(`初始化：已写入${initApplied.length}条初始化记录。`);
```

- [ ] **Step 2: Extract time/news helper**

Create `applyPostStageTimeAndNews(result, settlement, id)` and move:

```js
const startedAt = this.phoneDate().toISOString();
this.advancePhoneTime(elapsedSeconds);
const newsTick = this.tickWorldNewsDriver?.(elapsedSeconds, { logId: id, startedAt, endedAt: this.phoneDate().toISOString() }) || null;
```

Return `{ elapsedSeconds, startedAt }`.

- [ ] **Step 3: Extract communication/drive helper**

Create `applyPostStageCommunicationAndDrive(result, settlement, id, timing)` and move:

```js
await this.applyWechatActions?.(result.wechatActions || []);
const longingEvents = await this.settleRealWorldLongingMeters?.(...);
this.clearPreparedRealWorldLongingEvents?.();
const socialInboxItems = this.settleSocialInbox?.(...);
const inboxClear = await this.clearPreparedSocialInbox?.() || {};
```

- [ ] **Step 4: Extract map/location helper**

Create `applyPostStageMapAndLocation(result, settlement, id, state)` and move map update, fog unlock, current location sync, and pending KV persistence.

- [ ] **Step 5: Replace inline block in `applyRealWorldResult()`**

Call the helpers in this order:

```js
await this.applyStage44SettlementRecords?.(result, legacyResult, settlement, id);
delete result.characterMetricUpdates;
result.characterCardChanges = settlement;
const timing = this.applyPostStageTimeAndNews?.(result, settlement, id) || {};
await this.applyPostStageCommunicationAndDrive?.(result, settlement, id, timing);
await this.applyPostStageMapAndLocation?.(result, settlement, id, state);
```

### Task 3: Verify

**Files:**
- Test: `tests/real-world-stage-split.test.js`
- Test: `tests/real-world-actions.test.js`
- Test: `tests/runtime-script-syntax.test.js`

- [ ] **Step 1: Run focused tests**

Run:

```bash
node tests/real-world-stage-split.test.js
node tests/real-world-actions.test.js
node tests/runtime-script-syntax.test.js
```

Expected: all pass.

- [ ] **Step 2: Inspect diff**

Run:

```bash
git diff -- publish/real-world-actions.js tests/real-world-stage-split.test.js docs/superpowers/plans/2026-08-03-real-world-stage-split.md
```

Expected: diff only contains stage split refactor and the new structure test.
