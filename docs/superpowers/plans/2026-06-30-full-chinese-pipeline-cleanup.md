# Full Chinese Pipeline Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove legacy AI-facing JSON Stage3A/Stage3B/fallback paths from the real/story inference pipeline so the active chain is Stage1 Chinese K:V → Stage2 Chinese K:V → Stage3 prose → Stage4 Chinese K:V only.

**Architecture:** Keep internal JavaScript patch structures unchanged, but remove old AI-facing JSON prompts and unreachable compatibility/fallback code from `publish/real-world-agent-loop.js`. Stage4 remains the only settlement producer, including base route fields through the `基础结算` type. Tests become the contract that the推演主链路 contains no AI-facing JSON instructions.

**Tech Stack:** Browser globals on `window.GameModules`, plain JavaScript, markdown prompt sources under `publish/prompts/推演引擎/`, generated prompt scripts via `tools/sync-prompt-md.js`, runtime bundle via `scripts/sync-inline-assets.js`, Node `assert`/`vm` tests.

## Global Constraints

- 现实/剧情推演主链路不得出现 AI-facing JSON 输出要求。
- Stage1、Stage2、Stage4 使用中文 K:V；Stage3 只输出正文。
- `publish/prompts/推演引擎/**/*.md` 是推演提示词唯一人工编辑源。
- 同名 `.js` 与 `publish/inference-prompts-runtime.js` 是生成物，修改源后必须同步。
- 内部数据结构仍可使用 `genericUpdates`、`updateType`、`subject`、`field`、`change`、`reasons`，但这些不能出现在推演 AI-facing prompt 中。
- 微信、地图、世界观、json-repair 等非推演独立 skill 暂不纳入本次清理。
- 不保留旧 Stage3A/Stage3B JSON fallback 或兼容分组更新路径。

---

## File Structure

- Modify: `publish/real-world-agent-loop.js`
  - Remove legacy Stage3A base JSON prompt/parse functions.
  - Remove legacy Stage3B grouped JSON update prompt/fallback execution functions.
  - Keep Stage4 settlement queue/parser/window functions as the only settlement path.
  - Keep internal helper functions only if they are still used by Stage4 or tests.
- Modify: `tests/real-world-loop-update.test.js`
  - Replace Stage3A/Stage3B legacy tests with Stage4-only tests.
  - Add full-chain AI-facing prompt scan test for `publish/real-world-agent-loop.js` and generated推演 prompt assets.
  - Keep internal update-registry tests that validate JS patch application.
- Modify: `publish/prompts/推演引擎/stage4-settlement-window.md`
  - Preserve current Chinese K:V rules.
  - Add no JSON wording only if needed by tests.
- Generate: `publish/prompts/推演引擎/stage4-settlement-window.js`
- Generate: `publish/inference-prompts-runtime.js`

---

### Task 1: Add regression tests proving推演主链路 has no AI-facing JSON prompts

**Files:**
- Modify: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: current test helpers `createContext()`, `loadCore(context)`, `loadScript(context, path)`.
- Produces: tests that fail while `real-world-agent-loop.js` still contains Stage3A/Stage3B AI-facing JSON prompt strings.

- [ ] **Step 1: Write failing scan test**

Add this test near the existing prompt protocol tests:

```js
test('inference main-chain prompts contain no AI-facing JSON output contract', () => {
  const fs = require('fs');
  const files = [
    'publish/real-world-agent-loop.js',
    'publish/prompts/推演引擎/stage1-guided-query.md',
    'publish/prompts/推演引擎/stage2-scene-anchor.md',
    'publish/prompts/推演引擎/stage3-narration.md',
    'publish/prompts/推演引擎/stage4-settlement-window.md',
    'publish/prompts/推演引擎/stage1-guided-query.js',
    'publish/prompts/推演引擎/stage2-scene-anchor.js',
    'publish/prompts/推演引擎/stage3-narration.js',
    'publish/prompts/推演引擎/stage4-settlement-window.js',
    'publish/inference-prompts-runtime.js',
  ];
  const forbidden = [
    '只输出合法 JSON',
    '只输出合法JSON',
    '最小补丁 JSON',
    '输出最小补丁 JSON',
    '返回格式：{"groups"',
    '阶段3A：基础结算字段',
    '阶段3B-分组更新',
    'genericUpdates 用于',
    'initUpdates',
  ];
  files.forEach((file) => {
    const text = fs.readFileSync(file, 'utf8');
    forbidden.forEach((needle) => {
      assert.ok(!text.includes(needle), `${file} should not include ${needle}`);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because `publish/real-world-agent-loop.js` still contains `阶段3A：基础结算字段` and `最小补丁 JSON`.

---

### Task 2: Remove legacy Stage3A base JSON route from final generation

**Files:**
- Modify: `publish/real-world-agent-loop.js`
- Modify: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: `completeConfiguredSettlementKvWindow({ store, action, base, loaded, materialSession, narration, trace, participants, logId, config })`.
- Produces: `generateConfiguredFinal(...)` calls Stage4 directly after narration and uses Stage4 base fields as final route fields.

- [ ] **Step 1: Update tests to fail if Stage3A is called**

In tests that mock `loop.completeConfiguredStep`, replace branches like:

```js
if (cfg?.sourceTitle?.includes('阶段3A')) return '{"elapsedSeconds":180,"status":"测试状态","quest":"测试目标","choices":["一","二","三","四"],"sceneTitle":"测试标题","locationName":"测试地点"}';
```

with:

```js
assert.ok(!cfg?.sourceTitle?.includes('阶段3A'), 'Stage3A JSON base route must not be called');
```

Keep `completeConfiguredSettlementKvWindow` mocks returning final route data:

```js
loop.completeConfiguredSettlementKvWindow = async () => ({
  type: 'final',
  elapsedSeconds: 180,
  status: '滑动结算状态',
  quest: '滑动结算目标',
  choices: ['一', '二', '三', '四'],
  sceneTitle: '滑动标题',
  locationName: '滑动地点',
  genericUpdates: [],
});
```

- [ ] **Step 2: Run test to verify current code fails**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because current `generateConfiguredFinal` still calls Stage3A.

- [ ] **Step 3: Remove Stage3A call from `generateConfiguredFinal`**

In `publish/real-world-agent-loop.js`, replace the block that builds and completes Stage3A:

```js
skillPrompt = await this.buildConfiguredStage3BasePrompt(...);
this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在生成基础结算字段…`, config, { keepNarration: true });
selectedSkills = await this.completeConfiguredStage3Base(store, skillPrompt, logId, config);
jsonPrompt = JSON.stringify(selectedSkills);
const route = await this.completeConfiguredSettlementKvWindow(...);
result = { ...selectedSkills, ...route };
```

with:

```js
this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在生成中文 K:V 滑动结算…`, config, { keepNarration: true });
const route = await this.completeConfiguredSettlementKvWindow({ store, action, base, loaded, skills, materialSession, narration, trace, participants, logId, config });
result = { ...route, type: route.type || 'final' };
jsonPrompt = 'Stage4 中文 K:V 滑动结算';
selectedSkills = {};
```

- [ ] **Step 4: Delete Stage3A functions**

Remove these methods from `publish/real-world-agent-loop.js`:

```js
async buildConfiguredStage3BasePrompt(...) { ... }
normalizeStage3BaseFields(...) { ... }
async completeConfiguredStage3Base(...) { ... }
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: no Stage3A assertion failures remain.

---

### Task 3: Remove legacy Stage3B grouped JSON fallback path

**Files:**
- Modify: `publish/real-world-agent-loop.js`
- Modify: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: Stage4 settlement success/failure behavior.
- Produces: no code path calls `completeGroupedStage3Updates` or `buildGroupedUpdateJsonPrompt`; no AI-facing Stage3B JSON prompt remains.

- [ ] **Step 1: Update tests that assert legacy Stage3B behavior**

Delete or replace tests whose purpose is only the legacy JSON grouped path:

```text
Stage 3A base prompt does not ask for groups or skills
normalizeStage3BaseFields ignores groups and returns defaults
completeGroupedStage3Updates runs default non-init groups when route has only base fields
Stage 3B groups are capped at four update requests
bodySex prompt requires both participants to record sexual-experience
buildGroupedUpdateJsonPrompt requires full checks and avoids empty-only wording
completeGroupedStage3Updates calls all four groups even when route has no groups
worldSocialInventory rejects values scoped metrics intimacy bodyStatus and profile wearing while allowing world fields
grouped patch filtering keeps legacy world arrays only for worldSocialInventory
```

Keep tests that validate internal parsing/apply behavior unrelated to AI-facing Stage3B prompts, such as:

```text
parseSettlementKv ...
mergeGroupedUpdatePatches ...
wearing-state update writes values ...
sexual-history ...
```

- [ ] **Step 2: Add test that legacy methods are absent**

Add:

```js
test('legacy Stage3 JSON settlement methods are removed from inference loop', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  [
    'buildConfiguredStage3BasePrompt',
    'completeConfiguredStage3Base',
    'buildGroupedUpdateJsonPrompt',
    'completeGroupedStage3Updates',
    'buildConfiguredSkillSelectionPrompt',
    'completeConfiguredSkillSelection',
  ].forEach((name) => {
    assert.strictEqual(loop[name], undefined, `${name} should be removed`);
  });
});
```

- [ ] **Step 3: Run test to verify failure before deletion**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because legacy methods still exist.

- [ ] **Step 4: Delete legacy Stage3B methods and helpers**

Remove these methods from `publish/real-world-agent-loop.js` if they are only used by Stage3B:

```js
async buildConfiguredSkillSelectionPrompt(...) { ... }
async buildSkillSelectionPrompt(...) { ... }
async completeSkillSelection(...) { ... }
async completeConfiguredSkillSelection(...) { ... }
ensureRequiredUpdateSkills(...) { ... }
stage3UpdateGroups() { ... }
stage3GroupRoute(...) { ... }
normalizeStage3Groups(...) { ... }
groupsFromFlatSkills(...) { ... }
defaultStage3UpdateGroups() { ... }
async completeGroupedStage3Updates(...) { ... }
buildUpdateContextPack(...) { ... }
metricsContextText(...) { ... }
bodySexContextText(...) { ... }
survivalContextText(...) { ... }
worldSocialInventoryContextText(...) { ... }
async buildGroupedUpdateJsonPrompt(...) { ... }
filterGroupedUpdatePatch(...) { ... }
isWorldSocialInventoryGroup(...) { ... }
legacyWorldArrayKeys(...) { ... }
groupAllowsUpdateField(...) { ... }
```

Keep this method if still used by Stage4 context:

```js
participantStates(store, participants = []) { ... }
```

If `participantStates` becomes unused after deletion, remove it too.

- [ ] **Step 5: Run focused tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: tests compile and legacy method absence test passes.

---

### Task 4: Ensure Stage4 base settlement provides all final display fields

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Consumes: `parseSettlementKv(raw, { requestedTypes, participants, store, config })`.
- Produces: merged final route fields from Stage4 `基础结算`.

- [ ] **Step 1: Add Stage4-only integration test**

Add:

```js
test('generateConfiguredFinal derives display route only from Stage4 base settlement', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    assert.ok(!cfg?.sourceTitle?.includes('阶段3A'), 'Stage3A JSON route must not run');
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只结算正文确认对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n结算边界：只结算正文确认对象。';
    if (streamToUi) return '正文确认刘思琪紧张。';
    return '';
  };
  loop.completeConfiguredSettlementKvWindow = async () => ({
    elapsedSeconds: 120,
    status: 'Stage4状态',
    quest: 'Stage4目标',
    choices: ['一', '二', '三', '四'],
    sceneTitle: 'Stage4标题',
    locationName: 'Stage4地点',
    genericUpdates: [],
  });

  const out = await loop.generateConfiguredFinal({ store, action: '行动', base: '基础', loaded: [], skills: '', trace: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'direct-target' }] }], materialSession: null, logId: null, config });

  assert.strictEqual(out.result.elapsedSeconds, 120);
  assert.strictEqual(out.result.status, 'Stage4状态');
  assert.strictEqual(out.result.quest, 'Stage4目标');
  assert.strictEqual(out.result.sceneTitle, 'Stage4标题');
  assert.strictEqual(out.result.locationName, 'Stage4地点');
  assert.deepStrictEqual(out.result.choices, ['一', '二', '三', '四']);
});
```

- [ ] **Step 2: Run test**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS after Task 2 changes.

- [ ] **Step 3: Verify fallback uses minimal local defaults only on Stage4 failure**

Keep existing failure behavior in `generateConfiguredFinal`: if Stage4 throws, preserve generated narration and use minimal local defaults. Do not call Stage3B.

Expected fallback result shape:

```js
{
  type: 'final',
  elapsedSeconds: 300,
  status: store.realWorldStatus || '现实推演继续中',
  quest: store.realWorldQuest || '确认现实处境',
  choices: existingChoicesOrDefaults,
  genericUpdates: [],
}
```

---

### Task 5: Expand full-chain protocol scan and sync generated prompt assets

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Generate: `publish/prompts/推演引擎/stage4-settlement-window.js`
- Generate: `publish/inference-prompts-runtime.js`

**Interfaces:**
- Consumes: source markdown and generated runtime assets.
- Produces: repeatable protocol scan proving推演主链路 has no AI-facing JSON output contract.

- [ ] **Step 1: Sync changed prompt source**

Run:

```bash
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage4-settlement-window.md" --kind template --id inference-stage4-settlement-window && node "scripts/sync-inline-assets.js"
```

Expected: `publish/prompts/推演引擎/stage4-settlement-window.js` and `publish/inference-prompts-runtime.js` update if source changed.

- [ ] **Step 2: Run no-JSON scan over推演主链路**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
files = [
  Path('publish/real-world-agent-loop.js'),
  *Path('publish/prompts/推演引擎').glob('*.md'),
  *Path('publish/prompts/推演引擎').glob('*.js'),
  Path('publish/inference-prompts-runtime.js'),
]
forbidden = ['只输出合法 JSON','只输出合法JSON','最小补丁 JSON','输出最小补丁 JSON','阶段3A：基础结算字段','阶段3B-分组更新','返回格式：{"groups"','initUpdates','genericUpdates 用于']
failed = False
for file in files:
  text = file.read_text(encoding='utf-8')
  for needle in forbidden:
    if needle in text:
      print(f'{file}: contains {needle}')
      failed = True
raise SystemExit(1 if failed else 0)
PY
```

Expected: exit 0 and no output.

- [ ] **Step 3: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: all tests pass. Existing tests may still log intentional fallback warnings, but process exit code must be 0.

---

## Self-Review

- Spec coverage: The plan removes Stage3A JSON, Stage3B JSON, and compatibility fallback from the推演主链路 while keeping Stage4 Chinese K:V as the only settlement producer.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: The retained external settlement interface is `completeConfiguredSettlementKvWindow(...) -> final route patch`; internal patch fields remain unchanged.
- Scope check: Non推演 JSON prompts are intentionally out of scope.
