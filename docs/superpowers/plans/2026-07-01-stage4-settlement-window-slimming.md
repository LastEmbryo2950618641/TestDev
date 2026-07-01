# Stage4 Settlement Window Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slim Stage4 settlement prompts so incomplete settlement types are replayed as complete type blocks from stable facts, without refeeding old tails or full Update/Init manuals.

**Architecture:** Keep Stage3 pure prose. Stage4 gets local helpers in `publish/real-world-agent-loop.js` to build a settlement fact context, generate compact per-type rules, and summarize retry failures without raw output. The Stage4 markdown template consumes the slimmer variables and remains synchronized to generated JS/runtime assets.

**Tech Stack:** Browser globals under `window.GameModules`, Node-based tests, markdown prompt sources in `publish/prompts/推演引擎/`, generated prompt JS via `tools/sync-prompt-md.js`, runtime bundle via `scripts/sync-inline-assets.js`.

## Global Constraints

- Do not create git commits unless the user explicitly requests a commit.
- Do not modify Stage3 output protocol; Stage3 remains pure prose.
- Do not add a Stage4a/Stage4b second AI request.
- Do not persist the internal stable fact summary.
- Do not rewrite internal update/init data structures.
- Preserve existing Chinese K:V parser protocol: settlement titles, `更新N：...`, `类型完成：是`, and `结算结束：是` remain valid.
- Ignore unrelated pre-existing workspace changes unless they directly affect Stage4 correctness.

---

## File Structure

- Modify: `tests/real-world-loop-update.test.js`
  - Owns regression tests for Stage4 prompt slimming, retry failure summaries, template/runtime synchronization, and sliding window behavior.
- Modify: `publish/real-world-agent-loop.js`
  - Owns settlement contracts, Stage4 prompt variable construction, settlement parsing, retry loop, and merge of parsed patches.
  - New helper responsibilities stay in this file to match existing architecture and avoid broad refactors.
- Modify: `publish/prompts/推演引擎/stage4-settlement-window.md`
  - Owns the AI-facing Stage4 K:V prompt template.
- Generate: `publish/prompts/推演引擎/stage4-settlement-window.js`
  - Generated from the markdown source; do not hand-edit.
- Generate: `publish/inference-prompts-runtime.js`
  - Generated runtime bundle; do not hand-edit.
- Modify: `.superpowers/sdd/progress.md`
  - Execution ledger only; append task completion notes.

---

### Task 1: Add failing Stage4 prompt-slimming tests

**Files:**
- Modify: `tests/real-world-loop-update.test.js:970-1008`
- Modify: `tests/real-world-loop-update.test.js:1074-1101`
- Modify: `tests/real-world-loop-update.test.js:1985-2008`

**Interfaces:**
- Consumes: existing `loop.buildSettlementTypeWindowPrompt({ requestedTypes, completedTypes, incompleteTypes, partialByType, store, action, base, loaded, narration, trace, participants, config }) -> Promise<string>`.
- Consumes: existing `loop.completeConfiguredSettlementKvWindow({ store, action, base, loaded, narration, trace, participants, config }) -> Promise<object>`.
- Produces: tests that define required future variables: `已完成类型`, `未完成类型`, `当前窗口起始类型`, `当前窗口结束类型`, `未完成类型原因`, `本轮结算材料`, `类型短规则`.

- [ ] **Step 1: Replace runtime Stage4 template assertions with slim-template expectations**

In `tests/real-world-loop-update.test.js`, update the existing `inference runtime bundle keeps Stage1 Stage2 Stage3 slim template fields clean` test block around lines 970-981.

Replace this old Stage4 assertion block:

```js
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('现有 Update 提示词摘要'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('必须逐个输出“本次必须返回的类型”列出的每个类型'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('类型标题必须使用类型合约中的完整标题'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('不得使用短标题'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('不是最后一批时，本轮返回正文长度必须超过1000个中文字符'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('最高优先级·输出完整性'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('必须输出完整的全部类型结算块'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('参与者为空时，所有类型统一无变化'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('内部自检，不得输出'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('索引只用于阅读合约，实际输出标题不得带索引'));
```

with:

```js
  const stage4 = String(inline['inference-stage4-settlement-window']);
  [
    '现有 Update 提示词摘要',
    '现有 Init 提示词',
    '现有 Init 字段 Schema',
    '残缺原因或尾部',
    '不是最后一批时，本轮返回正文长度必须超过1000个中文字符',
  ].forEach((bad) => {
    assert.ok(!stage4.includes(bad), `Stage4 runtime template should not include ${bad}`);
  });
  [
    '最高优先级·输出完整性',
    '本轮结算材料',
    '类型短规则',
    '未完成类型原因',
    '内部提取“本轮稳定事实”',
    '明确事实：可直接结算',
    '强暗示事实：可保守结算',
    '弱氛围暗示：不得结算',
    '未完成类型必须从该类型标题开始完整重输',
    '内部自检，不得输出',
  ].forEach((good) => {
    assert.ok(stage4.includes(good), `Stage4 runtime template should include ${good}`);
  });
```

- [ ] **Step 2: Replace Update/Init guidance test with prompt pollution regression**

Replace the full test currently named `Stage4 settlement window prompt includes update and init registry guidance` around lines 985-1008 with this test:

```js
test('Stage4 settlement window prompt uses slim fact context without Update Init manuals or raw tails', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  let updateSkillsCalled = false;
  let initSkillCalled = false;
  let initSchemaCalled = false;
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  context.window.GameModules.updateRegistry.skillsText = () => {
    updateSkillsCalled = true;
    return 'UPDATE_REGISTRY_GUIDANCE_SHOULD_NOT_APPEAR';
  };
  context.window.GameModules.updateRegistry.skillText = () => {
    updateSkillsCalled = true;
    return 'UPDATE_REGISTRY_GUIDANCE_SHOULD_NOT_APPEAR';
  };
  context.window.GameModules.initPromptRegistry.skillText = () => {
    initSkillCalled = true;
    return 'INIT_PROMPT_GUIDANCE_SHOULD_NOT_APPEAR';
  };
  context.window.GameModules.initPromptRegistry.schema = () => {
    initSchemaCalled = true;
    return { initUpdates: [{ type: 'INIT_SCHEMA_GUIDANCE_SHOULD_NOT_APPEAR' }] };
  };

  const prompt = await loop.buildSettlementTypeWindowPrompt({
    requestedTypes: ['情绪', '物品'],
    completedTypes: ['感觉'],
    incompleteTypes: ['物品'],
    partialByType: { 物品: '物品结算：\n结算状态：需要更新\n更新1：物品，手机，旧尾巴原文' },
    store,
    action: '行动',
    base: '基础',
    loaded: [],
    narration: '她侧身让路，手机屏幕亮起；空气有些微妙。',
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }],
    config: loop.realConfig(),
  });

  assert.strictEqual(updateSkillsCalled, false);
  assert.strictEqual(initSkillCalled, false);
  assert.strictEqual(initSchemaCalled, false);
  [
    'UPDATE_REGISTRY_GUIDANCE_SHOULD_NOT_APPEAR',
    'INIT_PROMPT_GUIDANCE_SHOULD_NOT_APPEAR',
    'INIT_SCHEMA_GUIDANCE_SHOULD_NOT_APPEAR',
    '残缺原因或尾部',
    '旧尾巴原文',
    '现有 Update 提示词摘要',
    '现有 Init 提示词',
    '现有 Init 字段 Schema',
    '本轮返回正文长度必须超过1000',
  ].forEach((bad) => assert.ok(!prompt.includes(bad), `${bad} leaked into Stage4 prompt`));
  [
    '本轮结算材料',
    '类型短规则',
    '未完成类型原因',
    '内部提取“本轮稳定事实”',
    '明确事实：可直接结算',
    '强暗示事实：可保守结算',
    '弱氛围暗示：不得结算',
    '情绪结算规则',
    '物品结算规则',
    '需从“物品结算：”开始整块重输',
    '她侧身让路，手机屏幕亮起',
  ].forEach((good) => assert.ok(prompt.includes(good), `${good} missing from Stage4 prompt`));
});
```

- [ ] **Step 3: Update sliding retry raw-pollution test expectations**

In the test `Stage4 sliding window retries only the incomplete type without raw pollution`, replace the assertions at the end:

```js
  assert.strictEqual(JSON.stringify(rendered[1].本次必须返回的类型), JSON.stringify('感觉'));
  assert.strictEqual(rendered[1].残缺类型, '感觉');
  assert.ok(rendered[1].残缺原因或尾部.includes('感觉：'));
  assert.ok(!rendered[1].残缺原因或尾部.includes('情绪：'));
  assert.strictEqual(out.genericUpdates.length, 2);
```

with:

```js
  assert.strictEqual(JSON.stringify(rendered[1].本次必须返回的类型), JSON.stringify('感觉'));
  assert.strictEqual(rendered[1].未完成类型, '感觉');
  assert.ok(rendered[1].未完成类型原因.includes('感觉：'));
  assert.ok(rendered[1].未完成类型原因.includes('需从“感觉结算：”开始整块重输'));
  assert.ok(!rendered[1].未完成类型原因.includes('更新1：感觉，警惕，+1'));
  assert.ok(!rendered[1].未完成类型原因.includes(longEvidence));
  assert.ok(!rendered[1].未完成类型原因.includes('情绪：'));
  assert.strictEqual(out.genericUpdates.length, 2);
```

- [ ] **Step 4: Update short-output retry test expectations**

In the test `Stage4 settlement gate retries short non-final batch once with all unfinished types`, replace:

```js
  assert.strictEqual(rendered[1].本次必须返回的类型, '情绪、感觉');
  assert.ok(rendered[1].残缺原因或尾部.includes('上轮返回过短'));
```

with:

```js
  assert.strictEqual(rendered[1].本次必须返回的类型, '情绪、感觉');
  assert.strictEqual(rendered[1].未完成类型, '情绪、感觉');
  assert.ok(rendered[1].未完成类型原因.includes('上轮返回过短'));
  assert.ok(rendered[1].未完成类型原因.includes('需从“情绪结算：”开始整块重输'));
  assert.ok(rendered[1].未完成类型原因.includes('需从“感觉结算：”开始整块重输'));
```

- [ ] **Step 5: Run targeted tests and verify expected failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL before implementation. Acceptable failure examples:

```text
AssertionError: Stage4 runtime template should not include 现有 Update 提示词摘要
```

or:

```text
AssertionError: UPDATE_REGISTRY_GUIDANCE_SHOULD_NOT_APPEAR leaked into Stage4 prompt
```

- [ ] **Step 6: Record task completion note**

Append to `.superpowers/sdd/progress.md`:

```text
Plan: docs/superpowers/plans/2026-07-01-stage4-settlement-window-slimming.md
Task 1: complete (expected failing tests added; Stage4 still leaks old prompt/manual/tail inputs before implementation)
```

Do not commit.

---

### Task 2: Implement Stage4 slim builders and no-raw-tail retry summaries

**Files:**
- Modify: `publish/real-world-agent-loop.js:602-659`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: `settlementTypeContracts() -> Record<string, { title: string, format: string }>`.
- Produces: `settlementTypeShortRule(type: string): string`.
- Produces: `settlementTypeShortRules(types: string[]): string`.
- Produces: `buildSettlementFactContext({ store, action, narration, participants, trace, materialSession, loaded, config }): string`.
- Produces: `summarizeSettlementFailure(type: string, patch?: object, reason?: string): string`.
- Modifies: `buildSettlementTypeWindowPrompt(...)` to render new variables and stop calling Update/Init registries.
- Modifies: `completeConfiguredSettlementKvWindow(...)` to store failure summaries, not raw `__lines`.

- [ ] **Step 1: Add short-rule and fact-context helpers before `buildSettlementTypeWindowPrompt`**

In `publish/real-world-agent-loop.js`, insert the following methods immediately before `buildSettlementTypeWindowPrompt(...)`:

```js
  settlementTypeShortRule(type = '') {
    const contracts = this.settlementTypeContracts();
    const c = contracts[type] || { title: `${type}结算`, format: '更新N：类型，字段，变化，原因' };
    const rules = {
      '基础结算': '只记录本轮已确认的经过时间、当前状态、当前目标、场景标题、地点名称和四个备选行动；地点推进可参考强暗示事实。',
      '情绪': '只有明确行为、对话或强行为暗示支撑时才更新；弱氛围不更新；变化原因写具体行为或对话证据。',
      '感觉': '只有角色对玩家态度发生稳定变化且有明确事实时才更新；普通环境反应或弱氛围不更新。',
      '生命体征': '只有精力、饱食度、水分、疲劳、精神稳定出现明确变化时才更新。',
      '身体状态': '只有身体状态发生明确且可持续引用的变化时才更新；不得根据普通描写或氛围臆断。',
      '穿着状态': '只有明确确认穿上、脱下、更换、损坏、弄湿、缺失时才更新。',
      '性经历': '只有本轮稳定事实明确确认次数变化时才更新；未确认则无变化。',
      '性历史': '只有稳定事实明确确认历史身份或经历人数变化时才更新；未确认则无变化。',
      '关系': '只有人与人之间的关系维度发生稳定变化且有明确事实时才更新；不把单次普通互动当关系更新。',
      '角色卡': '只有身份、职业、性格、外貌、地点、长期状态等稳定资料变化时才更新；临时情绪不写入角色卡。',
      '物品': '只有获得、失去、转移、损坏、消耗、购买成功被明确确认时才更新。',
      '地图': '只有当前位置、地点事实、上下级地点、路线事实发生稳定变化时才更新；地点边界推进可参考强暗示事实。',
      '势力总览': '只有新增势力、归属变化、上层势力变化被明确确认时才更新。',
      '势力结构': '只有职位、成员、组织结构发生稳定变化且有明确事实时才更新。',
      '系统记录': '只有本轮应写入系统日志、剧情记录、消息记录、通信记录的稳定事实时才更新；可记录强暗示支持的场景焦点变化。',
      '通用固化': '只有不适合落入其他类型、但已稳定成立且需要长期保留的事实时才更新。',
      '操控体验': '只有操控感、适应度或操控体验出现明确稳定变化时才更新。',
    };
    return [
      `${c.title}规则：`,
      rules[type] || '只有本轮稳定事实明确支持时才更新；弱氛围、猜测或未确认变化不更新。',
      `格式：${c.format}`,
    ].join('\n');
  },

  settlementTypeShortRules(types = []) {
    return (types || []).map((type) => this.settlementTypeShortRule(type)).join('\n\n') || '无';
  },

  buildSettlementFactContext({ store, action, narration, participants = [], trace = [], config = this.realConfig() } = {}) {
    const participantText = (participants || []).map((p) => [p.name || p.id || p.idOrName || '未知', p.type || '角色', p.role || '参与者'].join('｜')).join('、') || '无';
    const traceText = (trace || []).slice(-3).map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      return [item.currentLocation, item.currentAction, item.sceneFocus, item.summary].filter(Boolean).join('；');
    }).filter(Boolean).join('\n') || '无';
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `本回合参与者：${participantText}`,
      `最近锚定摘要：${this.compactUpdatePromptText(traceText, 600, true)}`,
      `本轮正文材料：${this.compactUpdatePromptText(narration || '', 1200, true) || '无'}`,
    ].join('\n');
  },

  summarizeSettlementFailure(type = '', patch = null, reason = '') {
    const title = this.settlementTypeContracts()[type]?.title || `${type}结算`;
    const notes = [];
    if (reason) notes.push(reason);
    if (!patch) notes.push('本轮未返回该类型');
    else {
      if (!patch.__typeDone) notes.push('缺少“类型完成：是”');
      if (!patch.__settlementDone) notes.push('缺少“结算结束：是”');
      if (patch.__updateLines && patch.__parsedUpdates !== patch.__updateLines) notes.push('存在无法解析的更新行');
      if (type === '基础结算') {
        const missing = ['经过时间', '当前状态', '当前目标', '场景标题', '地点名称', '备选行动1', '备选行动2', '备选行动3', '备选行动4'].filter((key) => !String(patch?.baseFields?.[key] || '').trim());
        if (missing.length) notes.push(`缺少基础字段：${missing.join('、')}`);
      }
    }
    return `${type}：${notes.join('；') || '类型未完成'}；需从“${title}：”开始整块重输。`;
  },
```

- [ ] **Step 2: Replace `buildSettlementTypeWindowPrompt` implementation**

Replace the existing `buildSettlementTypeWindowPrompt(...)` method body with:

```js
  buildSettlementTypeWindowPrompt({ requestedTypes = [], completedTypes = [], incompleteTypes = [], partialByType = {}, store, action, base, loaded, materialSession = null, narration, trace = [], participants = [], config = this.realConfig() }) {
    const contracts = this.settlementTypeContracts();
    const totalTypes = requestedTypes.length;
    const typeText = requestedTypes.map((type, index) => {
      const c = contracts[type];
      const title = c?.title || `${type}结算`;
      return [`[${String(index + 1).padStart(2, '0')}/${String(totalTypes).padStart(2, '0')}] ${type}短合同（实际输出标题必须严格写“${title}：”，不得带索引）`, `${title}：`, '结算状态：需要更新 / 无变化', '若无变化：直接写“结算状态：无变化”，然后写“类型完成：是”“结算结束：是”，不要编造结算对象或更新行。', '若需要更新：结算对象：显示名全称｜角色/玩家/地点/势力/世界/系统｜允许结算', c?.format || '', '结算对象结束：显示名全称', '类型完成：是', '结算结束：是'].join('\n');
    }).join('\n\n');
    return window.GameModules.promptTemplates.render('inference-stage4-settlement-window', {
      本次必须返回的类型: requestedTypes.join('、'),
      已完成类型: completedTypes.join('、') || '无',
      未完成类型: incompleteTypes.join('、') || requestedTypes.join('、') || '无',
      当前窗口起始类型: requestedTypes[0] || '无',
      当前窗口结束类型: requestedTypes[requestedTypes.length - 1] || '无',
      本回合参与者: (participants || []).map((p) => [p.name || p.id || p.idOrName || '未知', p.type || '角色', p.role || '参与者'].join('｜')).join('、') || '无',
      本轮结算材料: this.buildSettlementFactContext({ store, action, narration, participants, trace, config }),
      类型短规则: this.settlementTypeShortRules(requestedTypes),
      未完成类型原因: Object.entries(partialByType).map(([k, v]) => `${k}：${String(v || '').replace(/\s+/gu, ' ').slice(0, 220)}`).join('\n') || '无',
      类型合约: typeText,
    });
  },
```

Notes:
- Do not call `updateRegistry.skillsText`, `updateRegistry.skillText`, `initPromptRegistry.skillText`, or `initPromptRegistry.schema` in this method.
- `base`, `loaded`, and `materialSession` remain in the signature for compatibility but are not used by the slim prompt.

- [ ] **Step 3: Replace incomplete-type raw line storage**

In `completeConfiguredSettlementKvWindow(...)`, replace the short-output retry block:

```js
        const shortReason = `上轮返回过短：${compactRawLength}/1000；必须同一轮补齐所有未完成类型：${parsed.incompleteTypes.join('、') || requestedTypes.join('、')}`;
        requestedTypes.forEach((type) => { partialByType[type] = shortReason; });
```

with:

```js
        const shortReason = `上轮返回过短：${compactRawLength}/1000；必须同一轮补齐所有未完成类型：${parsed.incompleteTypes.join('、') || requestedTypes.join('、')}`;
        requestedTypes.forEach((type) => { partialByType[type] = this.summarizeSettlementFailure(type, parsed.patchesByType[type], shortReason); });
```

Then replace:

```js
      parsed.incompleteTypes.forEach((type) => {
        const lines = parsed.patchesByType[type]?.__lines || [];
        partialByType[type] = lines.length ? lines.join('\n') : '本轮未返回该类型，需补齐完整类型块。';
      });
```

with:

```js
      parsed.incompleteTypes.forEach((type) => {
        partialByType[type] = this.summarizeSettlementFailure(type, parsed.patchesByType[type]);
      });
```

- [ ] **Step 4: Run targeted tests and verify remaining template failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: tests may still fail because `stage4-settlement-window.md`, generated JS, and runtime still contain old template text. Implementation helper-specific failures should be resolved, especially the direct prompt variable test.

- [ ] **Step 5: Record task completion note**

Append to `.superpowers/sdd/progress.md`:

```text
Task 2: complete (Stage4 slim builders implemented; raw retry tails replaced by failure summaries; template sync still pending)
```

Do not commit.

---

### Task 3: Update Stage4 prompt template and generated assets

**Files:**
- Modify: `publish/prompts/推演引擎/stage4-settlement-window.md`
- Generate: `publish/prompts/推演引擎/stage4-settlement-window.js`
- Generate: `publish/inference-prompts-runtime.js`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes template variables from Task 2: `本次必须返回的类型`, `已完成类型`, `未完成类型`, `当前窗口起始类型`, `当前窗口结束类型`, `本回合参与者`, `本轮结算材料`, `类型短规则`, `未完成类型原因`, `类型合约`.
- Produces synchronized Stage4 template source/generated/runtime assets.

- [ ] **Step 1: Replace Stage4 markdown template**

Replace the entire contents of `publish/prompts/推演引擎/stage4-settlement-window.md` with:

```markdown
# Stage4 结算滑动窗口：中文 K:V

任务：只输出中文 K:V，不输出 JSON、Markdown、正文、解释或内部分析。

【最高优先级·输出完整性】
必须输出完整的全部类型结算块：本次必须返回的类型列出几个，就必须按顺序输出几个；不得只输出一个类型，不得只输出有变化类型，不得提前结束。

【最高优先级·内部稳定事实】
任务分两步在内部完成：
第一步：根据本轮结算材料内部提取“本轮稳定事实”。
第二步：只依据“本轮稳定事实”输出当前未完成类型的完整结算。
不得输出第一步过程，不得输出“本轮稳定事实”列表，不得输出解释。

结算依据分级：
- 明确事实：可直接结算。
- 强暗示事实：可保守结算，但必须有明确行为、对话或连续动作支撑，变化原因必须写出具体行为或对话证据。
- 弱氛围暗示：不得结算。

类型边界：
- 强暗示可用于基础结算、地图结算、系统记录、小幅情绪变化、当前场景焦点变化。
- 感觉、关系、身体状态、穿着状态、物品状态、性经历、性历史、势力总览、势力结构必须以明确事实为主，不能仅凭氛围暗示更新。

【最高优先级·参与者状态检查】
本回合参与者：{{本回合参与者}}
参与者为空时，所有类型统一无变化；禁止输出“结算对象”；禁止输出“更新N”；正文描写不触发任何结算。

本次必须返回的类型：{{本次必须返回的类型}}
已完成类型：{{已完成类型}}
未完成类型：{{未完成类型}}
当前窗口起始类型：{{当前窗口起始类型}}
当前窗口结束类型：{{当前窗口结束类型}}
未完成类型原因：
{{未完成类型原因}}

本轮结算材料：
{{本轮结算材料}}

类型短规则：
{{类型短规则}}

类型合约：
{{类型合约}}

规则：
- 只输出“本次必须返回的类型”列出的类型；已完成类型不得重复输出；未列入本次必须返回的类型不得输出。
- 若某类型上轮被截断或未完成，未完成类型必须从该类型标题开始完整重输，不得从半截文本继续写。
- 每个类型要么完整输出，要么不输出；本次列出的类型必须全部完整输出。
- 如果多个类型未完成，本轮必须按“本次必须返回的类型”的顺序全部返回；不要等待下一轮逐个补。
- 类型标题必须使用类型合约中的完整标题，例如“情绪结算：”“身体状态结算：”；不得使用短标题，例如“情绪：”“身体状态：”。
- 索引只用于阅读合约，实际输出标题不得带索引；禁止输出“[01/16] 基础结算：”这类标题。
- 每个类型都必须包含“结算状态：需要更新 / 无变化”“类型完成：是”和“结算结束：是”。
- 没有稳定变化时也必须输出该类型完整块，并写“结算状态：无变化”“类型完成：是”“结算结束：是”，不要编造结算对象或更新行。
- 同一事实只落入最合适的一个类型，不重复记账。
- 只依据本轮稳定事实结算，不依据修辞、氛围、猜测或未确认变化结算。

【内部自检，不得输出】
提交前在内部检查：本次必须返回的类型是否全部出现；是否没有输出已完成类型；是否从未完成类型标题开始完整重输；参与者为空时是否没有“结算对象”和“更新N”；实际输出标题是否没有索引。不得输出“自检”“检查结果”“说明”等额外文本。
```

- [ ] **Step 2: Generate Stage4 prompt JS and runtime bundle**

Run:

```bash
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage4-settlement-window.md" --kind template --id inference-stage4-settlement-window && node "scripts/sync-inline-assets.js"
```

Expected: command exits 0 and updates:

```text
publish/prompts/推演引擎/stage4-settlement-window.js
publish/inference-prompts-runtime.js
```

- [ ] **Step 3: Run full real-world regression**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: PASS.

- [ ] **Step 4: Run story regression**

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: PASS.

- [ ] **Step 5: Record task completion note**

Append to `.superpowers/sdd/progress.md`:

```text
Task 3: complete (Stage4 template rewritten; generated JS and runtime synced; real/story regressions pass)
```

Do not commit.

---

### Task 4: Final Stage4 verification and review package

**Files:**
- Modify: `.superpowers/sdd/progress.md`
- Create: `.superpowers/sdd/stage4-final-review.diff`
- Create: `.superpowers/sdd/task-4-report.md`

**Interfaces:**
- Consumes all changes from Tasks 1-3.
- Produces final verification report and focused diff package for code review.

- [ ] **Step 1: Run full regression suite for affected files**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: PASS. Existing tests may print expected retry/log messages, but process exit must be 0.

- [ ] **Step 2: Run Stage4 prompt pollution scan**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
checks = {
  'publish/prompts/推演引擎/stage4-settlement-window.md': [
    '现有 Update 提示词摘要',
    '现有 Init 提示词',
    '现有 Init 字段 Schema',
    '残缺原因或尾部',
    '不是最后一批时，本轮返回正文长度必须超过1000个中文字符',
  ],
  'publish/prompts/推演引擎/stage4-settlement-window.js': [
    '现有 Update 提示词摘要',
    '现有 Init 提示词',
    '现有 Init 字段 Schema',
    '残缺原因或尾部',
    '不是最后一批时，本轮返回正文长度必须超过1000个中文字符',
  ],
  'publish/inference-prompts-runtime.js': [
    '现有 Update 提示词摘要',
    '现有 Init 提示词',
    '现有 Init 字段 Schema',
    '残缺原因或尾部',
    '不是最后一批时，本轮返回正文长度必须超过1000个中文字符',
  ],
}
required = {
  'publish/prompts/推演引擎/stage4-settlement-window.md': [
    '内部提取“本轮稳定事实”',
    '明确事实：可直接结算',
    '强暗示事实：可保守结算',
    '弱氛围暗示：不得结算',
    '未完成类型必须从该类型标题开始完整重输',
  ],
  'publish/prompts/推演引擎/stage4-settlement-window.js': [
    '内部提取“本轮稳定事实”',
    '明确事实：可直接结算',
    '强暗示事实：可保守结算',
    '弱氛围暗示：不得结算',
    '未完成类型必须从该类型标题开始完整重输',
  ],
  'publish/inference-prompts-runtime.js': [
    '内部提取“本轮稳定事实”',
    '明确事实：可直接结算',
    '强暗示事实：可保守结算',
    '弱氛围暗示：不得结算',
    '未完成类型必须从该类型标题开始完整重输',
  ],
}
failed = False
for file, bads in checks.items():
    text = Path(file).read_text(encoding='utf-8')
    for bad in bads:
        if bad in text:
            print(f'FAIL {file}: contains forbidden {bad}')
            failed = True
for file, goods in required.items():
    text = Path(file).read_text(encoding='utf-8')
    for good in goods:
        if good not in text:
            print(f'FAIL {file}: missing required {good}')
            failed = True
if failed:
    raise SystemExit(1)
print('PASS Stage4 final prompt pollution scan')
PY
```

Expected:

```text
PASS Stage4 final prompt pollution scan
```

- [ ] **Step 3: Run whitespace diff check**

Run:

```bash
git diff --check -- "publish/real-world-agent-loop.js" "publish/prompts/推演引擎/stage4-settlement-window.md" "publish/prompts/推演引擎/stage4-settlement-window.js" "publish/inference-prompts-runtime.js" "tests/real-world-loop-update.test.js"
```

Expected: no output, exit 0.

- [ ] **Step 4: Create focused review package**

Run:

```bash
{ git status --short; git diff -- "publish/real-world-agent-loop.js" "publish/prompts/推演引擎/stage4-settlement-window.md" "publish/prompts/推演引擎/stage4-settlement-window.js" "publish/inference-prompts-runtime.js" "tests/real-world-loop-update.test.js"; } > "/workspace/.superpowers/sdd/stage4-final-review.diff"
```

Expected: file created at `.superpowers/sdd/stage4-final-review.diff`.

- [ ] **Step 5: Write final task report**

Create `.superpowers/sdd/task-4-report.md` with this structure:

```markdown
# Stage4 Task 4 Final Verification Report

## STATUS
DONE

## Commands
- `node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"`: PASS
- Stage4 final prompt pollution scan: PASS
- `git diff --check -- ...`: PASS

## Review Package
- `.superpowers/sdd/stage4-final-review.diff`

## Findings
- Critical: none
- Important: none
- Minor: none

## Notes
- No git commit was created.
- Workspace may still contain unrelated pre-existing changes outside Stage4 scope.
```

- [ ] **Step 6: Record final progress**

Append to `.superpowers/sdd/progress.md`:

```text
Task 4: complete (final Stage4 regression, pollution scan, diff check and review package complete; no commit created)
```

Do not commit.

---

## Plan Self-Review

### Spec coverage

- Delete old tail refeed: Task 2 replaces raw `__lines` storage with `summarizeSettlementFailure`; Task 1 tests no raw old update line appears.
- Delete Update/Init full manuals and Init schema: Task 2 removes registry calls; Task 3 deletes template blocks; Task 4 scans source/generated/runtime.
- Delete 1000-character expansion rule: Task 3 rewrites markdown; Task 1 and Task 4 assert absence.
- Add Stage4 internal stable fact extraction: Task 3 prompt rule; Task 1 and Task 4 assert presence.
- Add clear/strong/weak inference tiers: Task 3 prompt rule and type boundaries; Task 1 and Task 4 assert presence.
- Keep short type rules: Task 2 implements `settlementTypeShortRules`; Task 1 verifies `情绪结算规则` and `物品结算规则` appear.
- Preserve parser protocol: Task 2 keeps titles, `更新N`, `类型完成`, `结算结束`; regression tests cover parsing.
- No Stage3 protocol changes: no Stage3 files in task file lists.
- No extra AI request: no new call site added; only existing Stage4 prompt construction changes.
- No commit: every task explicitly says do not commit.

### Placeholder scan

No TBD/TODO placeholders remain. Every code-editing step includes exact code or exact replacement instructions. Verification commands and expected outputs are explicit.

### Type consistency

Helper names are consistent across tasks:
- `settlementTypeShortRule(type = '')`
- `settlementTypeShortRules(types = [])`
- `buildSettlementFactContext({ store, action, narration, participants, trace, config })`
- `summarizeSettlementFailure(type = '', patch = null, reason = '')`

Template variables are consistent across Tasks 1-3:
- `已完成类型`
- `未完成类型`
- `当前窗口起始类型`
- `当前窗口结束类型`
- `本轮结算材料`
- `类型短规则`
- `未完成类型原因`
- `类型合约`
