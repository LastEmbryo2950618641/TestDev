# Stage1/Stage2 Context Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove final/正文/结算/Skill 执行说明等污染内容 from Stage1 routing and Stage2 scene anchoring prompts by introducing dedicated slim context builders.

**Architecture:** Stage1 and Stage2 stop consuming full `base`, full `skills`, and full loaded material text. Context modules produce stage-specific summaries: Stage1 gets only routing facts and a Chinese material request catalog; Stage2 gets only current-scene anchor facts, participant boundaries, random-event boundaries, and short loaded anchor facts. Prompt templates expose only the stage-specific variables, and parsers support the Stage2 field rename from `结算边界` to `当前场景影响对象`.

**Tech Stack:** Browser global modules on `window.GameModules`, plain JavaScript, Markdown prompt sources under `publish/prompts/推演引擎/`, generated prompt JS via `tools/sync-prompt-md.js`, Node `assert`/`vm` tests.

## Global Constraints

- Do not create git commits unless the user explicitly asks.
- Stage1 uses Chinese K:V only and remains a material-routing stage.
- Stage2 uses Chinese K:V only and remains a current-scene anchoring stage.
- Stage1 must not render full `base` or full `skills`.
- Stage2 must not render full `base` or full `loadedText`.
- Stage2 output field `结算边界` is replaced by `当前场景影响对象`; parser keeps read compatibility for old `结算边界`.
- Existing Stage3 and Stage4 behavior is out of scope except where they consume Stage2 output names.
- Generated `.js` prompt files must be regenerated from `.md` sources after template edits.

---

## File Structure

- Modify: `publish/real-world-agent-loop.js`
  - Wire Stage1 to dedicated routing context variables.
  - Wire Stage2 to dedicated scene-anchor context variables.
  - Rename Stage2 field to `当前场景影响对象` and keep old-field parser compatibility.
- Modify: `publish/real-world-agent-context.js`
  - Add shared helper methods for Stage1 routing summaries, material catalog text, loaded-material summaries, Stage2 anchor summaries, and pollution redaction.
- Modify: `publish/story-agent-context.js`
  - Add story-mode Stage1/Stage2 summary wrappers using the same contracts and story-specific world labels/catalog.
- Modify: `publish/prompts/推演引擎/stage1-guided-query.md`
  - Remove `{{基础上下文}}`, `{{动态Skills}}`, and polluted variables.
  - Add `{{路由上下文}}`, `{{可请求资料目录}}`, `{{已加载资料摘要}}`.
- Modify: `publish/prompts/推演引擎/stage2-scene-anchor.md`
  - Remove full base/loaded sections and结算味 rules.
  - Add `{{场景锚定上下文}}` and `当前场景影响对象` field.
- Generated: `publish/prompts/推演引擎/stage1-guided-query.js`
- Generated: `publish/prompts/推演引擎/stage2-scene-anchor.js`
- Modify: `tests/real-world-loop-update.test.js`
  - Update existing Stage1/Stage2 prompt tests.
  - Add pollution-regression tests for slim contexts and renamed Stage2 field.
- Modify: `tests/story-agent-guided.test.js`
  - Add story-mode Stage1/Stage2 slim-context coverage.

---

### Task 1: Add Stage1 Slim Prompt Regression Tests

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: existing `loadCore(context)`, `makeStore()`, `loop.buildConfiguredPrompt(...)`.
- Produces: failing tests for `buildStage1RoutingContext(...)`, `stage1MaterialCatalogText(...)`, `loadedRoutingSummary(...)`, and slim Stage1 template variables.

- [ ] **Step 1: Replace the Stage1 template variable test**

In `tests/real-world-loop-update.test.js`, replace the test named `Stage 1 query planning template includes action and context variables` with:

```js
test('Stage 1 query planning template uses slim routing variables', () => {
  const body = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage1-guided-query.md'), 'utf8');
  ['{{本次行动}}', '{{路由上下文}}', '{{已加载资料摘要}}', '{{可请求资料目录}}', '{{当前步骤输出要求}}', '{{随机场外角色候选}}'].forEach((token) => {
    assert.ok(body.includes(token), `${token} missing`);
  });
  ['{{基础上下文}}', '{{动态Skills}}', '{{动态载入资料}}'].forEach((token) => {
    assert.ok(!body.includes(token), `${token} should not be in Stage1 template`);
  });
});
```

- [ ] **Step 2: Add Stage1 pollution regression test**

Append after `Stage 1 real template render does not include Stage 3 narration instructions`:

```js
test('Stage 1 prompt uses slim routing context without final narration settlement or skill manuals', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.phoneDateText = () => '2026-07-01';
  store.phoneTimeText = () => '01:20';
  store.playerSetupSummary = () => '姓名：刘悠\n生日：1998-11-19\n具体地址：锦苑小区3栋2单元601号\n财富等级：中产\n父母去世原因：交通事故';
  const config = loop.realConfig();
  config.ctx.randomActiveEventCandidates = () => [{ id: 'boss', name: '王主管' }];

  const prompt = await loop.buildConfiguredPrompt({
    store,
    action: '前往刘思琪房间',
    base: 'final 必须返回 elapsedSeconds\nsubject.id 规则\n正文必须服从场景锚定报告\n结算对象：刘思琪\n类型完成：是\nSkill：wechat.query\n激活条件：需要微信时\n返回格式：JSON',
    loaded: [{ title: '角色卡：刘思琪', text: '全部情绪值：紧张10\n全部穿着槽：bra=胸罩\n人物位置：刘思琪房间附近' }],
    skills: 'Skill：emotion-update\n返回格式：更新JSON',
    step: 1,
    config,
  });

  ['elapsedSeconds', 'final.wechatActions', 'subject.id', '结算对象', '类型完成', '正文必须', '场景锚定报告', 'Skill：', '激活条件', '返回格式', '全部情绪值', '全部穿着槽'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into Stage1 prompt`);
  });
  ['查询规划：', '资料状态：', '强制出场：', '高优先候选：', '戏剧候选：', '禁止出场：', '随机事件候选：', '随机事件闯入条件：', '资料请求：', '资料请求结束：是', '可请求资料目录', '角色查询：搜索角色卡'].forEach((good) => {
    assert.ok(prompt.includes(good), `${good} missing from Stage1 prompt`);
  });
});
```

- [ ] **Step 3: Add story-mode Stage1 catalog test**

Append to `tests/story-agent-guided.test.js`:

```js
test('story Stage1 routing context exposes story catalog without skill manuals', async () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { character: { name: '齐格', work: 'Fate Apocrypha' }, selectedWork: 'Fate Apocrypha', sceneTitle: '米雷尼亚城塞' };
  const config = loop.storyConfig();

  const prompt = await loop.buildConfiguredPrompt({
    store,
    action: '观察附近是否有人能自然介入',
    base: '需严格跟着世界线续写\nfinal 必须返回 elapsedSeconds\nSkill：worklore.query\n返回格式：JSON',
    loaded: [],
    skills: 'Skill：worklore.query\n激活条件：任何作品设定问题',
    step: 1,
    config,
  });

  assert.ok(prompt.includes('作品设定查询：入口说明、常驻设定、搜索人物、搜索剧情、搜索时间线、搜索能力、搜索关系、搜索地点、搜索物品'));
  ['Skill：', '激活条件', '返回格式', 'elapsedSeconds', '需严格跟着世界线续写'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into story Stage1 prompt`);
  });
});
```

- [ ] **Step 4: Run tests and verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because `stage1-guided-query.md` still contains old variables or Stage1 prompt still leaks polluted content.

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: FAIL until story Stage1 routing helpers are implemented.

---

### Task 2: Implement Stage1 Slim Routing Context

**Files:**
- Modify: `publish/real-world-agent-context.js`
- Modify: `publish/story-agent-context.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Consumes: `guidedMaterialRequestCatalog(mode)`, `worldLabel(...)`, `limit(text, max)`.
- Produces:
  - `stage1MaterialCatalogText(mode = 'real'): string`
  - `redactPromptPollution(text = ''): string`
  - `loadedRoutingSummary(items = []): string`
  - `buildStage1RoutingContext({ store, action, loaded, materialSession, config }): string`
  - `storyAgentContext.buildStage1RoutingContext(...)`

- [ ] **Step 1: Add shared Stage1 helpers to real context**

Insert in `publish/real-world-agent-context.js` after `guidedMaterialRequestCatalog(...)`:

```js
  stage1MaterialCatalogText(mode = 'real') {
    const lines = [];
    const seen = new Map();
    this.guidedMaterialRequestCatalog(mode).forEach((item) => {
      if (!(item.mode === 'both' || item.mode === mode)) return;
      const list = seen.get(item.category) || [];
      if (!list.includes(item.action)) list.push(item.action);
      seen.set(item.category, list);
    });
    seen.forEach((actions, category) => lines.push(`${category}：${actions.join('、')}`));
    return lines.join('\n') || '无可请求资料';
  },

  redactPromptPollution(text = '') {
    const banned = [
      /时间规则：所有现实时间都以桌面时间为准[^\n]*/gu,
      /本次 final 必须返回[^\n]*/giu,
      /final\.wechatActions[^\n]*/giu,
      /elapsedSeconds[^\n]*/giu,
      /subject\.id[^\n]*/giu,
      /主体ID规则：[\s\S]*?(?=\n[^\n：]{1,16}：|$)/gu,
      /Skill：[^\n]*/gu,
      /激活条件：[^\n]*/gu,
      /返回格式：[^\n]*/gu,
      /结算对象[^\n]*/gu,
      /类型完成[^\n]*/gu,
      /更新N[^\n]*/gu,
      /正文必须[^\n]*/gu,
      /场景锚定报告[^\n]*/gu,
      /需严格跟着世界线续写[^\n]*/gu,
      /生日：[^\n]*/gu,
      /具体地址：[^\n]*/gu,
      /财富等级：[^\n]*/gu,
      /当前财富：[^\n]*/gu,
      /财富来源：[^\n]*/gu,
      /固定收入：[^\n]*/gu,
      /性经验次数：[^\n]*/gu,
      /父母去世原因：[^\n]*/gu,
      /世界观补全：暂无[^\n]*/gu,
      /势力资料库：[\s\S]*?暂无[^\n]*(?=\n|$)/gu,
      /全部情绪值：[^\n]*/gu,
      /全部对玩家感觉值：[^\n]*/gu,
      /全部穿着槽：[^\n]*/gu,
      /全部物品：[^\n]*/gu,
      /全部技能：[^\n]*/gu,
      /全部核心属性数值：[^\n]*/gu,
      /全部身体状态细项：[^\n]*/gu,
    ];
    return banned.reduce((out, pattern) => out.replace(pattern, ''), String(text || ''))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  },

  loadedRoutingSummary(items = []) {
    if (!items.length) return '无';
    return items.map((item, index) => {
      const title = this.redactPromptPollution(item?.title || `资料${index + 1}`);
      const text = this.redactPromptPollution(item?.text || '');
      return `资料${index + 1}：${title}\n${this.limit(text, 260)}`;
    }).filter(Boolean).join('\n') || '无';
  },

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
      `已加载资料摘要：\n${this.loadedRoutingSummary(loaded)}`,
      `可请求资料目录：\n${this.stage1MaterialCatalogText(config?.mode || 'real')}`,
    ].join('\n');
  },
```

- [ ] **Step 2: Add story Stage1 wrapper**

Insert in `publish/story-agent-context.js` after `guidedMaterialRequestCatalog(...)`:

```js
  stage1MaterialCatalogText(mode = 'story') {
    const lines = [];
    const seen = new Map();
    this.guidedMaterialRequestCatalog(mode).forEach((item) => {
      if (!(item.mode === 'both' || item.mode === mode || mode === 'story')) return;
      const list = seen.get(item.category) || [];
      if (!list.includes(item.action)) list.push(item.action);
      seen.set(item.category, list);
    });
    seen.forEach((actions, category) => lines.push(`${category}：${actions.join('、')}`));
    return lines.join('\n') || '无可请求资料';
  },

  redactPromptPollution(text = '') {
    return window.GameModules.realWorldAgentContext.redactPromptPollution(text);
  },

  loadedRoutingSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedRoutingSummary(items);
  },

  buildStage1RoutingContext({ store, action, loaded = [], config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const scene = store?.sceneTitle || '未知场景';
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `当前位置：${scene}`,
      `当前时间：${store?.entryTimeLabel?.() || '未知时间'}`,
      `当前对象线索：${character}｜作品：${work}`,
      `已加载资料摘要：\n${this.loadedRoutingSummary(loaded)}`,
      `可请求资料目录：\n${this.stage1MaterialCatalogText('story')}`,
    ].join('\n');
  },
```

- [ ] **Step 3: Wire Stage1 slim vars in loop**

In `publish/real-world-agent-loop.js`, modify `buildConfiguredPrompt(...)` so Stage1 render uses the new variables. Replace the `vars` construction and return branch with this shape while preserving existing non-Stage1 variables:

```js
    const stage1RoutingContext = config.ctx.buildStage1RoutingContext?.({ store, action: actionText, loaded, materialSession, config }) || [
      `模式：${config.label}`,
      `本次行动：${actionText}`,
      `已加载资料摘要：无`,
      `可请求资料目录：无`,
    ].join('\n');
    const stage1Vars = {
      本次行动: actionText,
      当前步骤: forceFinal ? '收敛/final' : `${step}/${this.guidedMaxSteps(store, config)}`,
      最大步骤: this.guidedMaxSteps(store, config),
      路由上下文: stage1RoutingContext,
      已加载资料摘要: config.ctx.loadedRoutingSummary?.(loaded) || '无',
      可请求资料目录: config.ctx.stage1MaterialCatalogText?.(config.mode) || '无',
      推演自由度规则: config.mode === 'story' ? this.storyFreedomRule(store) : (store.realWorldFreedomRule?.() || '推演自由度：行动范围内。只推演玩家本次输入行动自然抵达的直接结果。'),
      当前步骤输出要求: this.stepOutputRule(step, forceFinal),
      随机场外角色候选: randomActiveCandidateText,
    };
    if (!forceFinal) return window.GameModules.promptTemplates.render(config.firstTemplateId || 'inference-stage1-guided-query', stage1Vars);
```

Keep the existing final/Stage3 render branch after this block.

- [ ] **Step 4: Run Stage1 tests and verify failures move to template**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: Stage1 pollution test should now pass once template is updated; before Task 3 it may still fail because the template uses old tokens.

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: story helper function errors should be resolved; remaining failures should be template-token related if any.

---

### Task 3: Update Stage1 Prompt Template and Generated JS

**Files:**
- Modify: `publish/prompts/推演引擎/stage1-guided-query.md`
- Generate: `publish/prompts/推演引擎/stage1-guided-query.js`
- Test: `tests/real-world-loop-update.test.js`
- Test: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: Stage1 vars from Task 2: `路由上下文`, `已加载资料摘要`, `可请求资料目录`.
- Produces: Stage1 template with no `基础上下文`, `动态Skills`, or `动态载入资料` placeholders.

- [ ] **Step 1: Replace Stage1 markdown content**

Overwrite `publish/prompts/推演引擎/stage1-guided-query.md` with:

```markdown
# Stage1 查询规划：中文 K:V 资料路由

任务：只输出中文 K:V，不输出 JSON、Markdown、正文或解释。

你只负责判断本次行动生成正文前还需要哪些已有资料；不得写正文，不得锚定场景，不得结算状态，不得推进后续结果。

本次行动：{{本次行动}}
当前步骤：{{当前步骤}} / {{最大步骤}}

路由上下文：
{{路由上下文}}

已加载资料摘要：
{{已加载资料摘要}}

可请求资料目录：
{{可请求资料目录}}

推演自由度规则：
{{推演自由度规则}}

当前步骤输出要求：
{{当前步骤输出要求}}

随机场外角色候选：{{随机场外角色候选}}

资料请求规则：
- 使用中文资料请求，不得输出英文 skill/method。
- 资料请求最多 Top3；超过 Top3 的候选必须丢弃，不得输出资料请求4或更多编号。
- 角色卡请求只代表可作为参考资料；不得因此把角色写入强制出场。
- 已加载资料摘要已经覆盖的人物、地点、路线不得重复请求。
- 不得请求衣着、鞋袜、随身物品等细节；这些细节不属于本阶段必要资料。
- 不得照抄示例中的占位词；角色全称、世界全称、地点全称、人物全称、作品全称都必须替换为本次行动中的真实名称。
- 资料请求示例：资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界
- 资料请求示例：资料请求1：地点查询，查询附近地点，锦苑小区3栋2单元
- 资料请求示例：资料请求1：作品设定查询，搜索人物，阿尔托莉雅·潘德拉贡，Fate/stay night

随机事件规则：
- 随机主动事件默认是场外背景，不自动入场。
- 若随机角色已在强制出场、高优先候选、戏剧候选或禁止出场中，必须移除该随机事件。
- 无明确自然闯入条件时，随机事件闯入条件必须写“无明确条件则禁止闯入”。

固定输出规则：
- 即使资料状态为“资料已足够”，也必须逐行输出固定输出顺序中的每个字段。
- 没有内容的字段写“无”，不得省略字段，不得只输出“资料状态”。
- 资料请求为“无”时，不输出资料请求1、资料请求2 等编号请求行。

固定输出顺序：
查询规划：
资料状态：继续请求资料 / 资料已足够
地点查询：
地点查询理由：
因果查询：
因果查询理由：
冲突查询：
冲突查询理由：
强制出场：
高优先候选：
戏剧候选：
禁止出场：
随机事件候选：
随机事件闯入条件：
资料请求：无 / N条
资料请求1：仅在资料请求不是“无”时输出，必须使用真实名称
资料请求结束：是
```

- [ ] **Step 2: Regenerate Stage1 prompt JS**

Run:

```bash
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage1-guided-query.md" --kind template --id inference-stage1-guided-query
```

Expected: output includes `publish/prompts/推演引擎/stage1-guided-query.js`.

- [ ] **Step 3: Run Stage1 tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: Stage1 prompt tests pass. Other failures may remain for Stage2 until later tasks.

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: story Stage1 slim-context test passes.

---

### Task 4: Add Stage2 Slim Anchor Regression Tests

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: existing `buildConfiguredSceneAnchorPrompt(...)` and `parseSceneAnchorReport(...)`.
- Produces: failing tests for slim Stage2 context, field rename, and old-field parser compatibility.

- [ ] **Step 1: Replace Stage2 prompt test expectations**

Replace the test named `scene anchor report prompt uses Chinese K:V fields and layered context` with:

```js
test('scene anchor report prompt uses slim anchor context and current-scene impact field', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage2-scene-anchor.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  const store = makeStore();
  store.realWorldLocationName = '刘思琪房间门口';
  store.phoneDateText = () => '2026-07-01';
  store.phoneTimeText = () => '01:20';

  const prompt = await loop.buildConfiguredSceneAnchorPrompt({
    store,
    action: '前往刘思琪房间',
    base: '时间规则：所有现实时间都以桌面时间为准；本次 final 必须返回 elapsedSeconds\n生日：1998-11-19\n具体地址：锦苑小区3栋2单元601号\n财富等级：中产\n性经验次数：0\n父母去世原因：交通事故\n需严格跟着世界线续写，保证正文对最新世界线连续性。',
    loaded: [{ title: '角色卡：刘思琪', text: '全部情绪值：紧张10\n全部对玩家感觉值：信任10\n全部穿着槽：bra=胸罩\n全部物品：手机\n全部技能：学习\n全部核心属性数值：力量1\n全部身体状态细项：正常\n当前位置：刘思琪房间附近\n空间事实：卧室门口与走廊相连' }],
    trace: [{
      type: 'request_context',
      forcedParticipants: [{ name: '刘思琪', reason: '房间主人' }],
      priorityCandidates: [{ name: '刘思怡', reason: '相邻房间' }],
      randomActiveEvents: [{ characterName: '王主管', eventType: 'wechat', motivation: '工作确认' }],
      sceneQueries: { location: ['房间门口'], causality: ['旧因果'], conflict: ['冲突'] },
      randomIntrusionCondition: '无明确条件则禁止闯入',
    }],
    config,
  });

  ['场景锚定报告：', '当前地点：', '空间状态：', '正文写作重点：', '当前场景影响对象：', '刘思琪', '王主管'].forEach((good) => {
    assert.ok(prompt.includes(good), `${good} missing from Stage2 prompt`);
  });
  ['elapsedSeconds', 'final.wechatActions', '结算对象', '类型完成', '更新N', '生日：', '具体地址：锦苑小区3栋2单元601号', '财富等级', '性经验次数', '父母去世原因', '需严格跟着世界线续写', '地点查询：', '因果查询：', '冲突查询：', '全部情绪值', '全部对玩家感觉值', '全部穿着槽', '全部物品', '全部技能', '全部核心属性数值', '全部身体状态细项', '结算边界：'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into Stage2 prompt`);
  });
});
```

- [ ] **Step 2: Replace Stage2 parser field test**

Replace `parse scene anchor report requires critical writing and settlement fields` with:

```js
test('parse scene anchor report reads current-scene impact objects and keeps legacy boundary compatibility', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const modern = loop.parseSceneAnchorReport(`场景锚定报告：本轮只处理门口动作。
当前地点：刘思琪房间门口
当前时间：12:56
空间状态：相邻房间可能听见但不能无因果闯入。
当前动作：玩家前往房门。
强制出场：刘思琪
高优先候选：刘思怡，不出场理由：相邻房间未被触发
戏剧候选：无
禁止出场：无
随机事件影响：王主管可能发微信，默认场外。
正文写作重点：写清抵达房门与即时回应。
当前场景影响对象：刘思琪、刘思琪房门、微信系统。`, loop.realConfig());
  assert.strictEqual(modern.currentLocation, '刘思琪房间门口');
  assert.strictEqual(modern.currentSceneImpactObjects, '刘思琪、刘思琪房门、微信系统。');
  assert.strictEqual(modern.settlementBoundary, '刘思琪、刘思琪房门、微信系统。');
  assert.ok(modern.text.includes('当前场景影响对象：刘思琪、刘思琪房门、微信系统。'));

  const legacy = loop.parseSceneAnchorReport(`场景锚定报告：旧字段兼容。
当前地点：刘思琪房间门口
当前时间：12:56
空间状态：门口。
当前动作：敲门。
强制出场：刘思琪
高优先候选：无
戏剧候选：无
禁止出场：无
随机事件影响：无
正文写作重点：敲门。
结算边界：刘思琪。`, loop.realConfig());
  assert.strictEqual(legacy.currentSceneImpactObjects, '刘思琪。');
  assert.ok(legacy.text.includes('当前场景影响对象：刘思琪。'));
});
```

- [ ] **Step 3: Update missing-anchor rejection test**

In `parse scene anchor report rejects missing location time space or action anchors`, change the `full` object field:

```js
'当前场景影响对象': '刘悠与刘思琪。',
```

Remove the old `'结算边界'` key if present.

- [ ] **Step 4: Add story Stage2 slim prompt test**

Append to `tests/story-agent-guided.test.js`:

```js
test('story Stage2 anchor prompt omits story continuation and full role-card fields', async () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  loadScript(context, 'publish/prompts/推演引擎/stage2-scene-anchor.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.storyConfig();
  const store = { character: { name: '齐格', work: 'Fate Apocrypha' }, selectedWork: 'Fate Apocrypha', sceneTitle: '米雷尼亚城塞' };

  const prompt = await loop.buildConfiguredSceneAnchorPrompt({
    store,
    action: '观察附近是否有人能自然介入',
    base: '需严格跟着世界线续写，保证正文对最新世界线连续性。\n角色当前数值：力量1 敏捷1\nfinal 必须返回 elapsedSeconds',
    loaded: [{ title: '人物资料：齐格', text: '全部技能：变身\n全部核心属性数值：力量5\n当前位置：米雷尼亚城塞庭院\n空间事实：庭院可通向大厅' }],
    trace: [{ forcedParticipants: [{ name: '齐格' }], sceneQueries: { location: ['庭院'], causality: [], conflict: [] } }],
    config,
  });

  assert.ok(prompt.includes('当前场景影响对象：'));
  assert.ok(prompt.includes('齐格'));
  ['需严格跟着世界线续写', '角色当前数值', '全部技能', '全部核心属性数值', 'elapsedSeconds', '结算边界：'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into story Stage2 prompt`);
  });
});
```

- [ ] **Step 5: Run tests and verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because Stage2 still uses full base/loaded text and old `结算边界` field.

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: FAIL until story Stage2 anchor helpers are implemented.

---

### Task 5: Implement Stage2 Slim Anchor Context and Field Rename

**Files:**
- Modify: `publish/real-world-agent-context.js`
- Modify: `publish/story-agent-context.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Consumes: `redactPromptPollution(text)`, trace participant arrays, `loadedAnchorSummary(items)`.
- Produces:
  - `loadedAnchorSummary(items = []): string`
  - `sceneParticipantBoundary(trace = []): string`
  - `buildSceneAnchorContext({ store, action, loaded, trace, materialSession, config }): string`
  - `sceneAnchorFields(): string[]` containing `当前场景影响对象`
  - `parseSceneAnchorReport(raw, config)` with `currentSceneImpactObjects` and legacy `settlementBoundary` alias.

- [ ] **Step 1: Add real Stage2 anchor helpers**

Insert in `publish/real-world-agent-context.js` after Stage1 helpers from Task 2:

```js
  loadedAnchorSummary(items = []) {
    if (!items.length) return '无';
    const keepLine = (line = '') => /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|听见|看见|通信|微信|当前行动|当前状态/u.test(line)
      && !/全部情绪|全部对玩家感觉|全部穿着槽|全部物品|全部技能|全部核心属性数值|全部身体状态细项|性经验次数|财富|生日|父母去世|等级|力量|敏捷|体质|智力|感知|意志|魅力/u.test(line);
    return items.map((item, index) => {
      const title = this.redactPromptPollution(item?.title || `资料${index + 1}`);
      const lines = this.redactPromptPollution(item?.text || '').split(/\r?\n/u).filter(keepLine).slice(0, 8);
      return lines.length ? `资料${index + 1}：${title}\n${this.limit(lines.join('\n'), 420)}` : '';
    }).filter(Boolean).join('\n') || '无';
  },

  sceneParticipantBoundary(trace = []) {
    const items = Array.isArray(trace) ? trace : [];
    const mergeByName = (key) => {
      const seen = new Set();
      return items.flatMap((item) => Array.isArray(item?.[key]) ? item[key] : []).filter((item) => {
        const name = String(item?.name || item?.idOrName || item?.id || item?.characterName || '').trim();
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      });
    };
    const names = (group = [], label = '理由') => group.map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${label}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = items.flatMap((item) => item.randomActiveEvents || []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '场外事件'}｜${item.motivation || ''}`).join('；') || '无';
    const latestCondition = [...items].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '无明确条件则禁止闯入';
    return [
      `强制出场：${names(mergeByName('forcedParticipants'), '出场理由')}`,
      `高优先候选：${names(mergeByName('priorityCandidates'), '候选理由')}`,
      `戏剧候选：${names(mergeByName('dramaCandidates'), '候选理由')}`,
      `禁止出场：${names(mergeByName('forbiddenParticipants'), '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${latestCondition}`,
    ].join('\n');
  },

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
      `参与者边界：\n${this.sceneParticipantBoundary(trace)}`,
      `已加载锚定事实：\n${this.loadedAnchorSummary(loaded)}`,
    ].join('\n');
  },
```

- [ ] **Step 2: Add story Stage2 wrappers**

Insert in `publish/story-agent-context.js` after Stage1 wrappers from Task 2:

```js
  loadedAnchorSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedAnchorSummary(items);
  },

  sceneParticipantBoundary(trace = []) {
    return window.GameModules.realWorldAgentContext.sceneParticipantBoundary(trace);
  },

  buildSceneAnchorContext({ store, action, loaded = [], trace = [], config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const scene = store?.sceneTitle || '未知场景';
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `当前场景位置：${scene}`,
      `当前时间提示：${store?.entryTimeLabel?.() || '未知时间'}`,
      `空间边界线索：仅保留当前作品《${work}》中地点、相邻空间、移动路径、自然介入条件。`,
      `参与者边界：\n${this.sceneParticipantBoundary(trace)}`,
      `已加载锚定事实：\n${this.loadedAnchorSummary(loaded)}`,
      `当前对象线索：${character}｜作品：${work}`,
    ].join('\n');
  },
```

- [ ] **Step 3: Wire Stage2 slim context in loop**

In `publish/real-world-agent-loop.js`, replace `buildConfiguredSceneAnchorPrompt(...)` body with:

```js
  async buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace = [], materialSession = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const sceneAnchorContext = config.ctx.buildSceneAnchorContext?.({ store, action: actionText, base, loaded, trace, materialSession, config }) || [
      `模式：${config.label}`,
      `本次行动：${actionText}`,
      `当前场景位置：未知地点`,
      `参与者边界：\n${this.sceneLayerSummary(trace)}`,
      `已加载锚定事实：无`,
    ].join('\n');
    return window.GameModules.promptTemplates.render('inference-stage2-scene-anchor', {
      模式标签: config.label,
      本次行动: actionText,
      场景锚定上下文: sceneAnchorContext,
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },
```

- [ ] **Step 4: Rename Stage2 fields and parser compatibility**

In `publish/real-world-agent-loop.js`, replace `sceneAnchorFields()` with:

```js
  sceneAnchorFields() {
    return ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '高优先候选', '戏剧候选', '禁止出场', '随机事件影响', '正文写作重点', '当前场景影响对象'];
  },
```

Update `kvFieldAliases()` to include:

```js
      '结算边界': '当前场景影响对象',
      '影响边界': '当前场景影响对象',
      '场景影响对象': '当前场景影响对象',
```

Replace the `sceneAnchorRequired` list inside `requiredKvFields(...)` with:

```js
    const sceneAnchorRequired = ['场景锚定报告', '当前地点', '当前时间', '空间状态', '当前动作', '强制出场', '禁止出场', '随机事件影响', '正文写作重点', '当前场景影响对象'];
```

Update `parseSceneAnchorReport(...)` return object:

```js
    const impactObjects = v['当前场景影响对象'] || '';
    return {
      text: orderedText,
      currentLocation: v['当前地点'] || '',
      currentTime: v['当前时间'] || '',
      writingFocus: v['正文写作重点'] || '',
      currentSceneImpactObjects: impactObjects,
      settlementBoundary: impactObjects,
      values: v,
      parseScore: { score: parsed.score, maxScore: parsed.maxScore, successRate: parsed.successRate },
      parseDegraded: parsed.successRate < 1,
    };
```

- [ ] **Step 5: Update scene anchor retry wording**

In `completeSceneAnchorReport(...)`, replace the retry message fragment:

```js
prompt = `${prompt}\n\n上次场景锚定报告解析失败：${err.message}。请重新输出完整中文 K:V，必须包含正文写作重点和当前场景影响对象。`;
```

- [ ] **Step 6: Run Stage2 tests and verify template failures remain**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: logic-level failures should be reduced; Stage2 template may still fail until Task 6.

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: story Stage2 helper function errors should be resolved; template failures remain until Task 6.

---

### Task 6: Update Stage2 Prompt Template and Generated JS

**Files:**
- Modify: `publish/prompts/推演引擎/stage2-scene-anchor.md`
- Generate: `publish/prompts/推演引擎/stage2-scene-anchor.js`
- Test: `tests/real-world-loop-update.test.js`
- Test: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: Stage2 var `场景锚定上下文` from Task 5.
- Produces: Stage2 prompt with `当前场景影响对象` and no `结算边界`.

- [ ] **Step 1: Replace Stage2 markdown content**

Overwrite `publish/prompts/推演引擎/stage2-scene-anchor.md` with:

```markdown
# Stage2 场景锚定报告：中文 K:V

任务：只输出中文 K:V，不输出 JSON、Markdown、正文或解释。

你只负责在正文生成前锚定本次行动的当前地点、当前时间、空间状态、出场边界、随机事件影响、正文写作重点和当前场景影响对象。

模式：{{模式标签}}
本次行动：{{本次行动}}

场景锚定上下文：
{{场景锚定上下文}}

规则：
- 本报告只判断当前场景边界，不写正文，不写结算。
- 角色资料只用于判断是否具备当前场景关联，不代表该角色实际在场。
- 禁止出场角色在当前场景中视为不在场。
- 强制出场、高优先候选、戏剧候选、禁止出场都必须保留候选姓名并写明出场理由或不出场理由；不得把上游候选直接省略成“无”。
- 若候选本轮不出场，必须在对应字段写“不出场理由”；若本轮出场，必须在对应字段写“出场理由”。
- 随机主动事件默认保持场外；只有存在明确自然闯入条件时，才可写入影响说明。
- 当前场景影响对象只写本场景内实际可能被当前行动影响的人物、地点或系统事实；不要展开更新或结算规则。

固定输出顺序：
场景锚定报告：
当前地点：
当前时间：
空间状态：
当前动作：
强制出场：
高优先候选：
戏剧候选：
禁止出场：
随机事件影响：
正文写作重点：
当前场景影响对象：
```

- [ ] **Step 2: Regenerate Stage2 prompt JS**

Run:

```bash
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage2-scene-anchor.md" --kind template --id inference-stage2-scene-anchor
```

Expected: output includes `publish/prompts/推演引擎/stage2-scene-anchor.js`.

- [ ] **Step 3: Update tests that still expect old field**

In `tests/real-world-loop-update.test.js`, update any remaining hardcoded scene-anchor mock output from:

```text
结算边界：...
```

to:

```text
当前场景影响对象：...
```

Keep one legacy parse case from Task 4 to verify compatibility.

- [ ] **Step 4: Run Stage2 tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: Stage2 slim prompt and parser tests pass.

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: story Stage2 slim prompt test passes.

---

### Task 7: Full Regression and Prompt Pollution Scan

**Files:**
- Verify: `publish/real-world-agent-loop.js`
- Verify: `publish/real-world-agent-context.js`
- Verify: `publish/story-agent-context.js`
- Verify: `publish/prompts/推演引擎/stage1-guided-query.md`
- Verify: `publish/prompts/推演引擎/stage2-scene-anchor.md`
- Verify: `tests/real-world-loop-update.test.js`
- Verify: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: all helpers and template changes from Tasks 1-6.
- Produces: verified Stage1/Stage2 slim prompts and passing regression tests.

- [ ] **Step 1: Run full Node regression**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: all tests print `PASS` and process exits with code `0`.

- [ ] **Step 2: Run targeted prompt source scan**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
checks = {
  'publish/prompts/推演引擎/stage1-guided-query.md': ['{{基础上下文}}', '{{动态Skills}}', '{{动态载入资料}}', 'Skill：', '激活条件', '返回格式', '结算对象', '类型完成', 'elapsedSeconds', 'final.wechatActions', 'subject.id'],
  'publish/prompts/推演引擎/stage2-scene-anchor.md': ['{{基础上下文}}', '{{参与者分层与查询规划}}', '{{已加载资料摘要}}', '结算边界：', '结算对象', '类型完成', '更新N', 'elapsedSeconds', 'final.wechatActions', '需严格跟着世界线续写'],
}
failed = False
for file, bads in checks.items():
    text = Path(file).read_text(encoding='utf-8')
    for bad in bads:
        if bad in text:
            print(f'FAIL {file}: contains {bad}')
            failed = True
if failed:
    raise SystemExit(1)
print('PASS prompt pollution scan')
PY
```

Expected: `PASS prompt pollution scan`.

- [ ] **Step 3: Inspect git diff without committing**

Run:

```bash
git diff -- "publish/real-world-agent-loop.js" "publish/real-world-agent-context.js" "publish/story-agent-context.js" "publish/prompts/推演引擎/stage1-guided-query.md" "publish/prompts/推演引擎/stage2-scene-anchor.md" "tests/real-world-loop-update.test.js" "tests/story-agent-guided.test.js"
```

Expected checks in diff:

```text
- Stage1 no longer renders full base or skills.
- Stage1 template uses 路由上下文 / 已加载资料摘要 / 可请求资料目录.
- Stage2 no longer renders full base or loadedText.
- Stage2 template uses 场景锚定上下文 and 当前场景影响对象.
- parseSceneAnchorReport supports 当前场景影响对象 and legacy 结算边界 alias.
- Tests cover real and story mode prompt pollution.
```

- [ ] **Step 4: Confirm no commit was created**

Run:

```bash
git status --short
```

Expected: modified files are visible; no new commit is created by this plan.

---

## Self-Review

**Spec coverage:**
- Stage1 dedicated slim input: Tasks 1-3.
- Stage1 removal of final/正文/结算/Skill pollution: Tasks 1-3 and Task 7 scan.
- Stage1 Chinese material request catalog: Task 2.
- Story Stage1 support: Tasks 1-3.
- Stage2 dedicated slim input: Tasks 4-6.
- Stage2 deletion of final/player/RPG/role-card/query/settlement pollution: Tasks 4-6 and Task 7 scan.
- Stage2 `结算边界` rename to `当前场景影响对象`: Tasks 4-6.
- Legacy Stage2 parser compatibility: Tasks 4-5.
- No Stage4 behavior changes: Global Constraints and task scopes.

**Placeholder scan:** This plan contains no TBD, no TODO, and no intentionally undefined function names. Every introduced function has an exact signature and implementation snippet.

**Type consistency:** `buildStage1RoutingContext`, `loadedRoutingSummary`, `stage1MaterialCatalogText`, `buildSceneAnchorContext`, `loadedAnchorSummary`, and `sceneParticipantBoundary` are consistently named across tests, context modules, and loop wiring. Stage2 output consistently uses `currentSceneImpactObjects` internally and preserves `settlementBoundary` as an alias.
