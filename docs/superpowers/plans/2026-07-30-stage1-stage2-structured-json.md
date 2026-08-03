# Stage1 Stage2 Structured JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现实/操控推演的 Stage1 资料路由与 Stage2 场景锚定改为强结构 JSON，移除旧中文 K:V 与自然语言字符串协议在主链路中的作用。

**Architecture:** Stage1 输出对象化 `participants` 与 `materialRequests`，代码直接校验并映射到资料 catalog，不再解析“资料请求1：中文逗号协议”。Stage2 输出对象化 `participants`，场景人物来源统一为 `currentSceneImpactObjects.people` / `participants.present`，不再读取 `forcedParticipants` 等旧字符串字段。旧格式在主链路中直接失败并触发重试，不做兼容。

**Tech Stack:** 原生 JavaScript、Alpine store 运行时、Node.js 测试脚本、项目现有 `publish/real-world-agent-loop.js`、`publish/inference/material-request-catalog.js`、`publish/prompts/推演引擎/*.md/js`。

---

## File structure

- Modify: `publish/real-world-agent-loop.js`
  - Stage1 prompt schema、Stage1 JSON parse、Stage2 parse、trace item、scene layer resolution、retry instruction。
- Modify: `publish/inference/material-request-catalog.js`
  - 新增对象式 `materialRequests` 映射函数。
  - Stage1 主链路不再调用中文字符串 request parser。
- Modify: `publish/prompts/推演引擎/stage1-guided-query.md`
  - 固定模板同步为对象式 JSON schema。
- Modify: `publish/prompts/推演引擎/stage2-scene-anchor.md`
  - 移除旧参与者字符串字段，改为 `participants` 对象。
- Modify generated: `publish/prompts/推演引擎/stage1-guided-query.js`
  - 由 `node scripts/sync-inline-assets.js` 同步生成。
- Modify generated: `publish/prompts/推演引擎/stage2-scene-anchor.js`
  - 由 `node scripts/sync-inline-assets.js` 同步生成。
- Modify generated: `publish/inference-prompts-runtime.js`
  - 由 `node scripts/sync-inline-assets.js` 同步生成。
- Modify tests: `tests/real-world-loop-update.test.js`
  - 删除 Stage1 中文 K:V 解析主链路断言，新增对象式 Stage1/Stage2 断言。
- Modify tests: `tests/story-agent-guided.test.js`
  - 同步 story 模式 Stage1/Stage2 schema 断言。
- Modify tests: `tests/stage1-character-id.test.js`
  - 参与者对象 ID 格式断言。
- Modify tests: `tests/social-event-boundary.test.js`
  - Stage2 prompt 仍包含事件边界规则，但输出结构变为对象式。
- Create tests: `tests/stage1-stage2-structured-json.test.js`
  - 专门覆盖新 schema、旧格式拒绝、资料请求对象映射、Stage2 人物来源。

---

### Task 1: Add failing tests for Stage1 structured JSON

**Files:**
- Create: `tests/stage1-stage2-structured-json.test.js`

- [ ] **Step 1: Write the failing Stage1 tests**

Create `tests/stage1-stage2-structured-json.test.js` with this initial content:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function loadScript(context, relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

function makeContext() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        jsonUtils: {
          extractJson(text = '') {
            const raw = String(text || '').trim();
            const start = raw.indexOf('{');
            const end = raw.lastIndexOf('}');
            if (start < 0 || end < start) throw new Error('JSON missing');
            return raw.slice(start, end + 1);
          },
          repairJson(text = '') { return String(text || ''); },
          parseLoose(text = '') { return JSON.parse(this.extractJson(text)); },
        },
        ai: {
          clampNumber(value, fallback = 0) {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
          },
          normalizeChoices(value, fallback = []) {
            return Array.isArray(value) ? value : fallback;
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/inference/material-request-catalog.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  return context;
}

const context = makeContext();
const loop = context.window.GameModules.realWorldAgentLoop;

const stage1 = loop.parseGuidedStepJson(JSON.stringify({
  plan: '需要确认妹妹当前资料与地点边界',
  status: 'continue',
  sceneQueries: {
    location: ['刘思琪房间与住宅走廊'],
    causality: ['深夜进入妹妹房间的前置关系'],
    conflict: [],
  },
  participants: {
    forced: [{ name: '刘悠', id: 'player-self', reason: '玩家行动主体' }],
    priority: [{ name: '刘思琪', id: 'rel-ai-247528', reason: '玩家行动目标房间主人' }],
    drama: [],
    forbidden: [{ name: '王主管', id: 'rel-ai-999999', reason: '当前深夜住宅场景无关且不在场' }],
  },
  randomEvents: [],
  randomIntrusionCondition: '无明确条件则禁止闯入',
  materialRequests: [
    {
      type: '角色查询',
      action: '搜索角色卡',
      target: '刘思琪',
      scope: '2026 现代都市现实世界',
      reason: '本轮需要她的当前状态与性格资料',
    },
    {
      type: '势力查询',
      action: '创建势力',
      target: '成都第一中学',
      scope: '学校',
      reason: '资料中出现学校归属但势力表未收录',
    },
  ],
}));

assert.strictEqual(stage1.type, 'request_context');
assert.strictEqual(stage1.reason, '需要确认妹妹当前资料与地点边界');
assert.strictEqual(stage1.forcedParticipants[0].name, '刘悠');
assert.strictEqual(stage1.priorityCandidates[0].id, 'rel-ai-247528');
assert.strictEqual(stage1.forbiddenParticipants[0].canEnterNarration, false);
assert.strictEqual(stage1.requests.length, 2);
assert.deepStrictEqual(stage1.requests[0], {
  skill: 'character.query',
  method: 'searchCharacterProfile',
  params: { name: '刘思琪', world: '2026 现代都市现实世界' },
  source: {
    type: '角色查询',
    action: '搜索角色卡',
    target: '刘思琪',
    scope: '2026 现代都市现实世界',
    reason: '本轮需要她的当前状态与性格资料',
  },
});
assert.deepStrictEqual(stage1.sceneQueries.location, ['刘思琪房间与住宅走廊']);

assert.throws(
  () => loop.parseStep('查询规划：旧格式\n资料状态：继续请求资料\n资料请求1：角色查询，搜索角色卡，刘思琪，2026 现代都市现实世界'),
  /Stage1.*JSON|必须返回合法 JSON/u,
);

console.log('PASS Stage1 structured JSON parsing rejects old K:V');
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
```

Expected: FAIL because `parseGuidedStepJson()` currently only accepts string `materialRequests` and `parseStep()` still accepts old Chinese K:V fallback.

---

### Task 2: Implement object material request mapping

**Files:**
- Modify: `publish/inference/material-request-catalog.js`
- Modify: `publish/real-world-agent-loop.js`

- [ ] **Step 1: Add object request mapper**

In `publish/inference/material-request-catalog.js`, add this method after `parseChineseMaterialRequest`:

```js
  materialRequestFromObject(item = {}, options = {}) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const type = String(item.type || item.category || '').trim();
    const action = String(item.action || item.methodName || '').trim();
    const target = String(item.target || item.name || item.keyword || '').trim();
    const scope = String(item.scope || item.world || item.orgType || item.range || '').trim();
    const reason = String(item.reason || item.evidence || '').trim();
    const source = { type, action, target, scope, reason };
    if (type === '角色查询' && action === '搜索角色卡' && target) {
      return {
        skill: 'character.query',
        method: 'searchCharacterProfile',
        params: { name: target, world: scope || this.worldLabel() },
        source,
      };
    }
    if (type === '势力查询' && action === '创建势力' && target) {
      return {
        skill: 'faction.query',
        method: 'ensureFaction',
        params: { name: target, type: scope || '组织', world: this.worldLabel() },
        source,
      };
    }
    if (type === '新闻查询' && action === '最新热榜') {
      return {
        skill: 'news.query',
        method: 'latestHotList',
        params: { world: scope || this.worldLabel() },
        source,
      };
    }
    return null;
  },
```

- [ ] **Step 2: Route Stage1 JSON materialRequests through object mapper**

In `publish/real-world-agent-loop.js`, update `parseGuidedStepJson()` so it:

```js
    const rawMaterialRequestItems = (Array.isArray(data.materialRequests) ? data.materialRequests : []).slice(0, 3);
    const materialRequestErrors = [];
    const droppedMaterialRequests = [];
    const materialRequests = [];
    rawMaterialRequestItems.forEach((item) => {
      const req = config.ctx?.materialRequestFromObject?.(item, { mode: config.mode, store: null })
        || config.materials?.materialRequestFromObject?.(item, { mode: config.mode, store: null })
        || window.GameModules.realWorldMaterials?.materialRequestFromObject?.(item, { mode: config.mode, store: null });
      if (!req) {
        droppedMaterialRequests.push(item);
        materialRequestErrors.push(`无法识别对象式 materialRequests：${JSON.stringify(item)}`);
        return;
      }
      materialRequests.push(req);
    });
```

Replace the existing `rawMaterialRequestItems.filter((item) => typeof item === 'string')` and `requestRows` parsing block. Keep `requestRows` only for diagnostics:

```js
    const requestRows = rawMaterialRequestItems.map((item, index) => `materialRequests[${index}]：${JSON.stringify(item)}`);
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
```

Expected: still FAIL because `parseStep()` still falls back to old K:V.

---

### Task 3: Remove Stage1 Chinese K:V fallback from main chain

**Files:**
- Modify: `publish/real-world-agent-loop.js`
- Modify tests: `tests/real-world-loop-update.test.js`

- [ ] **Step 1: Make parseStep JSON-only**

Replace `parseStep(raw, config)` with:

```js
  parseStep(raw, config = this.realConfig()) {
    const jsonData = this.parseGuidedStepJson(raw, config);
    if (jsonData) return jsonData;
    throw new Error(`${config.label}Stage1 必须返回合法 JSON object，不再接受中文 K:V 或“资料请求1：”旧格式`);
  },
```

- [ ] **Step 2: Keep old helpers only if tests outside Stage1 still use them**

Do not delete `parseChineseKvBlock()` in this task because Stage4 still references it through `parseSettlementKv()` and legacy tests. Stop using `parseGuidedStepKv()` from `parseStep()`.

- [ ] **Step 3: Update old Stage1 tests**

In `tests/real-world-loop-update.test.js`, replace tests that assert Stage1 K:V parsing succeeds with assertions that it fails. The old test named like `parseChineseKvBlock parses fixed Chinese keys and aliases with score` can stay if it tests the helper directly, but any test calling `parseStep()` or `parseGuidedStepKv()` as Stage1 main path must be updated to object JSON.

Use this assertion shape:

```js
assert.throws(
  () => loop.parseStep('资料状态：继续请求资料\n资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界'),
  /Stage1 必须返回合法 JSON object/u,
);
```

- [ ] **Step 4: Run tests**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
node .\tests\real-world-loop-update.test.js
```

Expected: new test PASS; real-world loop test may expose additional old K:V assumptions. Update only Stage1 main-chain assertions, not unrelated Stage4 K:V tests.

---

### Task 4: Update Stage1 prompt schema in MD and generated JS

**Files:**
- Modify: `publish/prompts/推演引擎/stage1-guided-query.md`
- Generated: `publish/prompts/推演引擎/stage1-guided-query.js`
- Generated: `publish/inference-prompts-runtime.js`

- [ ] **Step 1: Replace Stage1 schema text**

In `publish/prompts/推演引擎/stage1-guided-query.md`, replace the old schema block with:

```md
JSON schema：
{
  "plan": "查询规划摘要",
  "status": "continue|done",
  "sceneQueries": {
    "location": ["地点查询理由"],
    "causality": ["因果查询理由"],
    "conflict": ["冲突查询理由"]
  },
  "participants": {
    "forced": [
      { "name": "人物名", "id": "player-self 或 rel-ai-*；未知则空字符串", "reason": "为什么必然参与本轮" }
    ],
    "priority": [
      { "name": "候选人物名", "id": "已知 rel-ai-*；未知则空字符串", "reason": "为什么可能自然参与" }
    ],
    "drama": [],
    "forbidden": [
      { "name": "人物名", "id": "已知 rel-ai-*；未知则空字符串", "reason": "为什么本轮不应出场" }
    ]
  },
  "randomEvents": [
    { "name": "事件名", "reason": "为什么可能影响本轮" }
  ],
  "randomIntrusionCondition": "无明确条件则禁止闯入",
  "materialRequests": [
    {
      "type": "角色查询",
      "action": "搜索角色卡",
      "target": "角色全称",
      "scope": "世界全称",
      "reason": "为什么需要该资料"
    }
  ]
}
```

Add hard rules:

```md
- status 只能写 `"continue"` 或 `"done"`，不要写中文状态。
- materialRequests 必须是对象数组；禁止输出字符串，禁止输出“资料请求1：...”。
- participants.* 必须是对象数组；禁止输出 `"刘思琪(rel-ai-xxx)"` 这种字符串 token。
- 没有内容输出空数组 `[]`，不要写“无”。
```

- [ ] **Step 2: Sync inline assets**

Run:

```bash
node .\scripts\sync-inline-assets.js
```

Expected: generated prompt JS and runtime prompt bundle update.

- [ ] **Step 3: Run prompt-related tests**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
node .\tests\stage1-character-id.test.js
node .\tests\story-agent-guided.test.js
```

Expected: tests pass after updating assertions that still look for old `"materialRequests":["角色查询，搜索角色卡"]` string.

---

### Task 5: Add failing tests for Stage2 structured participants

**Files:**
- Modify: `tests/stage1-stage2-structured-json.test.js`

- [ ] **Step 1: Append Stage2 tests**

Append to `tests/stage1-stage2-structured-json.test.js`:

```js
const stage2 = loop.parseSceneAnchorReport(JSON.stringify({
  sceneAnchorReport: '深夜住宅内，刘悠推开刘思琪房门，刘思琪与刘思瑶均在房间内。',
  currentLocation: '2026 现代都市现实世界·中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号·刘思琪房间·门口内侧',
  currentTime: '2026年7月30日 周四 00:05:03',
  spatialState: '房间内亮着床头灯，住宅走廊安静，房门刚被推开。',
  currentAction: '刘悠推开刘思琪房门并发现刘思瑶也在房间内',
  participants: {
    present: [
      { name: '刘悠', id: 'player-self', reason: '玩家行动主体' },
      { name: '刘思琪', id: 'rel-ai-247528', reason: '房间主人且正文锚定在场' },
      { name: '刘思瑶', id: 'rel-ai-247463', reason: '当前行动明确发现其在房间内' },
    ],
    notPresent: [],
    candidates: [],
  },
  randomEventImpact: [],
  writingFocus: '描写深夜推门、两名妹妹的主动反应和三人气氛。',
  currentSceneImpactObjects: {
    people: ['刘悠', '刘思琪', '刘思瑶'],
    locations: ['刘思琪房间', '住宅走廊'],
    items: ['刘思琪的房门'],
    systems: [],
    summary: '本轮正文与结算只影响刘悠、刘思琪、刘思瑶以及刘思琪房间内直接互动。',
  },
}));

assert.strictEqual(stage2.format, 'json');
assert.deepStrictEqual(stage2.sceneImpactObjects.people, ['刘悠', '刘思琪', '刘思瑶']);
assert.deepStrictEqual(stage2.participants.present.map((item) => item.name), ['刘悠', '刘思琪', '刘思瑶']);
assert.ok(!stage2.values['强制出场'], 'Stage2 should not expose legacy forcedParticipants text');

assert.throws(
  () => loop.parseSceneAnchorReport(JSON.stringify({
    sceneAnchorReport: '旧字段测试',
    currentLocation: '地点',
    currentTime: '时间',
    spatialState: '空间',
    currentAction: '行动',
    forcedParticipants: '必然在场',
    writingFocus: '重点',
    currentSceneImpactObjects: {
      people: ['刘悠'],
      locations: [],
      items: [],
      systems: [],
      summary: '边界',
    },
  })),
  /participants|旧字段|forcedParticipants/u,
);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
```

Expected: FAIL because `parseSceneAnchorJson()` currently still accepts legacy `forcedParticipants` fields and does not expose `participants.present`.

---

### Task 6: Implement Stage2 structured participants and reject legacy fields

**Files:**
- Modify: `publish/real-world-agent-loop.js`

- [ ] **Step 1: Add participant object normalizer**

Add near existing participant helpers:

```js
  normalizeStructuredParticipants(value = {}, { presentCanSettle = true } = {}) {
    const normalizeGroup = (items = [], role = '') => {
      if (!Array.isArray(items)) throw new Error(`participants.${role} 必须是数组`);
      return items.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`participants.${role}[${index}] 必须是对象`);
        const name = String(item.name || item.characterName || '').trim();
        const id = String(item.id || '').trim();
        const reason = String(item.reason || '').trim();
        if (!name) throw new Error(`participants.${role}[${index}].name 不能为空`);
        if (!reason) throw new Error(`participants.${role}[${index}].reason 不能为空`);
        return {
          name,
          id,
          reason,
          role,
          canSettle: role === 'present' ? presentCanSettle : false,
          canEnterNarration: role === 'present',
          canLoadRoleCard: role !== 'notPresent',
        };
      });
    };
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('participants 必须是 JSON object');
    return {
      present: normalizeGroup(value.present || [], 'present'),
      notPresent: normalizeGroup(value.notPresent || [], 'notPresent'),
      candidates: normalizeGroup(value.candidates || [], 'candidates'),
    };
  },
```

- [ ] **Step 2: Update parseSceneAnchorJson**

In `parseSceneAnchorJson(raw, config)`, before building `values`, reject legacy keys:

```js
    ['forcedParticipants', 'priorityCandidates', 'dramaCandidates', 'forbiddenParticipants'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(data, key)) throw new Error(`Stage2 不再接受旧字段 ${key}，请使用 participants.present/notPresent/candidates`);
    });
    const participants = this.normalizeStructuredParticipants(data.participants || {});
```

Remove these legacy mappings from `values`:

```js
'强制出场'
'高优先候选'
'戏剧候选'
'禁止出场'
```

Return `participants` in the parsed result:

```js
    return {
      text: orderedText,
      currentLocation: values['当前地点'] || '',
      currentTime: values['当前时间'] || '',
      writingFocus: values['正文写作重点'] || '',
      currentSceneImpactObjects,
      settlementBoundary: currentSceneImpactObjects,
      sceneImpactObjects,
      participants,
      values,
      parseScore: { score: this.sceneAnchorFields().length, maxScore: this.sceneAnchorFields().length, successRate: 1 },
      parseDegraded: false,
      format: 'json',
    };
```

- [ ] **Step 3: Run tests**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
```

Expected: PASS for Stage2 tests.

---

### Task 7: Update Stage2 prompt schema in MD and generated JS

**Files:**
- Modify: `publish/prompts/推演引擎/stage2-scene-anchor.md`
- Generated: `publish/prompts/推演引擎/stage2-scene-anchor.js`
- Generated: `publish/inference-prompts-runtime.js`

- [ ] **Step 1: Replace Stage2 schema**

In `publish/prompts/推演引擎/stage2-scene-anchor.md`, replace legacy participant fields with:

```md
  "participants": {
    "present": [
      { "name": "人物名", "id": "player-self 或 rel-ai-*；未知则空字符串", "reason": "为什么本轮实际在场并可被正文影响" }
    ],
    "notPresent": [
      { "name": "人物名", "id": "已知 rel-ai-*；未知则空字符串", "reason": "为什么本轮不在场或不能进入正文" }
    ],
    "candidates": [
      { "name": "人物名", "id": "已知 rel-ai-*；未知则空字符串", "reason": "为什么只是候选/背景而非实际在场" }
    ]
  },
```

Remove these fields from the JSON contract:

```md
"forcedParticipants"
"priorityCandidates"
"dramaCandidates"
"forbiddenParticipants"
```

Add hard rules:

```md
- Stage2 不再输出 forcedParticipants、priorityCandidates、dramaCandidates、forbiddenParticipants。
- participants.present 是本轮实际在场人物/存在；currentSceneImpactObjects.people 必须与 participants.present 的实际影响对象一致。
- 非人物短语、理由词、状态词不能写入 participants.present 或 currentSceneImpactObjects.people。
- “必然在场”“当前场景”“房间主人”等只能写 reason，不能作为 name。
```

- [ ] **Step 2: Sync inline assets**

Run:

```bash
node .\scripts\sync-inline-assets.js
```

Expected: Stage2 generated JS and runtime prompt bundle update.

- [ ] **Step 3: Run Stage2 prompt tests**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
node .\tests\social-event-boundary.test.js
node .\tests\story-agent-guided.test.js
```

Expected: update tests that explicitly assert old Stage2 fields.

---

### Task 8: Update trace and downstream participant source

**Files:**
- Modify: `publish/real-world-agent-loop.js`
- Modify tests: `tests/real-world-loop-update.test.js`

- [ ] **Step 1: Preserve Stage2 participants in trace anchor**

Where `anchoredTrace` attaches `anchorReport`, also attach Stage2 present participants in a predictable field:

```js
const anchoredTrace = trace.map((item, index) => index === trace.length - 1
  ? {
      ...item,
      anchorReport: sceneAnchor.data,
      scenePresentParticipants: sceneAnchor.data?.participants?.present || [],
    }
  : item);
```

- [ ] **Step 2: Make settlement participants come from Stage2 impact objects**

In `generateConfiguredFinal`, after `sceneAnchor.data` is available, calculate participants for Stage4 as:

```js
const stage2People = sceneAnchor.data?.sceneImpactObjects?.people || [];
const stage2Present = sceneAnchor.data?.participants?.present || [];
const participants = this.participantsFromSceneImpact(stage2People, stage2Present, effectiveSceneLayers, store, config);
```

Add helper:

```js
  participantsFromSceneImpact(people = [], present = [], layers = {}, store = null, config = this.realConfig()) {
    const byName = new Map();
    (Array.isArray(present) ? present : []).forEach((item) => {
      const name = String(item?.name || '').trim();
      if (name) byName.set(name, { ...item, role: item.role || 'present', canSettle: true });
    });
    const allKnown = [
      ...(layers.forcedParticipants || []),
      ...(layers.priorityCandidates || []),
      ...(layers.dramaCandidates || []),
      ...this.currentForcedParticipants(store, config),
    ];
    allKnown.forEach((item) => {
      const name = String(item?.name || item?.characterName || '').trim();
      if (name && !byName.has(name)) byName.set(name, item);
    });
    return this.dedupeParticipants((Array.isArray(people) ? people : []).map((name) => {
      const text = String(name || '').trim();
      const known = byName.get(text) || {};
      return {
        ...known,
        name: known.name || text,
        id: known.id || '',
        role: known.role || 'present',
        canSettle: true,
        canEnterNarration: true,
      };
    }));
  },
```

- [ ] **Step 3: Add downstream source test**

In `tests/real-world-loop-update.test.js`, add:

```js
test('Stage4 participants come from Stage2 currentSceneImpactObjects.people', () => {
  const participants = loop.participantsFromSceneImpact(
    ['刘悠', '刘思琪'],
    [{ name: '刘悠', id: 'player-self', reason: '玩家' }, { name: '刘思琪', id: 'rel-ai-1', reason: '在场' }],
    { forcedParticipants: [{ name: '刘思瑶', id: 'rel-ai-2', reason: 'Stage1候选但Stage2未在场' }] },
    makeStore(),
    loop.realConfig(),
  );
  assert.deepStrictEqual(participants.map((item) => item.name), ['刘悠', '刘思琪']);
});
```

- [ ] **Step 4: Run downstream tests**

Run:

```bash
node .\tests\real-world-loop-update.test.js
node .\tests\stage1-stage2-structured-json.test.js
node .\tests\real-world-settlement-actions.test.js
```

Expected: Stage4 no longer accidentally includes Stage1-only candidates.

---

### Task 9: Remove obsolete Stage1/Stage2 compatibility tests and comments

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `tests/location-graph-query.test.js`
- Modify: `tests/faction-prompt-alignment.test.js`
- Modify: `tests/news-driver-material-request.test.js`
- Modify: `publish/real-world-agent-loop.js`

- [ ] **Step 1: Replace old assertions**

Search:

```bash
rg -n "资料请求1|parseGuidedStepKv|parseChineseKvBlock|对象式 materialRequests|forcedParticipants|priorityCandidates|dramaCandidates|forbiddenParticipants" tests publish/real-world-agent-loop.js -S
```

For tests:

- Keep `parseChineseMaterialRequest` tests only if they test catalog manual parser directly.
- Replace Stage1 prompt assertions with object schema assertions:

```js
assert.ok(prompt.includes('"materialRequests"'));
assert.ok(prompt.includes('"type": "角色查询"') || prompt.includes('"type":"角色查询"'));
assert.ok(!prompt.includes('资料请求1：'));
```

- Replace Stage2 prompt assertions with:

```js
assert.ok(prompt.includes('"participants"'));
assert.ok(prompt.includes('"present"'));
assert.ok(!prompt.includes('"forcedParticipants"'));
```

- [ ] **Step 2: Remove misleading comments**

In `publish/real-world-agent-loop.js`, update comments that describe “KV 路径” for Stage1/2. Keep the DeepSeek note as:

```js
// DeepSeek response_format=json_object 与 thinking 互斥；推演 JSON 阶段仍由 prompt 强约束 + parseLoose 校验。
```

- [ ] **Step 3: Run broad relevant tests**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
node .\tests\real-world-loop-update.test.js
node .\tests\story-agent-guided.test.js
node .\tests\social-event-boundary.test.js
node .\tests\location-graph-query.test.js
node .\tests\faction-prompt-alignment.test.js
node .\tests\news-driver-material-request.test.js
node .\tests\runtime-script-syntax.test.js
```

Expected: all pass. If `real-world-loop-update.test.js` contains unrelated historical failures, isolate the Stage1/2 tests and run the smaller target only if the test runner supports it; otherwise document the unrelated failing assertion before continuing.

---

### Task 10: Final verification and commit

**Files:**
- All modified files from previous tasks.

- [ ] **Step 1: Check exact diff**

Run:

```bash
git diff --name-only
git diff -- publish/real-world-agent-loop.js publish/inference/material-request-catalog.js publish/prompts/推演引擎/stage1-guided-query.md publish/prompts/推演引擎/stage2-scene-anchor.md tests/stage1-stage2-structured-json.test.js
```

Expected: only Stage1/2 structured JSON, prompt sync, and related tests changed.

- [ ] **Step 2: Run verification suite**

Run:

```bash
node .\tests\stage1-stage2-structured-json.test.js
node .\tests\stage1-character-id.test.js
node .\tests\story-agent-guided.test.js
node .\tests\social-event-boundary.test.js
node .\tests\real-world-settlement-actions.test.js
node .\tests\runtime-script-syntax.test.js
```

Expected: all pass.

- [ ] **Step 3: Stage exact files**

Run:

```bash
git add -- publish/real-world-agent-loop.js publish/inference/material-request-catalog.js publish/prompts/推演引擎/stage1-guided-query.md publish/prompts/推演引擎/stage1-guided-query.js publish/prompts/推演引擎/stage2-scene-anchor.md publish/prompts/推演引擎/stage2-scene-anchor.js publish/inference-prompts-runtime.js tests/stage1-stage2-structured-json.test.js tests/real-world-loop-update.test.js tests/story-agent-guided.test.js tests/stage1-character-id.test.js tests/social-event-boundary.test.js
```

- [ ] **Step 4: Commit**

Run:

```bash
git commit -m "重构Stage1与Stage2结构化JSON链路"
```

Expected: commit succeeds.

---

## Self-review

- Spec coverage: Covers Stage1 object material requests, Stage1 JSON-only parse, Stage2 structured participants, removal of legacy Stage1/2 fields from main chain, prompt MD/JS sync, tests.
- Placeholder scan: No deferred placeholder steps. Each task includes exact files, code shape, commands, and expected result.
- Type consistency: Stage1 uses `status: "continue"|"done"`, `participants.forced|priority|drama|forbidden`, object `materialRequests`. Stage2 uses `participants.present|notPresent|candidates` and `currentSceneImpactObjects`.
- Scope control: Stage4 K:V compatibility is intentionally left for a later plan because it touches many update types and should be a separate migration.
