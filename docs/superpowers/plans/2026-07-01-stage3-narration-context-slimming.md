# Stage3 Narration Context Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove final/write-back/tool-query/protocol/empty-archive pollution from Stage3 narration prompts while preserving facts needed for prose continuity.

**Architecture:** Add Stage3-specific narration context helpers instead of reusing full `baseSnapshot(...)` or full `buildLoadedText(...)`. `buildConfiguredNarrationPrompt(...)` will render slim narration context plus slim loaded narration facts, and Stage3 template/runtime/tests will enforce that only prose-useful facts remain.

**Tech Stack:** Browser globals on `window.GameModules`, plain JavaScript, Markdown prompt sources under `publish/prompts/推演引擎/`, generated prompt scripts via `tools/sync-prompt-md.js`, runtime bundle via `scripts/sync-inline-assets.js`, Node `assert`/`vm` tests.

## Global Constraints

- Do not create git commits unless the user explicitly asks.
- Stage3 is a prose/narration stage only; it must not expose final/settlement/write-back/query/tool protocol instructions.
- Stage3 must not render full `base` or full `buildLoadedText(loaded)`.
- Stage3 must preserve prose facts: current action, location/scene/time hints, scene anchor report, recent continuity, and useful loaded facts.
- The exact phrase `需严格跟着世界线续写，保证正文对最新世界线连续性` must not appear in Stage3 prompts; preserve the meaning as prose continuity wording.
- Existing Stage1/Stage2 slim context behavior is out of scope except tests may share helpers.
- Existing Stage4 settlement behavior is out of scope.
- Generated `.js` prompt files and `publish/inference-prompts-runtime.js` must be regenerated after prompt edits.

---

## File Structure

- Modify: `tests/real-world-loop-update.test.js`
  - Add real-mode Stage3 prompt pollution regression.
  - Extend runtime/prompt pollution scan for Stage3.
- Modify: `tests/story-agent-guided.test.js`
  - Add story-mode Stage3 prompt pollution regression.
- Modify: `publish/real-world-agent-context.js`
  - Add Stage3 helper methods:
    - `redactNarrationPollution(text = ''): string`
    - `safeNarrationTitle(title = '', index = 0): string`
    - `loadedNarrationSummary(items = []): string`
    - `buildNarrationContext({ store, action, base, loaded, materialSession, sceneAnchorReport, config }): string`
- Modify: `publish/story-agent-context.js`
  - Add story wrappers for Stage3 narration helper methods.
- Modify: `publish/real-world-agent-loop.js`
  - Wire `buildConfiguredNarrationPrompt(...)` to use Stage3 slim helper output.
- Modify: `publish/prompts/推演引擎/stage3-narration.md`
  - Keep prose template but remove Stage1/Stage2-style continuity wording and ensure current-scene impact wording remains.
- Generate: `publish/prompts/推演引擎/stage3-narration.js`
- Generate: `publish/inference-prompts-runtime.js`

---

### Task 1: Add Stage3 Narration Pollution Regression Tests

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: existing `createContext()`, `loadCore(context)`, `loadScript(...)`, `makeStore()`, `loop.buildConfiguredNarrationPrompt(...)`.
- Produces: failing tests for Stage3 slim narration context and loaded narration summary.

- [ ] **Step 1: Add real Stage3 narration pollution regression test**

In `tests/real-world-loop-update.test.js`, append after `Stage 2 narration prompt forbids advancing beyond current action`:

```js
test('Stage3 narration prompt uses slim prose context without final writeback or tool receipts', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage3-narration.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  const store = makeStore();
  store.realWorldLocationName = '刘思琪房间门口';
  store.realWorldSceneTitle = '锦苑小区走廊';
  store.phoneDateText = () => '2026-07-01';
  store.phoneTimeText = () => '01:20';
  store.playerSetupSummary = () => '姓名：刘悠';

  const prompt = await loop.buildConfiguredNarrationPrompt({
    store,
    action: '前往刘思琪房间',
    base: [
      '时间规则：所有现实时间都以桌面时间为准；本次 final 必须返回 elapsedSeconds，代码会用它推进桌面时间。',
      'subject.id 规则',
      '主体ID规则：\n玩家本人固定 id:player-self；未知角色直接写完整姓名，禁止自造前缀。',
      '势力资料库：\n中华人民共和国｜资料库：暂无记录。',
      '## 最近发送的世界线\n需严格跟着世界线续写，保证正文对最新世界线连续性。\n你已经走到走廊。',
    ].join('\n'),
    loaded: [{
      title: 'realworld.location.query.searchLocationOne',
      text: [
        '文本内容参照material-abc',
        '参照对象：刘思琪房间',
        '关键词查询：前往刘思琪房间',
        '除非玩家提出新的未知地点，不要继续为同一人物地点或路线重复 request_context。',
        '当前位置：刘思琪房间门口',
        '空间事实：卧室门口与走廊相连，门内可能听见敲门。',
        '微信事实：王主管只可能场外发消息。',
      ].join('\n'),
    }],
    skills: 'Skill：realworld.location.query\n返回格式：JSON',
    sceneAnchorReport: '场景锚定报告：门口场景。\n当前地点：刘思琪房间门口\n当前场景影响对象：刘思琪、房门。',
    config,
  });

  [
    'elapsedSeconds',
    'final 必须返回',
    'subject.id',
    '主体ID规则',
    'id:player-self',
    '势力资料库：',
    '暂无记录',
    '需严格跟着世界线续写，保证正文对最新世界线连续性',
    'realworld.location.query.searchLocationOne',
    '文本内容参照material-abc',
    '参照对象：',
    '关键词查询：前往刘思琪房间',
    'request_context',
    'Skill：',
    '返回格式：JSON',
  ].forEach((bad) => assert.ok(!prompt.includes(bad), `${bad} leaked into Stage3 prompt`));
  [
    '刘思琪房间门口',
    '锦苑小区走廊',
    '空间事实：卧室门口与走廊相连',
    '微信事实：王主管只可能场外发消息。',
    '场景锚定报告：门口场景。',
    '当前场景影响对象：刘思琪、房门。',
    '正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。',
  ].forEach((good) => assert.ok(prompt.includes(good), `${good} missing from Stage3 prompt`));
});
```

- [ ] **Step 2: Strengthen runtime Stage3 pollution expectations**

In `tests/real-world-loop-update.test.js`, in test `inference runtime bundle keeps Stage1 Stage2 Stage3 slim template fields clean`, extend Stage3 assertions with:

```js
  ['结算边界', '需严格跟着世界线续写，保证正文对最新世界线连续性', 'elapsedSeconds', 'subject.id'].forEach((needle) => {
    assert.ok(!stage3.includes(needle), `Stage3 runtime template should not include ${needle}`);
  });
```

Keep the existing assertion that Stage3 references `当前场景影响对象`.

- [ ] **Step 3: Add story Stage3 narration pollution regression test**

In `tests/story-agent-guided.test.js`, append before the final async runner:

```js
test('story Stage3 narration prompt omits final rules tool receipts and raw continuation wording', async () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  loadScript(context, 'publish/prompts/推演引擎/stage3-narration.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.storyConfig();
  const store = {
    character: { name: '齐格', work: 'Fate Apocrypha' },
    selectedWork: 'Fate Apocrypha',
    sceneTitle: '米雷尼亚城塞庭院',
    entryTimeLabel: () => '黄昏',
    quest: '确认庭院情况',
  };

  const prompt = await loop.buildConfiguredNarrationPrompt({
    store,
    action: '观察附近是否有人能自然介入',
    base: '需严格跟着世界线续写，保证正文对最新世界线连续性。\n角色当前数值：力量1 敏捷1\nfinal 必须返回 elapsedSeconds',
    loaded: [{
      title: 'worklore.query.searchPeople',
      text: '文本内容参照material-story\n参照对象：齐格\n关键词查询：观察附近是否有人能自然介入\n当前位置：米雷尼亚城塞庭院\n空间事实：庭院可通向大厅，脚步声可能从走廊传来。',
    }],
    sceneAnchorReport: '场景锚定报告：庭院观察。\n当前地点：米雷尼亚城塞庭院\n当前场景影响对象：齐格、庭院。',
    config,
  });

  ['需严格跟着世界线续写', '角色当前数值', 'elapsedSeconds', 'worklore.query.searchPeople', '文本内容参照material-story', '参照对象：', '关键词查询：观察附近是否有人能自然介入'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into story Stage3 prompt`);
  });
  ['Fate Apocrypha', '齐格', '米雷尼亚城塞庭院', '空间事实：庭院可通向大厅', '场景锚定报告：庭院观察。', '正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。'].forEach((good) => {
    assert.ok(prompt.includes(good), `${good} missing from story Stage3 prompt`);
  });
});
```

- [ ] **Step 4: Run tests and verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because Stage3 still injects full base/full loaded text.

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: FAIL because story Stage3 still uses full loaded text and raw base text.

---

### Task 2: Implement Stage3 Slim Narration Context Helpers

**Files:**
- Modify: `publish/real-world-agent-context.js`
- Modify: `publish/story-agent-context.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Consumes: `sanitizeLoadedTitle(title, index)`, `recentWorldline(store, limit, separator)`, `recentSummary(store, count)`, `recentLog(store, count)`, `worldLabel(store)`.
- Produces:
  - `redactNarrationPollution(text = ''): string`
  - `safeNarrationTitle(title = '', index = 0): string`
  - `loadedNarrationSummary(items = []): string`
  - `buildNarrationContext({ store, action, base, loaded, materialSession, sceneAnchorReport, config }): string`
  - story wrappers with same names.

- [ ] **Step 1: Add real Stage3 helper methods**

In `publish/real-world-agent-context.js`, insert after `loadedAnchorSummary(...)`:

```js
  redactNarrationPollution(text = '') {
    const removeBlocks = [
      /时间规则：所有现实时间都以桌面时间为准[^\n]*/gu,
      /本次 final 必须返回[^\n]*/giu,
      /final\.wechatActions[^\n]*/giu,
      /elapsedSeconds[^\n]*/giu,
      /subject\.id[^\n]*/giu,
      /subject\.id 规则[^\n]*/giu,
      /主体ID规则：[\s\S]*?(?=\n[^\n：]{1,16}：|\n## |$)/gu,
      /势力资料库：[\s\S]*?(?:暂无记录|暂无势力资料库记录。?)[^\n]*(?=\n|$)/gu,
      /需严格跟着世界线续写，保证正文对最新世界线连续性。?/gu,
      /文本内容参照material-[^\n]*/giu,
      /参照对象：[^\n]*/gu,
      /来源ID：[^\n]*/gu,
      /关键词查询：[^\n]*/gu,
      /除非玩家提出新的未知地点[^\n]*request_context[^\n]*/gu,
      /不要继续[^\n]*request_context[^\n]*/gu,
      /不要重复[^\n]*(?:资料请求|request_context)[^\n]*/gu,
      /资料请求\d*：[^\n]*/gu,
      /request_context[^\n]*/giu,
      /Skill：[^\n]*/gu,
      /激活条件：[^\n]*/gu,
      /返回格式：[^\n]*/gu,
      /结算对象[^\n]*/gu,
      /类型完成[^\n]*/gu,
      /更新N[^\n]*/gu,
      /结算边界：[^\n]*/gu,
      /暂无记录。?/gu,
      /未填写/gu,
    ];
    const methodLike = /(^|[^\p{Script=Han}])(?:[a-z][\w-]*\.)+(?:[a-z][\w-]*)(?=$|[^\p{Script=Han}])/iu;
    const protocolLine = (line = '') => methodLike.test(line) || /\b(?:skill|query|method|Top3)\b/iu.test(line);
    return removeBlocks.reduce((out, pattern) => out.replace(pattern, ''), String(text || ''))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !protocolLine(line))
      .join('\n');
  },

  safeNarrationTitle(title = '', index = 0) {
    const cleaned = this.redactNarrationPollution(title || '').trim();
    return cleaned ? this.sanitizeLoadedTitle(cleaned, index) : `资料${index + 1}`;
  },

  loadedNarrationSummary(items = []) {
    if (!items.length) return '无';
    const factKeywords = /位置|地点|房间|门口|走廊|客厅|空间|相邻|在场|附近|路过|进入|离开|等待|回应|听见|看见|可听见|可看见|通信|微信|事实|关系|历史|当前状态|当前行动|状态/u;
    const protocolKeywords = /文本内容参照|参照对象|关键词查询|资料请求|request_context|不要继续|不要重复|Top3|elapsedSeconds|subject\.id|主体ID规则|结算对象|类型完成|更新N|Skill：|激活条件|返回格式/u;
    return items.map((item, index) => {
      const title = this.safeNarrationTitle(item?.title || '', index);
      const lines = this.redactNarrationPollution(item?.text || '')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line && factKeywords.test(line) && !protocolKeywords.test(line))
        .slice(0, 10);
      return lines.length ? `资料${index + 1}：${title}\n${this.limit(lines.join('\n'), 700)}` : '';
    }).filter(Boolean).join('\n') || '无';
  },

  buildNarrationContext({ store, action, config = null } = {}) {
    const map = window.GameModules.realWorldMap?.ensure?.(store, store?.playerProfile || {}) || {};
    const recentWorldline = this.redactNarrationPollution(this.recentWorldline(store, 800, '\n'));
    const recent = this.redactNarrationPollution(this.recentSummary(store, 4));
    return [
      `模式：${config?.label || '现实'}`,
      `本次行动：${action || '继续观察现实世界'}`,
      `当前地点：${store?.realWorldLocationName || map.current || '未知地点'}`,
      `当前场景：${store?.realWorldSceneTitle || '现实世界'}`,
      `当前时间提示：${[store?.phoneDateText?.(), store?.phoneTimeText?.()].filter(Boolean).join(' ') || '未知时间'}`,
      `玩家可写资料：${store?.playerSetupSummary?.() || store?.playerName || '玩家'}`,
      `最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`,
      `最近世界线摘要：\n${recentWorldline || '无'}`,
      `最近记录摘要：\n${recent || '无'}`,
    ].join('\n');
  },
```

- [ ] **Step 2: Add story Stage3 wrappers**

In `publish/story-agent-context.js`, insert after `buildSceneAnchorContext(...)`:

```js
  redactNarrationPollution(text = '') {
    return window.GameModules.realWorldAgentContext.redactNarrationPollution(text);
  },

  safeNarrationTitle(title = '', index = 0) {
    return window.GameModules.realWorldAgentContext.safeNarrationTitle(title, index);
  },

  loadedNarrationSummary(items = []) {
    return window.GameModules.realWorldAgentContext.loadedNarrationSummary(items);
  },

  buildNarrationContext({ store, action, config = null } = {}) {
    const work = this.worldLabel(store);
    const character = store?.character?.name || '未知角色';
    const recent = this.redactNarrationPollution(this.recentLog(store, 4));
    return [
      `模式：${config?.label || '操控剧情'}`,
      `本次行动：${action || '继续推进操控剧情'}`,
      `作品：${work}`,
      `被操控角色：${character}`,
      `当前场景：${store?.sceneTitle || '未知场景'}`,
      `当前时间提示：${store?.entryTimeLabel?.() || '未知时间'}`,
      `当前目标：${store?.quest || '确认操控连接'}`,
      `最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`,
      `最近剧情摘要：\n${recent || '无'}`,
    ].join('\n');
  },
```

- [ ] **Step 3: Wire Stage3 slim context in loop**

In `publish/real-world-agent-loop.js`, replace the body of `buildConfiguredNarrationPrompt(...)` with this shape while preserving existing `writingStyle`, `modeRule`, and `narrationRules` semantics:

```js
  async buildConfiguredNarrationPrompt({ store, action, base, loaded, skills, materialSession = null, sceneAnchorReport = '', config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.loadedNarrationSummary?.(loaded) || '无';
    const narrationContext = config.ctx.buildNarrationContext?.({ store, action: actionText, base, loaded, materialSession, sceneAnchorReport, config }) || [
      `模式：${config.label}`,
      `本次行动：${actionText}`,
      `最近事实连续性：正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。`,
    ].join('\n');
    const writingStyle = store.selectedWritingStylePrompt?.() || store.writingStylePrompt?.() || '正文采用小说文风，重视画面、动作、感官和心理反应，避免复述玩家指令。';
    const modeRule = config.mode === 'story'
      ? `推演自由度：${this.storyFreedomRule(store)}\n玩家不是角色本人，而是操控/影响被操控者行动的存在；正文必须写出本次行动的动作过程、环境变化、其他人物反应、被操控者身体与心理张力、直接结果。`
      : `推演自由度：${store.realWorldFreedomRule?.() || '只推演玩家本次输入行动自然抵达的直接结果。'}${store.sharedControlState?.() ? '\n同世界附身控制规则：玩家意识附身接管被控角色身体，同时玩家现实本体仍由同一个意识维持控制；正文以第二人称“你”的附身镜头为主，不要让同一角色在两个地点同时出现。' : ''}`;
    const narrationRules = '行动范围内充分推演：写出本次行动的动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响；场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；不替玩家执行下一步新行动；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段。';
    return window.GameModules.promptTemplates.render('inference-stage3-narration', {
      模式标签: config.label,
      本次行动: actionText,
      基础上下文: [this.continuityFallbackRule(), `小说笔风：${writingStyle}`, modeRule, narrationRules, narrationContext].join('\n'),
      场景锚定报告: sceneAnchorReport || '无',
      已动态载入资料: loadedText || '无',
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },
```

Important: This code must not call `config.ctx.buildLoadedText(loaded)` or inject `compactUpdatePromptText(base, 1800)` for Stage3.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: real Stage3 pollution test passes. Remaining failures, if any, should point to Stage3 template/runtime source scan from Task 3.

Run:

```bash
node "tests/story-agent-guided.test.js"
```

Expected: story Stage3 pollution test passes.

---

### Task 3: Update Stage3 Template and Generated Assets

**Files:**
- Modify: `publish/prompts/推演引擎/stage3-narration.md`
- Generate: `publish/prompts/推演引擎/stage3-narration.js`
- Generate: `publish/inference-prompts-runtime.js`
- Modify: `tests/real-world-loop-update.test.js` only if runtime/source scan needs exact expected strings updated.

**Interfaces:**
- Consumes: Stage3 vars from Task 2: `基础上下文`, `场景锚定报告`, `已动态载入资料`.
- Produces: Stage3 prompt source/runtime without raw continuation wording or legacy boundary wording.

- [ ] **Step 1: Update Stage3 markdown wording**

In `publish/prompts/推演引擎/stage3-narration.md`, keep the existing structure but ensure the write rules include this exact line and do not include raw worldline wording:

```markdown
- 正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。
```

The write rules must still include:

```markdown
- 正文必须服从场景锚定报告中的当前地点、空间状态、出场边界、禁止出场、随机事件影响和当前场景影响对象。
- 场景锚定报告中的强制出场必须在正文中实际出现、行动或回应；禁止只引用角色资料却不让其进入当前正文。
- 加载过的角色卡只能作为准确性参考，不代表该角色已经入场、互动或可结算。
```

Remove any occurrence of:

```text
需严格跟着世界线续写，保证正文对最新世界线连续性
结算边界：
elapsedSeconds
subject.id
```

- [ ] **Step 2: Regenerate Stage3 prompt JS and runtime bundle**

Run:

```bash
node "tools/sync-prompt-md.js" "publish/prompts/推演引擎/stage3-narration.md" --kind template --id inference-stage3-narration && node "scripts/sync-inline-assets.js"
```

Expected: `publish/prompts/推演引擎/stage3-narration.js` and `publish/inference-prompts-runtime.js` update if source changed.

- [ ] **Step 3: Run Stage3 source/runtime scan**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
checks = {
  'publish/prompts/推演引擎/stage3-narration.md': ['需严格跟着世界线续写，保证正文对最新世界线连续性', 'elapsedSeconds', 'subject.id', '结算边界：'],
  'publish/prompts/推演引擎/stage3-narration.js': ['需严格跟着世界线续写，保证正文对最新世界线连续性', 'elapsedSeconds', 'subject.id', '结算边界：'],
  'publish/inference-prompts-runtime.js': ['需严格跟着世界线续写，保证正文对最新世界线连续性', '结算边界：'],
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
print('PASS Stage3 prompt pollution scan')
PY
```

Expected: `PASS Stage3 prompt pollution scan`.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: all tests print `PASS` and exit code `0`.

---

### Task 4: Final Regression and Diff Review

**Files:**
- Verify: `publish/real-world-agent-context.js`
- Verify: `publish/story-agent-context.js`
- Verify: `publish/real-world-agent-loop.js`
- Verify: `publish/prompts/推演引擎/stage3-narration.md`
- Verify: `publish/prompts/推演引擎/stage3-narration.js`
- Verify: `publish/inference-prompts-runtime.js`
- Verify: `tests/real-world-loop-update.test.js`
- Verify: `tests/story-agent-guided.test.js`

**Interfaces:**
- Consumes: all Stage3 helpers/template/test changes from Tasks 1-3.
- Produces: verified Stage3 slim narration prompt behavior.

- [ ] **Step 1: Run full Node regression**

Run:

```bash
node "tests/real-world-loop-update.test.js" && node "tests/story-agent-guided.test.js"
```

Expected: all tests print `PASS` and process exits with code `0`.

- [ ] **Step 2: Run combined prompt pollution scan**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
checks = {
  'publish/prompts/推演引擎/stage3-narration.md': ['需严格跟着世界线续写，保证正文对最新世界线连续性', 'elapsedSeconds', 'subject.id', '结算边界：', 'realworld.location.query.searchLocationOne', 'worklore.query.searchPeople'],
  'publish/prompts/推演引擎/stage3-narration.js': ['需严格跟着世界线续写，保证正文对最新世界线连续性', 'elapsedSeconds', 'subject.id', '结算边界：', 'realworld.location.query.searchLocationOne', 'worklore.query.searchPeople'],
  'publish/inference-prompts-runtime.js': ['需严格跟着世界线续写，保证正文对最新世界线连续性', '结算边界：'],
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
print('PASS Stage3 final prompt pollution scan')
PY
```

Expected: `PASS Stage3 final prompt pollution scan`.

- [ ] **Step 3: Check diff whitespace**

Run:

```bash
git diff --check -- "publish/real-world-agent-context.js" "publish/story-agent-context.js" "publish/real-world-agent-loop.js" "publish/prompts/推演引擎/stage3-narration.md" "publish/prompts/推演引擎/stage3-narration.js" "publish/inference-prompts-runtime.js" "tests/real-world-loop-update.test.js" "tests/story-agent-guided.test.js"
```

Expected: no output and exit code `0`.

- [ ] **Step 4: Inspect focused diff**

Run:

```bash
git diff -- "publish/real-world-agent-context.js" "publish/story-agent-context.js" "publish/real-world-agent-loop.js" "publish/prompts/推演引擎/stage3-narration.md" "tests/real-world-loop-update.test.js" "tests/story-agent-guided.test.js"
```

Expected checks in diff:

```text
- Stage3 no longer calls buildLoadedText(loaded) in buildConfiguredNarrationPrompt.
- Stage3 no longer injects compactUpdatePromptText(base, 1800).
- Stage3 has real/story slim narration context helpers.
- Stage3 dynamic loaded summaries remove tool receipt fields and preserve factual location/space/communication lines.
- Stage3 template keeps prose rules and current scene impact object wording.
- Tests cover real and story Stage3 pollution cases.
```

- [ ] **Step 5: Confirm no commit was created**

Run:

```bash
git status --short
```

Expected: modified files are visible; no new commit is created by this plan.

---

## Self-Review

**Spec coverage:**
- Stage3 final/write-back/subject.id removal: Tasks 1-2 and Task 4 scans.
- Empty faction archive removal: Tasks 1-2.
- Raw worldline continuity phrase removal with semantic replacement: Tasks 1-3.
- Tool receipt title/metadata/query-only/process-control removal: Tasks 1-2.
- Real/story Stage3 coverage: Tasks 1-4.
- Generated Stage3 JS/runtime sync: Task 3.
- Stage4 out of scope: Global Constraints and no Stage4 task.

**Placeholder scan:** This plan contains no TBD/TODO placeholders and no undefined helper names. Every new helper is defined before use.

**Type consistency:** `redactNarrationPollution`, `safeNarrationTitle`, `loadedNarrationSummary`, and `buildNarrationContext` are consistently named across context modules and loop wiring. Stage3 prompt variables remain `基础上下文`, `场景锚定报告`, and `已动态载入资料` for template compatibility.
