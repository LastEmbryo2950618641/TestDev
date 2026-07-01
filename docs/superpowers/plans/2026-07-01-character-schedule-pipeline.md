# Character Schedule Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入 `store.characterSchedules`，让 Stage1/Stage2 用同住/相邻日程角色补候选，并让 Stage4 只对本轮明确涉及角色写回日程更新。

**Architecture:** 在 `real-world-agent-context.js` 增加日程候选读取和压缩摘要 helper，并把摘要注入 Stage1/Stage2 上下文；在 `real-world-agent-loop.js` 增加 `人事安排` Stage4 类型、解析与短规则；在 `generic-update-applier.js` 增加 `character-schedule` 写回分支，复用现有 `genericUpdates` 应用链路。

**Tech Stack:** Browser runtime JavaScript (`window.GameModules`), Node VM tests, Chinese K:V settlement parser, existing `updateRegistry.applyGeneric` pipeline.

## Global Constraints

- 不做全角色每轮 AI 日程刷新。
- 不新增数据库表。
- 不移除 Stage2 随机候选趣味。
- 不实现复杂地图邻接图，只做保守文本相近判断。
- 不把临时日程写入角色卡长期资料。
- 每轮最多注入 3 个可候选日程角色。
- `availability === '场外'` 的角色不得作为可出场候选。
- Stage4 只更新本回合参与者或本轮正文明确通信、移动、约定涉及的人。

---

## File Structure

- Modify: `publish/real-world-agent-context.js`
  - Responsibility: produce schedule participant hints and inject a compact `日程候选提示` into Stage1/Stage2 contexts.
- Modify: `publish/real-world-agent-loop.js`
  - Responsibility: add Stage4 `人事安排` settlement contract, parse schedule update lines into `character-schedule` generic updates, and include schedule context in settlement material.
- Modify: `publish/update/generic-update-applier.js`
  - Responsibility: apply `character-schedule` updates to `store.characterSchedules[id]` via patch merge.
- Test: `tests/real-world-loop-update.test.js`
  - Responsibility: cover schedule hint classification, prompt/context injection, Stage4 parsing, and writeback behavior.

---

### Task 1: Schedule participant hints for Stage1/Stage2

**Files:**
- Modify: `publish/real-world-agent-context.js:326-340`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: `store.characterSchedules`, `store.rpgStates`, `store.realWorldLocationName`, `store.realWorldMap.current`.
- Produces: `realWorldAgentContext.scheduleParticipantHints(store, action, currentLocation)` returning `{ sameLocation, nearbyLocation, offstage, unknown }`.
- Produces: `realWorldAgentContext.scheduleCandidateHintText(store, action, currentLocation)` returning Chinese text beginning with `日程候选提示：`.

- [ ] **Step 1: Write failing tests for hint classification**

Add these tests after `Stage 1 prompt passes known participant layers to random candidate provider` in `tests/real-world-loop-update.test.js`:

```js
test('scheduleParticipantHints classifies same nearby offstage and unknown schedules', () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号刘思琪房间门口';
  store.rpgStates = {
    siyao: { id: 'siyao', profile: { name: '刘思瑶' }, name: '刘思瑶' },
    siqi: { id: 'siqi', profile: { name: '刘思琪' }, name: '刘思琪' },
    siyi: { id: 'siyi', profile: { name: '刘思怡' }, name: '刘思怡' },
    teacher: { id: 'teacher', profile: { name: '王老师' }, name: '王老师' },
  };
  store.characterSchedules = {
    siqi: { characterId: 'siqi', characterName: '刘思琪', currentLocation: '锦苑小区3栋2单元601号刘思琪房间门口', currentAction: '等在门口', availability: '在场', reason: '同一地点' },
    siyao: { characterId: 'siyao', characterName: '刘思瑶', currentLocation: '锦苑小区3栋2单元601号客厅', currentAction: '写作业', availability: '在场', reason: '同住' },
    teacher: { characterId: 'teacher', characterName: '王老师', currentLocation: '学校办公室', currentAction: '批改作业', availability: '场外', reason: '在学校' },
    siyi: { characterId: 'siyi', characterName: '刘思怡', currentLocation: '当前位置未知', currentAction: '未知', availability: '未知', reason: '资料不足' },
  };

  const hints = ctx.scheduleParticipantHints(store, '前往刘思琪房间', store.realWorldLocationName);

  assert.deepStrictEqual(hints.sameLocation.map((item) => item.name), ['刘思琪']);
  assert.deepStrictEqual(hints.nearbyLocation.map((item) => item.name), ['刘思瑶']);
  assert.deepStrictEqual(hints.offstage.map((item) => item.name), ['王老师']);
  assert.deepStrictEqual(hints.unknown.map((item) => item.name), ['刘思怡']);
});

test('scheduleCandidateHintText limits available schedule candidates to three', () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号客厅';
  store.rpgStates = Object.fromEntries(['甲', '乙', '丙', '丁'].map((name, index) => [`c${index}`, { id: `c${index}`, profile: { name }, name }]));
  store.characterSchedules = Object.fromEntries(['甲', '乙', '丙', '丁'].map((name, index) => [`c${index}`, {
    characterId: `c${index}`,
    characterName: name,
    currentLocation: `锦苑小区3栋2单元601号${name}房间`,
    currentAction: '日常活动',
    availability: '在场',
  }]));

  const text = ctx.scheduleCandidateHintText(store, '在客厅等待', store.realWorldLocationName);

  assert.ok(text.includes('日程候选提示：'));
  assert.ok(text.includes('同住/相邻：甲'));
  assert.ok(text.includes('乙'));
  assert.ok(text.includes('丙'));
  assert.ok(!text.includes('丁'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL with `ctx.scheduleParticipantHints is not a function`.

- [ ] **Step 3: Implement schedule hint helpers**

In `publish/real-world-agent-context.js`, insert these methods immediately before `buildStage1RoutingContext(...)`:

```js
  scheduleNameForId(store, id = '', entry = {}) {
    const state = store?.rpgStates?.[id] || window.GameModules.sqliteSave?.getCharacterState?.(id);
    return String(entry.characterName || state?.profile?.name || state?.name || id || '').trim();
  },

  cleanScheduleLocation(location = '') {
    return String(location || '').trim();
  },

  unknownScheduleLocation(location = '') {
    return !this.cleanScheduleLocation(location) || /^当前位置未知|未知地点|现实地点|当前位置$/u.test(this.cleanScheduleLocation(location));
  },

  householdLocationKey(location = '') {
    const text = this.cleanScheduleLocation(location);
    const match = text.match(/(.{0,16}?(?:小区|公寓|宿舍|家|住宅|楼|栋|单元|号|室))/u);
    return String(match?.[1] || '').trim();
  },

  scheduleLocationsAdjacent(a = '', b = '') {
    const left = this.cleanScheduleLocation(a);
    const right = this.cleanScheduleLocation(b);
    if (!left || !right || this.unknownScheduleLocation(left) || this.unknownScheduleLocation(right)) return false;
    if (left === right) return false;
    if (left.includes(right) || right.includes(left)) return true;
    const leftKey = this.householdLocationKey(left);
    const rightKey = this.householdLocationKey(right);
    if (leftKey && rightKey && (leftKey.includes(rightKey) || rightKey.includes(leftKey) || leftKey === rightKey)) return true;
    const homeWords = /房间|卧室|客厅|厨房|走廊|卫生间|浴室|门口|家/u;
    return homeWords.test(left) && homeWords.test(right) && Boolean(leftKey || rightKey);
  },

  scheduleParticipantHints(store, action = '', currentLocation = '') {
    const schedules = store?.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {};
    const location = this.cleanScheduleLocation(currentLocation || store?.realWorldLocationName || store?.realWorldMap?.current || '');
    const out = { sameLocation: [], nearbyLocation: [], offstage: [], unknown: [] };
    Object.entries(schedules).forEach(([id, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const name = this.scheduleNameForId(store, id, entry);
      if (!name) return;
      const current = this.cleanScheduleLocation(entry.currentLocation);
      const item = { id: entry.characterId || id, name, currentLocation: current, currentAction: String(entry.currentAction || '').trim(), availability: entry.availability || '未知', reason: entry.reason || '' };
      if (item.availability === '场外') out.offstage.push(item);
      else if (this.unknownScheduleLocation(current)) out.unknown.push(item);
      else if (current && location && current === location) out.sameLocation.push(item);
      else if (this.scheduleLocationsAdjacent(current, location)) out.nearbyLocation.push(item);
    });
    return {
      sameLocation: out.sameLocation.slice(0, 3),
      nearbyLocation: out.nearbyLocation.slice(0, Math.max(0, 3 - out.sameLocation.length)),
      offstage: out.offstage.slice(0, 5),
      unknown: out.unknown.slice(0, 5),
    };
  },

  scheduleHintLine(items = [], label = '') {
    const text = (items || []).map((item) => `${item.name}（${[item.currentLocation, item.currentAction].filter(Boolean).join('，') || '无详情'}）`).join('、');
    return `${label}：${text || '无'}`;
  },

  scheduleCandidateHintText(store, action = '', currentLocation = '') {
    const hints = this.scheduleParticipantHints(store, action, currentLocation);
    if (!Object.values(hints).some((items) => items.length)) return '日程候选提示：无';
    return [
      '日程候选提示：',
      this.scheduleHintLine(hints.sameLocation, '同地点'),
      this.scheduleHintLine(hints.nearbyLocation, '同住/相邻'),
      this.scheduleHintLine(hints.offstage, '明确场外'),
      this.scheduleHintLine(hints.unknown, '未知位置'),
      '规则：同地点/同住/相邻可作为高优先候选或戏剧候选，但不是强制出场；明确场外不得作为可出场候选；每轮最多选择3个日程候选。',
    ].join('\n');
  },
```

- [ ] **Step 4: Run tests to verify helper behavior passes**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS for the two new schedule hint tests.

- [ ] **Step 5: Commit Task 1**

```bash
git add "publish/real-world-agent-context.js" "tests/real-world-loop-update.test.js"
git commit -m "feat(schedule): derive participant hints from character schedules"
```

---

### Task 2: Inject schedule hints into Stage1 and Stage2 contexts

**Files:**
- Modify: `publish/real-world-agent-context.js:326-340` and `publish/real-world-agent-context.js:459-471`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: `scheduleCandidateHintText(store, action, currentLocation)` from Task 1.
- Produces: Stage1 routing context and Stage2 scene anchor context containing `日程候选提示：`.

- [ ] **Step 1: Write failing context injection tests**

Add these tests near the existing Stage1/Stage2 prompt context tests in `tests/real-world-loop-update.test.js`:

```js
test('Stage 1 routing context includes schedule candidate hints for nearby household roles', async () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号刘思琪房间门口';
  store.rpgStates = { siyao: { id: 'siyao', profile: { name: '刘思瑶' }, name: '刘思瑶' } };
  store.characterSchedules = {
    siyao: { characterId: 'siyao', characterName: '刘思瑶', currentLocation: '锦苑小区3栋2单元601号客厅', currentAction: '写作业', availability: '在场' },
  };

  const routing = ctx.buildStage1RoutingContext({ store, action: '前往刘思琪房间', loaded: [], config: { mode: 'real', label: '现实' } });

  assert.ok(routing.includes('日程候选提示：'));
  assert.ok(routing.includes('同住/相邻：刘思瑶'));
  assert.ok(routing.includes('不得作为可出场候选') || routing.includes('明确场外'));
});

test('Stage 2 scene anchor context includes schedule boundary hints', async () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号刘思琪房间门口';
  store.rpgStates = { siyao: { id: 'siyao', profile: { name: '刘思瑶' }, name: '刘思瑶' } };
  store.characterSchedules = {
    siyao: { characterId: 'siyao', characterName: '刘思瑶', currentLocation: '锦苑小区3栋2单元601号客厅', currentAction: '写作业', availability: '在场' },
  };

  const anchor = ctx.buildSceneAnchorContext({ store, action: '前往刘思琪房间', loaded: [], trace: [], config: { mode: 'real', label: '现实' } });

  assert.ok(anchor.includes('日程候选提示：'));
  assert.ok(anchor.includes('同住/相邻：刘思瑶'));
  assert.ok(anchor.includes('不是强制出场'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because Stage1/Stage2 contexts do not yet include `日程候选提示：`.

- [ ] **Step 3: Modify Stage1 routing context**

In `publish/real-world-agent-context.js`, replace `buildStage1RoutingContext(...)` with:

```js
  buildStage1RoutingContext({ store, action, loaded = [], config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const location = store?.realWorldLocationName || map.current || '未知地点';
    const time = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间';
    const player = store?.playerName || store?.playerProfile?.name || '玩家';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前位置：${location}`,
      `当前时间：${time}`,
      `当前对象线索：${player}`,
      this.scheduleCandidateHintText(store, action, location),
      `已加载资料摘要：\n${this.loadedRoutingSummary(loaded)}`,
      `可请求资料目录：\n${this.stage1MaterialCatalogText(config?.mode || 'real')}`,
    ].join('\n');
  },
```

- [ ] **Step 4: Modify Stage2 scene anchor context**

In `publish/real-world-agent-context.js`, replace `buildSceneAnchorContext(...)` with:

```js
  buildSceneAnchorContext({ store, action, loaded = [], trace = [], config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const location = store?.realWorldLocationName || map.current || store?.realWorldSceneTitle || '未知地点';
    const time = [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前场景位置：${location}`,
      `当前时间提示：${time}`,
      `空间边界线索：仅保留门口、房间、走廊、相邻空间、可听见/可看见/可进入条件。`,
      this.scheduleCandidateHintText(store, action, location),
      `参与者边界：\n${this.sceneParticipantBoundary(trace)}`,
      `已加载锚定事实：\n${this.loadedAnchorSummary(loaded)}`,
    ].join('\n');
  },
```

- [ ] **Step 5: Run tests to verify context injection passes**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS for new Stage1/Stage2 context tests and existing prompt tests.

- [ ] **Step 6: Commit Task 2**

```bash
git add "publish/real-world-agent-context.js" "tests/real-world-loop-update.test.js"
git commit -m "feat(schedule): expose schedule hints to scene planning"
```

---

### Task 3: Add Stage4 人事安排 settlement parsing

**Files:**
- Modify: `publish/real-world-agent-loop.js:448-632`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: `participants` passed to `parseSettlementKv(raw, { requestedTypes, participants, store, config })`.
- Produces: `genericUpdates[]` items with `updateType: 'character-schedule'`, `field: 'characterSchedules'`, `change.mode: 'merge'`.

- [ ] **Step 1: Write failing tests for Stage4 schedule contract and parser**

Add these tests near the existing `parseSettlementKv ...` tests in `tests/real-world-loop-update.test.js`:

```js
test('settlementTypeQueue includes character schedule after map settlement', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const queue = loop.settlementTypeQueue(loop.realConfig());

  assert.ok(queue.includes('人事安排'));
  assert.ok(queue.indexOf('人事安排') > queue.indexOf('地图'));
  assert.ok(queue.indexOf('人事安排') < queue.indexOf('势力总览'));
});

test('parseSettlementKv parses character schedule updates', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = `人事安排结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：人事安排，当前地点，刘思琪房间，正文确认刘思琪仍在房间内互动
更新2：人事安排，当前行动，和玩家交谈，正文明确发生对话互动
更新3：人事安排，可用状态，在场，正文确认其可参与当前场景
结算对象结束：刘思琪
类型完成：是
结算结束：是`;

  const parsed = loop.parseSettlementKv(raw, {
    requestedTypes: ['人事安排'],
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: '参与者' }],
    store: makeStore(),
    config: loop.realConfig(),
  });

  assert.deepStrictEqual(parsed.completeTypes, ['人事安排']);
  assert.strictEqual(parsed.incompleteTypes.length, 0);
  assert.strictEqual(parsed.genericUpdates.length, 3);
  assert.deepStrictEqual(parsed.genericUpdates.map((item) => item.updateType), ['character-schedule', 'character-schedule', 'character-schedule']);
  assert.deepStrictEqual(parsed.genericUpdates.map((item) => item.change.value), [
    { currentLocation: '刘思琪房间', reason: '正文确认刘思琪仍在房间内互动' },
    { currentAction: '和玩家交谈', reason: '正文明确发生对话互动' },
    { availability: '在场', reason: '正文确认其可参与当前场景' },
  ]);
});

test('parseSettlementKv rejects character schedule updates for non-participants', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = `人事安排结算：
结算状态：需要更新
结算对象：刘思瑶｜角色｜允许结算
更新1：人事安排，当前地点，客厅，未参与者不应被结算
结算对象结束：刘思瑶
类型完成：是
结算结束：是`;

  const parsed = loop.parseSettlementKv(raw, {
    requestedTypes: ['人事安排'],
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: '参与者' }],
    store: makeStore(),
    config: loop.realConfig(),
  });

  assert.deepStrictEqual(parsed.completeTypes, []);
  assert.deepStrictEqual(parsed.incompleteTypes, ['人事安排']);
  assert.deepStrictEqual(parsed.genericUpdates, []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because `人事安排` is not in `settlementTypeQueue()` and parser has no schedule update support.

- [ ] **Step 3: Add Stage4 contract and queue entry**

In `publish/real-world-agent-loop.js`, change `settlementTypeQueue(...)` to insert `人事安排` after `地图`:

```js
  settlementTypeQueue(config = this.realConfig()) {
    const base = ['基础结算', '情绪', '感觉', '生命体征', '身体状态', '穿着状态', '性经历', '性历史', '关系', '角色卡', '物品', '地图', '人事安排', '势力总览', '势力结构', '系统记录', '通用固化'];
    return config.mode === 'story' ? base.concat(['操控体验']) : base;
  },
```

In `settlementTypeContracts()`, add:

```js
      '人事安排': { title: '人事安排结算', format: '更新N：人事安排，当前地点/当前行动/可用状态，新值，变化原因' },
```

Insert it between `地图` and `势力总览`.

- [ ] **Step 4: Add parser helper for schedule lines**

In `publish/real-world-agent-loop.js`, insert this method before `parseSpecialSettlementLine(...)`:

```js
  parseScheduleSettlementLine(line = '', subject = null) {
    const parts = String(line || '').replace(/^更新(?:\d+|N)\s*[：:]/u, '').split(/[，,]/u).map((x) => x.trim());
    const [label, key, rawValue, reason] = parts;
    if (label !== '人事安排' || !subject || !key || !rawValue || !reason) return null;
    const value = {};
    if (key === '当前地点') value.currentLocation = rawValue;
    else if (key === '当前行动') value.currentAction = rawValue;
    else if (key === '可用状态') value.availability = ['在场', '场外', '未知', '暂不可用'].includes(rawValue) ? rawValue : '未知';
    else return null;
    value.reason = reason;
    return { updateType: 'character-schedule', subject, field: 'characterSchedules', change: { mode: 'merge', value }, reasons: [{ trigger: `人事安排${key}`, evidence: reason, confidence: 'confirmed' }] };
  },
```

- [ ] **Step 5: Route 人事安排 lines to the parser**

In `parseSettlementKv(...)`, replace this line:

```js
        const update = ['性历史', '关系', '角色卡'].includes(currentType) ? this.parseSpecialSettlementLine(currentType, line, currentSubject) : this.parseStandardSettlementLine(currentType, line, currentSubject);
```

with:

```js
        const update = currentType === '人事安排'
          ? this.parseScheduleSettlementLine(line, currentSubject)
          : (['性历史', '关系', '角色卡'].includes(currentType) ? this.parseSpecialSettlementLine(currentType, line, currentSubject) : this.parseStandardSettlementLine(currentType, line, currentSubject));
```

- [ ] **Step 6: Add 人事安排 short rule**

In `settlementTypeShortRule(...)`, add to `rules`:

```js
      '人事安排': '只更新本回合参与者或明确通信/移动/约定涉及的人；只记录当前地点、当前行动、可用状态；不得全角色批量刷新；弱推测不更新。',
```

- [ ] **Step 7: Run tests to verify Stage4 parser passes**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS for Stage4 schedule parser tests.

- [ ] **Step 8: Commit Task 3**

```bash
git add "publish/real-world-agent-loop.js" "tests/real-world-loop-update.test.js"
git commit -m "feat(schedule): parse character schedule settlement updates"
```

---

### Task 4: Apply character-schedule updates through updateRegistry

**Files:**
- Modify: `publish/update/generic-update-applier.js:102-123`
- Modify: `publish/update/update-registry.js:192-198`
- Create: none
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: generic update `{ updateType: 'character-schedule', subject, field: 'characterSchedules', change: { mode: 'merge', value } }`.
- Produces: `store.characterSchedules[id]` merged entry with `source: '结算事件'`, `stability: '事件锁定'`, `confidence: '确认'`, `updatedAt`.

- [ ] **Step 1: Write failing apply/merge tests**

Add these tests near existing update apply tests in `tests/real-world-loop-update.test.js`:

```js
test('applyGeneric merges character schedule updates without replacing omitted fields', async () => {
  const context = createContext();
  loadCore(context);
  const registry = context.window.GameModules.updateRegistry;
  const store = makeStore();
  store.phoneDateText = () => '2026年7月1日 周三';
  store.phoneTimeText = () => '10:05';
  store.characterSchedules = {
    rushiqi: {
      characterId: 'rushiqi',
      characterName: '刘思琪',
      currentLocation: '刘思琪房间',
      currentAction: '写作业',
      availability: '在场',
      confidence: '默认',
      source: '角色卡初始化',
      stability: '默认稳定',
      updatedAt: '旧时间',
      reason: '初始化',
    },
  };

  await registry.applyGeneric(store, [{
    updateType: 'character-schedule',
    subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
    field: 'characterSchedules',
    change: { mode: 'merge', value: { currentAction: '和玩家交谈', reason: '正文明确发生对话' } },
    reasons: [{ evidence: '正文明确发生对话' }],
  }]);

  assert.deepStrictEqual(store.characterSchedules.rushiqi, {
    characterId: 'rushiqi',
    characterName: '刘思琪',
    currentLocation: '刘思琪房间',
    currentAction: '和玩家交谈',
    availability: '在场',
    confidence: '确认',
    source: '结算事件',
    stability: '事件锁定',
    updatedAt: '2026年7月1日 周三 10:05',
    reason: '正文明确发生对话',
  });
});

test('applyGeneric creates character schedule entry for involved participant', async () => {
  const context = createContext();
  loadCore(context);
  const registry = context.window.GameModules.updateRegistry;
  const store = makeStore();
  store.phoneDateText = () => '2026年7月1日 周三';
  store.phoneTimeText = () => '10:05';
  store.characterSchedules = {};

  await registry.applyGeneric(store, [{
    updateType: 'character-schedule',
    subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
    field: 'characterSchedules',
    change: { mode: 'merge', value: { currentLocation: '客厅', availability: '在场', reason: '正文确认来到客厅' } },
  }]);

  assert.strictEqual(store.characterSchedules.rushiqi.characterName, '刘思琪');
  assert.strictEqual(store.characterSchedules.rushiqi.currentLocation, '客厅');
  assert.strictEqual(store.characterSchedules.rushiqi.currentAction, '按角色日常安排活动');
  assert.strictEqual(store.characterSchedules.rushiqi.source, '结算事件');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because `character-schedule` falls through generic target handling and does not update `store.characterSchedules`.

- [ ] **Step 3: Implement schedule apply branch**

In `publish/update/generic-update-applier.js`, add this branch at the top of `applyOne(store, update = {})`:

```js
    if (update.updateType === 'character-schedule') return this.applyCharacterScheduleUpdate(store, update);
```

Insert this method before `applyBodyStatusUpdate(...)`:

```js
  scheduleUpdatedAt(store = {}) {
    return [store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || new Date().toISOString();
  },

  normalizeScheduleAvailability(value = '') {
    const clean = String(value || '').trim();
    if (['在场', '场外', '未知', '暂不可用'].includes(clean)) return clean;
    return clean ? '未知' : '';
  },

  applyCharacterScheduleUpdate(store, update = {}) {
    const subject = update.subject || {};
    const id = this.normalizeSubjectId(store, subject.characterId || subject.id || update.target || '', subject);
    if (!store || !id) return false;
    const value = this.changeValue(update);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const state = store?.rpgStates?.[id] || window.GameModules.sqliteSave?.getCharacterState?.(id) || null;
    const old = store.characterSchedules?.[id] || {};
    const next = {
      characterId: id,
      characterName: subject.name || subject.characterName || old.characterName || state?.profile?.name || state?.name || id,
      currentLocation: value.currentLocation || old.currentLocation || '当前位置未知',
      currentAction: value.currentAction || old.currentAction || '按角色日常安排活动',
      availability: this.normalizeScheduleAvailability(value.availability) || old.availability || '未知',
      confidence: '确认',
      source: '结算事件',
      stability: '事件锁定',
      updatedAt: this.scheduleUpdatedAt(store),
      reason: value.reason || this.reasonText(update, old.reason || '现实推演确认人事安排变化。'),
    };
    store.characterSchedules = store.characterSchedules && typeof store.characterSchedules === 'object' ? store.characterSchedules : {};
    if (JSON.stringify(old) === JSON.stringify(next)) return false;
    store.characterSchedules[id] = next;
    return true;
  },
```

- [ ] **Step 4: Add schedule card routing for settlement UI**

In `publish/update/update-registry.js`, replace `defaultCard(change = {}, store = null)` with:

```js
  defaultCard(change = {}, store = null) {
    const subject = change.subject || {};
    const label = subject.name || subject.id || change.group || change.target || '';
    const playerName = store?.realWorldPlayerSettlementName?.() || '玩家';
    if (change.updateType === 'character-schedule') return { id: `schedule:${subject.id || label || 'unknown'}`, title: label || '人事安排', section: '人事安排' };
    if (!label || label === 'player-self' || label === '玩家' || label === playerName) return { id: 'role:player-self', title: playerName, section: '角色卡' };
    return { id: `misc:${label}`, title: label, section: '其他' };
  },
```

- [ ] **Step 5: Run tests to verify apply behavior passes**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS for new apply/merge tests.

- [ ] **Step 6: Commit Task 4**

```bash
git add "publish/update/generic-update-applier.js" "publish/update/update-registry.js" "tests/real-world-loop-update.test.js"
git commit -m "feat(schedule): apply character schedule updates"
```

---

### Task 5: Add schedule context to Stage4 settlement material

**Files:**
- Modify: `publish/real-world-agent-loop.js:635-648`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: `config.ctx.scheduleCandidateHintText(store, action, location)` when available.
- Produces: `buildSettlementFactContext(...)` text containing `当前日程边界：`.

- [ ] **Step 1: Write failing settlement fact context test**

Add this test near existing Stage4 prompt tests:

```js
test('Stage4 settlement fact context includes schedule boundary', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号客厅';
  store.characterSchedules = {
    rushiqi: { characterId: 'rushiqi', characterName: '刘思琪', currentLocation: '锦苑小区3栋2单元601号刘思琪房间', currentAction: '写作业', availability: '在场' },
  };

  const text = loop.buildSettlementFactContext({
    store,
    action: '去客厅',
    narration: '刘思琪听见门外动静。',
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: '参与者' }],
    trace: [],
    config: loop.realConfig(),
  });

  assert.ok(text.includes('当前日程边界：'));
  assert.ok(text.includes('日程候选提示：'));
  assert.ok(text.includes('刘思琪'));
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because Stage4 fact context has no schedule boundary line.

- [ ] **Step 3: Add schedule boundary to settlement material**

In `publish/real-world-agent-loop.js`, replace `buildSettlementFactContext(...)` with:

```js
  buildSettlementFactContext({ store, action, narration, participants = [], trace = [], config = this.realConfig() } = {}) {
    const participantText = (participants || []).map((p) => [p.name || p.id || p.idOrName || '未知', p.type || '角色', p.role || '参与者'].join('｜')).join('、') || '无';
    const traceText = (trace || []).slice(-3).map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      return [item.currentLocation, item.currentAction, item.sceneFocus, item.summary].filter(Boolean).join('；');
    }).filter(Boolean).join('\n') || '无';
    const scheduleText = config?.ctx?.scheduleCandidateHintText?.(store, action, store?.realWorldLocationName || store?.realWorldSceneTitle || '') || '日程候选提示：无';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `本回合参与者：${participantText}`,
      `当前日程边界：\n${scheduleText}`,
      `最近锚定摘要：${this.compactUpdatePromptText(traceText, 600, true)}`,
      `本轮正文材料：${this.compactUpdatePromptText(narration || '', 1200, true) || '无'}`,
    ].join('\n');
  },
```

- [ ] **Step 4: Run tests to verify settlement context passes**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS for settlement fact context test.

- [ ] **Step 5: Commit Task 5**

```bash
git add "publish/real-world-agent-loop.js" "tests/real-world-loop-update.test.js"
git commit -m "feat(schedule): include schedules in settlement context"
```

---

### Task 6: Final prompt and regression verification

**Files:**
- Modify if needed: `publish/prompts/推演引擎/stage1-guided-query.md`
- Modify if needed: `publish/prompts/推演引擎/stage1-guided-query.js`
- Modify if needed: `publish/prompts/推演引擎/stage2-scene-anchor.md`
- Modify if needed: `publish/prompts/推演引擎/stage2-scene-anchor.js`
- Modify if needed: `publish/prompts/推演引擎/stage4-settlement-window.md`
- Modify if needed: `publish/prompts/推演引擎/stage4-settlement-window.js`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: context strings already injected by Tasks 2 and 5.
- Produces: prompt guidance that respects schedule candidates and `人事安排` boundaries without JSON contracts.

- [ ] **Step 1: Write prompt wording regression tests**

Add these tests near existing prompt wording tests:

```js
test('Stage1 prompt mentions schedule candidates without forcing appearance', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const prompt = await context.window.GameModules.promptTemplates.render('inference-stage1-guided-query', {
    本次行动: '前往房间',
    当前步骤: '1/2',
    最大步骤: 2,
    路由上下文: '日程候选提示：\n同住/相邻：刘思瑶',
    已加载资料摘要: '无',
    可请求资料目录: '无',
    推演自由度规则: '无',
    当前步骤输出要求: '无',
    随机场外角色候选: '无',
  });

  assert.ok(prompt.includes('日程候选'));
  assert.ok(prompt.includes('不是强制出场') || prompt.includes('不等于强制出场'));
});

test('Stage4 prompt allows character schedule settlement type', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage4-settlement-window.js');
  const prompt = await context.window.GameModules.promptTemplates.render('inference-stage4-settlement-window', {
    本次必须返回的类型: '人事安排',
    已完成类型: '无',
    未完成类型: '人事安排',
    当前窗口起始类型: '人事安排',
    当前窗口结束类型: '人事安排',
    未完成类型原因: '无',
    本轮结算材料: '当前日程边界：\n日程候选提示：无',
    类型短规则: '人事安排结算规则：只更新本回合参与者',
    类型合约: '人事安排结算：\n更新N：人事安排，当前地点/当前行动/可用状态，新值，变化原因',
    本回合参与者: '刘思琪｜角色｜参与者',
  });

  assert.ok(prompt.includes('人事安排'));
  assert.ok(prompt.includes('只更新本回合参与者'));
});
```

- [ ] **Step 2: Run tests and inspect prompt failures**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS if current templates already include injected context and type contracts; otherwise FAIL with missing schedule wording.

- [ ] **Step 3: Update Stage1 prompt if test fails**

If the Stage1 prompt test fails, edit `publish/prompts/推演引擎/stage1-guided-query.md` and generated JS counterpart to add this bullet near participant candidate rules:

```md
- 路由上下文中的“日程候选提示”只表示角色可能在同地点、同住或相邻空间；可作为高优先候选或戏剧候选，但不等于强制出场。
```

For `publish/prompts/推演引擎/stage1-guided-query.js`, add the same sentence inside the registered template string.

- [ ] **Step 4: Update Stage2 prompt if manual inspection shows ambiguity**

If `publish/prompts/推演引擎/stage2-scene-anchor.md` lacks schedule boundary guidance, add:

```md
- 场景上下文中的“日程候选提示”用于判断同地点、同住、相邻、场外和未知位置；同住/相邻不是强制出场，必须结合本次行动和空间边界决定是否出现、可听见、可敲门或发消息。
```

Mirror this sentence in `publish/prompts/推演引擎/stage2-scene-anchor.js`.

- [ ] **Step 5: Update Stage4 prompt if test fails**

If the Stage4 prompt test fails, edit `publish/prompts/推演引擎/stage4-settlement-window.md` and generated JS counterpart to add this bullet in rules:

```md
- “人事安排”只更新本回合参与者或本轮明确通信/移动/约定涉及的人；只记录当前地点、当前行动、可用状态；禁止全角色批量刷新。
```

- [ ] **Step 6: Run target regression tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
node "tests/predefined-role-card-export.test.js"
git diff --check -- "publish/real-world-agent-context.js" "publish/real-world-agent-loop.js" "publish/update/generic-update-applier.js" "publish/update/update-registry.js" "tests/real-world-loop-update.test.js" "publish/prompts/推演引擎/stage1-guided-query.md" "publish/prompts/推演引擎/stage1-guided-query.js" "publish/prompts/推演引擎/stage2-scene-anchor.md" "publish/prompts/推演引擎/stage2-scene-anchor.js" "publish/prompts/推演引擎/stage4-settlement-window.md" "publish/prompts/推演引擎/stage4-settlement-window.js"
```

Expected: all tests PASS and `git diff --check` outputs nothing.

- [ ] **Step 7: Commit Task 6**

Only include files changed during Task 6. If no prompt files changed and only tests were added, commit those tests. If no files changed because tests passed without edits, skip this commit.

```bash
git add "tests/real-world-loop-update.test.js" "publish/prompts/推演引擎/stage1-guided-query.md" "publish/prompts/推演引擎/stage1-guided-query.js" "publish/prompts/推演引擎/stage2-scene-anchor.md" "publish/prompts/推演引擎/stage2-scene-anchor.js" "publish/prompts/推演引擎/stage4-settlement-window.md" "publish/prompts/推演引擎/stage4-settlement-window.js"
git commit -m "test(schedule): cover schedule prompt guidance"
```

---

## Final Verification

- [ ] Run all target tests:

```bash
node "tests/real-world-loop-update.test.js"
node "tests/predefined-role-card-export.test.js"
```

Expected: both commands PASS.

- [ ] Run whitespace check:

```bash
git diff --check -- "publish/real-world-agent-context.js" "publish/real-world-agent-loop.js" "publish/update/generic-update-applier.js" "publish/update/update-registry.js" "tests/real-world-loop-update.test.js"
```

Expected: no output.

- [ ] Inspect changed files:

```bash
git status --porcelain
git diff --stat
```

Expected: only intended files changed or all task commits clean except unrelated pre-existing workspace changes.

## Self-Review Notes

- Spec coverage: Stage1/Stage2 read path covered by Tasks 1-2; Stage4 type/parser covered by Task 3; writeback covered by Task 4; settlement context covered by Task 5; prompt wording and regression covered by Task 6.
- Placeholder scan: no TBD/TODO/fill-later placeholders are required for implementation.
- Type consistency: `scheduleParticipantHints`, `scheduleCandidateHintText`, `parseScheduleSettlementLine`, and `applyCharacterScheduleUpdate` signatures are used consistently across tasks.
