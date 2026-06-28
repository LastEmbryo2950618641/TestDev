# Stage 3 Grouped Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将阶段三更新拆成 Router + 初始化/情绪感觉/身体性经历/生命系统/世界社交/物品等分组 AI 请求，空组跳过，每组使用 suffix-only 补全，并在 token 统计中显示中文请求名。

**Architecture:** Stage 3A 先输出分组路由，代码端 canonical 过滤并补足强制 skill；Stage 3B 按非空分组逐个生成最小补丁 JSON，失败组跳过，成功补丁由代码端合并后进入现有 normalize/apply 流程。分组配置集中在 `real-world-agent-loop.js`，token 中文标题由中文 source 与 `token-stats.js` 映射双保险保证。

**Tech Stack:** 浏览器端原生 JavaScript；现有 `window.GameModules.realWorldAgentLoop`、`updateRegistry`、`initPromptRegistry`、`aiRequest.complete()`、`tokenStats`。

## Global Constraints

- 必须保持阶段一/阶段二行为不变。
- 每个初始化/更新分组请求都必须使用 suffix-only JSON 补全。
- Router 判定为空的分组必须跳过 AI 请求。
- 分组请求只允许输出本组对应 skill 的最小补丁；越界 updateType 必须过滤。
- 最终仍统一调用现有 `updateRegistry.normalizeUpdates()`。
- token 统计中阶段三分组 AI 请求必须显示中文标题。
- 不主动提交 git commit，除非用户明确要求。

---

## File Structure

- Modify: `publish/real-world-agent-loop.js`
  - 新增阶段三分组配置。
  - 修改 Stage 3A 解析为 grouped route。
  - 新增分组 prompt、分组执行器、补丁合并器、越界过滤。
- Modify: `publish/token-stats.js`
  - 新增阶段三中文 source/title 兜底映射。
- Test via Node one-off scripts
  - 当前项目无测试框架，按既有方式用 `node - <<'NODE'` 执行行为回归。

---

### Task 1: Stage 3 Router 分组与 canonical 过滤

**Files:**
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Produces: `stage3UpdateGroups()` returns group config map.
- Produces: `normalizeStage3Groups(selected, narration, store)` returns `{ groups, reason }`.
- Consumes: `updateRegistry.canonicalSkillIds(names)` and `initPromptRegistry.canonicalSkillIds(names, store)`.

- [ ] **Step 1: Write failing test**

```js
const assert = require('assert');
global.window = { GameModules: {} };
window.GameModules.updateRegistry = { canonicalSkillIds: (names) => names };
window.GameModules.initPromptRegistry = { canonicalSkillIds: (names) => names };
require('/workspace/publish/real-world-agent-loop.js');
const loop = window.GameModules.realWorldAgentLoop;
const out = loop.normalizeStage3Groups({ groups: { metrics: ['emotion', 'sexual-experience'], bodySex: ['body-status'], init: ['intimacy-body'] }, reason: 'r' }, '', {});
assert.deepStrictEqual(out.groups.metrics, ['emotion']);
assert.deepStrictEqual(out.groups.bodySex, ['body-status']);
assert.deepStrictEqual(out.groups.init, ['intimacy-body']);
assert.deepStrictEqual(out.groups.inventory, []);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node - <<'NODE' ... NODE`
Expected: FAIL with `loop.normalizeStage3Groups is not a function`.

- [ ] **Step 3: Implement minimal code**

Add `stage3UpdateGroups()`, `normalizeStage3Groups()`, and helpers for allowed skill filtering.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

---

### Task 2: 分组请求、空组跳过、补丁合并

**Files:**
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Produces: `completeGroupedStage3Updates(args)` returns merged update JSON patch object.
- Produces: `buildGroupedUpdateJsonPrompt(args, group)` returns prompt containing only group skills/schema.
- Produces: `mergeGroupedUpdatePatches(patches)` returns one updates object.

- [ ] **Step 1: Write failing test**

```js
const assert = require('assert');
global.window = { GameModules: {} };
window.GameModules.updateRegistry = {
  skillText: (ids) => ids.join('|'),
  schemaFor: (ids) => ({ genericUpdates: ids.map((id) => ({ updateType: id })) }),
  normalizeUpdates: (raw) => raw.genericUpdates || [],
  canonicalSkillIds: (names) => names,
};
window.GameModules.initPromptRegistry = { skillText: () => '', schema: () => ({}), canonicalSkillIds: (names) => names };
window.GameModules.ai = { normalizeChoices: (v, f) => v || f };
window.GameModules.realWorld2026 = { label: '现实' };
require('/workspace/publish/real-world-agent-loop.js');
const loop = window.GameModules.realWorldAgentLoop;
let calls = [];
loop.completeConfiguredUpdateJson = async (store, prompt) => { calls.push(prompt); return { genericUpdates: [{ updateType: prompt.includes('emotion') ? 'emotion' : 'body-status' }] }; };
const config = { ...loop.realConfig(), ctx: { buildLoadedText: () => '' } };
loop.completeGroupedStage3Updates({ store: {}, action: '继续', base: 'base', loaded: [], materialSession: null, narration: '正文', route: { groups: { init: [], metrics: ['emotion'], bodySex: ['body-status'], survival: [], worldSocial: [], inventory: [] } }, config }).then((out) => {
  assert.strictEqual(calls.length, 2);
  assert.deepStrictEqual(out.genericUpdates.map((x) => x.updateType), ['emotion', 'body-status']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL with `loop.completeGroupedStage3Updates is not a function`.

- [ ] **Step 3: Implement minimal code**

Add grouped prompt/executor/merge/filter methods and wire Stage 3 final generation to use grouped execution.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

---

### Task 3: token 统计中文化

**Files:**
- Modify: `publish/real-world-agent-loop.js`
- Modify: `publish/token-stats.js`

**Interfaces:**
- Produces: group config field `title` used as AI request source.
- Produces: `tokenStats.titleForSource(promptId, item)` recognizes stage 3 Chinese and fallback ids.

- [ ] **Step 1: Write failing test**

```js
const assert = require('assert');
global.window = { GameModules: { promptTemplates: { items: [] } } };
require('/workspace/publish/token-stats.js');
const stats = window.GameModules.tokenStats;
assert.strictEqual(stats.titleForSource('real-stage3-update-bodySex'), '现实阶段3B-身体与性经历更新');
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL because title is the raw id.

- [ ] **Step 3: Implement minimal code**

Add source title mappings in `token-stats.js`; ensure grouped AI calls pass group `title` as source.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

---

### Task 4: 全量验证

**Files:**
- Verify: `publish/real-world-agent-loop.js`
- Verify: `publish/token-stats.js`

- [ ] **Step 1: Run syntax checks**

Run:
```bash
node --check "/workspace/publish/real-world-agent-loop.js"
node --check "/workspace/publish/token-stats.js"
```
Expected: no output.

- [ ] **Step 2: Run whitespace diff check**

Run:
```bash
git diff --check -- "/workspace/publish/real-world-agent-loop.js" "/workspace/publish/token-stats.js"
```
Expected: no output.

- [ ] **Step 3: Inspect diff**

Run:
```bash
git diff -- "/workspace/publish/real-world-agent-loop.js" "/workspace/publish/token-stats.js"
```
Expected: changes match grouped Stage 3 design only.

---

## Self-Review

- Spec coverage: Router, empty group skip, grouped requests, suffix-only completion reuse, code-side merge, token Chinese titles are covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: group names are consistently `init`, `metrics`, `bodySex`, `survival`, `worldSocial`, `inventory`.
