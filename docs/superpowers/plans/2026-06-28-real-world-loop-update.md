# 现实推演链路与更新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现实推演 Loop Agent 改为“Stage 1 补上下文、Stage 2 行动范围内充分推演、Stage 3A 只产出基础字段、Stage 3B 最多 4 组全量紧凑更新”的链路。

**Architecture:** 在 `publish/real-world-agent-loop.js` 内保留现有阶段编排，但把 Stage 3A 从 skill router 改成 base-field router，并让 Stage 3B 固定执行 4 个组。新增最小测试脚本用 Node + VM 加载浏览器脚本，覆盖纯函数、prompt 约束、Stage 3B 分组与通用更新应用逻辑。

**Tech Stack:** Browser global modules on `window.GameModules`、plain JavaScript、Node built-in `assert`/`vm` for tests、existing `jsonUtils`/`updateRegistry`/`initPromptRegistry` patterns。

## Global Constraints

- 所有现实推演 AI 返回必须紧凑：无 Markdown、无代码块、无解释、无缩进、无换行符、无制表符、无不可见字符。
- Stage 2 正文只能在玩家本次行动范围内充分推演，不替玩家执行下一步新行动。
- Stage 2 continuation 只补完截断句或自然收束，不推进新动作。
- Stage 3A 不再输出或依赖 `groups`，只输出 `elapsedSeconds/status/quest/choices/sceneTitle/locationName`。
- Stage 3B 更新请求总数不超过 4 次：`metrics`、`bodySex`、`survival`、`worldSocialInventory`。
- Stage 3B 每组必须完整检查本组允许的所有更新类型，只有确认本组没有明确变化才返回 `{"genericUpdates":[]}`。
- `bodySex` 负责 `body-status`、`sexual-experience`、`sexual-history`、亲密相关穿着/外观状态。
- `worldSocialInventory` 由原 `worldSocial` 与 `inventory` 合并，不写情绪、感觉、身体状态、性经历、性历史或亲密相关穿着状态。
- 双方参与性经历时，双方各自输出一条 `sexual-experience`。
- `unknown` 可在正文明确建立此前处女事实时先更新为 `处女`；同回合确认首次插入/首次性交/处女膜破裂时再更新为 `非处女`。
- 正文没有确认脱衣时，不把穿着更新成未穿；被推开/掀起/解开/拉下但未脱下时保留衣物仍穿着并记录局部状态。
- 不创建 git commit；用户明确要求前不要提交。

---

## File Structure

- Modify: `publish/real-world-agent-loop.js`
  - Add compact-output helpers.
  - Normalize Stage 1 participants.
  - Tighten Stage 2/continuation prompts.
  - Replace Stage 3A skill selection with base-field generation.
  - Run Stage 3B fixed 4 groups and build per-group compact context packs.
- Modify: `publish/update/sexual-history-update.js`
  - Extend examples and matching for `intimacy.sexualHistory.*` fields.
- Modify: `publish/update/sexual-history-update-prompt.js`
  - Add unknown→处女→非处女, first partner, deflowered partners rules.
- Create: `publish/update/wearing-state-update-prompt.js`
  - Prompt skill for intimate wearing/appearance state updates inside bodySex.
- Create: `publish/update/wearing-state-update.js`
  - Register `wearing-state` update type; apply through generic field writes to `values.wearing`/`profile.wearing`.
- Create: `publish/update/wearing-state-update-ui.js`
  - Render wearing updates clearly in settlement rows.
- Modify: `publish/index.html`
  - Include new wearing-state prompt/register/ui scripts after body/sex prompts and before registry-dependent UI display.
- Create: `tests/real-world-loop-update.test.js`
  - Node-only regression tests for compact output, Stage 3A base fields, 4-group routing, sexual history, wearing state.

---

### Task 1: Add Node Regression Harness

**Files:**
- Create: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes: browser scripts that attach to `window.GameModules`.
- Produces: `node tests/real-world-loop-update.test.js` as the regression command for later tasks.

- [ ] **Step 1: Create the failing test harness**

Create `tests/real-world-loop-update.test.js` with this initial content:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function createContext() {
  const context = {
    console,
    performance: { now: () => 0 },
    setTimeout,
    window: {},
  };
  context.window.window = context.window;
  context.window.console = console;
  context.window.GameModules = {
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
      mergeStreamText(a = '', b = '') { return `${a}${b}`; },
    },
    aiRequest: { outputTailLooksTruncated: () => false, complete: async () => '{}' },
    promptTemplates: { render: async (_id, vars) => JSON.stringify(vars) },
    updateRegistry: null,
    initPromptRegistry: {
      skillText: () => '',
      schema: () => ({ initUpdates: [] }),
      canonicalSkillIds: (ids = []) => ids,
      ensureTemplateState(_template, state) {
        state.values = state.values || {};
        state.values.intimacy = state.values.intimacy || {};
        state.values.bodyStatus = state.values.bodyStatus || {};
      },
    },
  };
  return vm.createContext(context);
}

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

function loadCore(context) {
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/update/generic-update-applier.js');
  loadScript(context, 'publish/update/sexual-experience-update.js');
  loadScript(context, 'publish/update/sexual-history-update.js');
  loadScript(context, 'publish/update/body-status-update.js');
  if (fs.existsSync(path.join(root, 'publish/update/wearing-state-update.js'))) loadScript(context, 'publish/update/wearing-state-update.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
}

function makeStore() {
  const player = {
    id: 'player-self',
    profile: { name: '玩家', wearing: [], wearingItems: [], roleCardUpdatedAt: '' },
    values: {
      intimacy: {
        sexualExperienceCount: 0,
        sexualExperienceParts: {},
        sexualHistory: { virginityStatus: 'unknown' },
      },
      bodyStatus: {},
      wearing: [{ slot: 'bra', name: '胸罩', state: '穿着' }],
    },
  };
  const npc = {
    id: 'rushiqi',
    profile: { name: '刘思琪', wearing: [], wearingItems: [], roleCardUpdatedAt: '' },
    values: {
      intimacy: {
        sexualExperienceCount: 0,
        sexualExperienceParts: {},
        sexualHistory: { virginityStatus: 'unknown' },
      },
      bodyStatus: {},
      wearing: [{ slot: 'bra', name: '胸罩', state: '穿着' }],
    },
  };
  return {
    modelId: 'test-model',
    realWorldSceneTitle: '测试场景',
    realWorldLocationName: '测试地点',
    realWorldChoices: ['观察', '交流', '行动', '等待'],
    rpgStates: { rushiqi: npc },
    playerIdentityState: () => player,
    itemSkillState(id) { return this.rpgStates[id] || null; },
    itemSkillStateLabel(state) { return state?.profile?.name || state?.id || ''; },
    realWorldSettlementTargetGroup(id, name) { return name || id; },
    realWorldPlayerSettlementName: () => '玩家',
    ensureStateMetrics(state) {
      state.metrics = state.metrics || { emotions: {}, temporaryEmotions: {}, playerFeelings: {}, temporaryPlayerFeelings: {} };
      return state.metrics;
    },
    wearingItems(state) { return state?.values?.wearing || []; },
    rpgVitals: () => [],
    __player: player,
    __npc: npc,
  };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Later tasks add tests below this line.

test('harness loads core modules', () => {
  const context = createContext();
  loadCore(context);
  assert.ok(context.window.GameModules.realWorldAgentLoop);
  assert.ok(context.window.GameModules.updateRegistry);
});

(async () => {
  for (const item of tests) {
    await item.fn();
    console.log(`PASS ${item.name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run harness**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected output:

```text
PASS harness loads core modules
```

If it fails because `tests/` does not exist, create the directory and rerun. Do not use git commit.

---

### Task 2: Implement Global Compact AI Output Helpers

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Produces: `realWorldAgentLoop.compactAiReturn(text, { json }) -> string`.
- Produces: `realWorldAgentLoop.compactJsonReturn(text) -> string`.
- Consumes: existing `cleanPhasedNarration`, `parseCompleteUpdateJson`, `parseStep`, `completeConfiguredStep`.

- [ ] **Step 1: Add failing compact-output tests**

Append these tests before the async runner in `tests/real-world-loop-update.test.js`:

```js
test('compactAiReturn removes invisible characters and whitespace control chars', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = '  {\n\t"ok":"a\u200Bb"\n}\uFEFF  ';
  assert.strictEqual(loop.compactAiReturn(raw, { json: true }), '{"ok":"ab"}');
});

test('compactJsonReturn strips markdown fences and compacts JSON', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = '```json\n{\n  "genericUpdates": []\n}\n```';
  assert.strictEqual(loop.compactJsonReturn(raw), '{"genericUpdates":[]}');
});

test('cleanPhasedNarration compacts prose to a single line', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  assert.strictEqual(loop.cleanPhasedNarration('第一句。\n\t第二句。\u200B'), '第一句。第二句。');
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL with a message like:

```text
TypeError: loop.compactAiReturn is not a function
```

- [ ] **Step 3: Add compact helpers in `publish/real-world-agent-loop.js`**

Insert these methods after `continuityFallbackRule()`:

```js
  invisibleCharsPattern() {
    return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu;
  },

  compactAiReturn(text = '', options = {}) {
    const raw = String(text || '')
      .replace(this.invisibleCharsPattern(), '')
      .replace(/```(?:json)?|```/giu, '')
      .trim();
    if (!raw) return '';
    if (options.json) return raw.replace(/\s+/gu, '');
    return raw.replace(/[\r\n\t]+/gu, '').replace(/ {2,}/gu, ' ').trim();
  },

  compactJsonReturn(text = '') {
    return this.compactAiReturn(text, { json: true });
  },
```

- [ ] **Step 4: Wire compact helpers into parser/cleaner methods**

Change `mergeJsonContinuation`, `parseCompleteUpdateJson`, `cleanProseNarration`, `cleanPhasedNarration`, and `parseStep` as follows:

```js
  mergeJsonContinuation(partial = '', continuation = '') {
    const base = this.compactJsonReturn(partial);
    const next = this.compactJsonReturn(continuation);
    if (!next) return base;
    return this.compactJsonReturn(window.GameModules.jsonUtils?.mergeStreamText?.(base, next) || `${base}${next}`);
  },

  parseCompleteUpdateJson(raw) {
    const text = this.compactJsonReturn(raw);
    if (window.GameModules.aiRequest?.outputTailLooksTruncated?.(text)) throw new Error('现实更新 JSON 疑似被截断');
    const extracted = window.GameModules.jsonUtils.extractJson(text);
    const data = JSON.parse(window.GameModules.jsonUtils.repairJson(extracted));
    if (!data || typeof data !== 'object') throw new Error('现实更新 JSON 不是对象');
    return data;
  },

  cleanPhasedNarration(raw) {
    return this.stripNarrationInstructionLeak(this.compactAiReturn(String(raw || '').replace(this.finalSeparator, ''))).trim();
  },

  cleanProseNarration(raw) {
    const text = this.compactAiReturn(raw);
    if (!text) return '';
    const sepAt = text.indexOf(this.finalSeparator);
    const prose = sepAt >= 0 ? text.slice(0, sepAt) : text;
    return this.compactAiReturn(prose);
  },
```

In `parseStep`, replace:

```js
      const text = String(raw || '');
      const sepAt = text.indexOf(this.finalSeparator);
      const jsonRaw = sepAt >= 0 ? text.slice(sepAt + this.finalSeparator.length).trim() : text;
```

with:

```js
      const text = this.compactAiReturn(raw);
      const sepAt = text.indexOf(this.finalSeparator);
      const jsonRaw = this.compactJsonReturn(sepAt >= 0 ? text.slice(sepAt + this.finalSeparator.length) : text);
```

- [ ] **Step 5: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: all tests pass.

---

### Task 3: Tighten Stage 1 and Stage 2 Prompts

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Produces: `realWorldAgentLoop.compactReturnRule(kind) -> string`.
- Produces: Stage 1 parsed `data.participants` array, kept in trace and available for Stage 3 compact context.
- Consumes: existing `buildConfiguredPrompt`, `buildConfiguredNarrationPrompt`, `completeConfiguredNarrationContinuation`, `parseStep`, `traceItem`.

- [ ] **Step 1: Add failing prompt tests**

Append:

```js
test('Stage 1 prompt requires compact participants and needed context only', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = {
    buildLoadedText: () => '',
    baseSnapshot: () => '',
    skillText: async () => '',
    limit: (text) => String(text || ''),
  };
  const prompt = await loop.buildConfiguredPrompt({ store: makeStore(), action: '和刘思琪对话', base: '基础', loaded: [], skills: '', step: 1, config });
  assert.ok(prompt.includes('participants'));
  assert.ok(prompt.includes('needed'));
  assert.ok(prompt.includes('不要写正文'));
  assert.ok(prompt.includes('不要换行符'));
});

test('Stage 2 narration prompt forbids advancing beyond current action', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '' };
  const prompt = await loop.buildConfiguredNarrationPrompt({ store, action: '亲吻对方', base: '基础', loaded: [], skills: '', config });
  assert.ok(prompt.includes('行动范围内充分推演'));
  assert.ok(prompt.includes('不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮'));
  assert.ok(prompt.includes('不要换行符'));
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because prompts do not include the new exact constraints.

- [ ] **Step 3: Add compact return rule helper**

Insert after `compactJsonReturn`:

```js
  compactReturnRule(kind = 'JSON') {
    if (kind === 'prose') return '返回必须紧凑：不要Markdown、不要标题、不要任务说明、不要换行符、不要制表符、不要不可见字符，只输出单行正文文本。';
    return '返回必须紧凑：只输出合法JSON；不要Markdown、不要代码块、不要解释、不要缩进、不要换行符、不要制表符、不要不可见字符；字符串值内部也不得包含换行符、制表符或不可见字符。';
  },
```

- [ ] **Step 4: Update `stepOutputRule` for Stage 1**

Replace the `step === 1` branch with:

```js
    if (step === 1) return `当前是第1步：你是上下文路由器，只判断为了准确生成本次行动范围内正文需要载入哪些已有资料或补全哪些缺失上下文。只允许返回一个合法 JSON 对象，type 必须是 request_context；必须包含 participants、requests、needed、missingContext、reason。participants 需识别玩家、直接互动对象、旁观者、被提及但未参与对象。needed 只列正文生成前必须载入或补全的最小资料。不要写正文，不要结算状态，不要推演后续结果，不要创造未知设定。第一个字符必须是 {。${this.compactReturnRule('JSON')}`;
```

Update the other branches to append compact return rule:

```js
    if (forceFinal) return `当前为收敛步骤：禁止继续请求资料。第一个字符必须是 {，只返回 {"type":"context_done","reason":"资料已足够"}。禁止正文、旁白、Markdown、代码块和 final JSON。${this.compactReturnRule('JSON')}`;
    if (step >= 3) return `当前是软收敛步骤：只允许返回一个合法 JSON 对象，type 只能是 request_context 或 context_done；第一个字符必须是 {。只有缺失资料会直接改变本次行动结果、人物反应、地点/物品/旧事实判定时，才允许 request_context；衣着细节、氛围、情绪微调、背景补全、重复确认、无效 skill 替代查询都必须 context_done。禁止正文、旁白、Markdown、代码块和 final JSON。${this.compactReturnRule('JSON')}`;
    return `当前只负责判断是否继续收集资料：只允许返回一个合法 JSON 对象，type 只能是 request_context 或 context_done；第一个字符必须是 {。仍缺关键资料就返回 request_context；资料足够或无法继续获取时返回 {"type":"context_done","reason":"资料已足够"}。禁止正文、旁白、Markdown、代码块和 final JSON。${this.compactReturnRule('JSON')}`;
```

- [ ] **Step 5: Normalize Stage 1 participants in `parseStep` and trace**

In `parseStep`, after `data.characters = ...`, add:

```js
      data.participants = Array.isArray(data.participants) ? data.participants.slice(0, 12).map((item) => {
        if (typeof item === 'string') return { type: 'character', idOrName: item, name: item, role: 'mentioned' };
        return {
          type: String(item?.type || 'character').slice(0, 20),
          id: item?.id ? String(item.id).slice(0, 80) : undefined,
          idOrName: item?.idOrName ? String(item.idOrName).slice(0, 80) : undefined,
          name: String(item?.name || item?.id || item?.idOrName || '').slice(0, 80),
          role: String(item?.role || 'mentioned').slice(0, 40),
        };
      }).filter((item) => item.name || item.id || item.idOrName) : [];
```

Replace `traceItem` return with:

```js
    return { step, type: data?.type || 'parse_failed', thinking: data?.thinking || '', reason: data?.reason || '', characters: data?.characters || [], participants: data?.participants || [], requests: data?.requests || [], needed: data?.needed || [], raw: ctx.limit(raw, 1200), loaded: [] };
```

- [ ] **Step 6: Update Stage 2 narration prompt**

In `buildConfiguredNarrationPrompt`, replace the real-world final requirement string with:

```js
      '最终正文要求（最高优先级）：严格承接基础上下文、最近世界线与已动态载入资料，不改写已发生事实，不新增无证据的身份、关系、地点或现实背景；资料缺口只能做克制的当场合理推演，并保持不确定性。使用第二人称“你”。行动范围内充分推演：必须写出本次输入行动的动作过程、身体感受、周围环境变化、可见细节、他人反应、对话回应和直接短期连锁影响。禁止越界：不替玩家执行下一步新行动；不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮等未输入的新阶段；不为了字数推进新剧情或新性行为阶段。正文目标900-1200个中文汉字；不要越过本次行动给出长期结局。' + this.compactReturnRule('prose'),
```

For story mode, append ` + this.compactReturnRule('prose')` to the existing final requirement string.

- [ ] **Step 7: Update continuation prompt**

Replace lines inside `completeConfiguredNarrationContinuation` prompt array with:

```js
      '# 现实推演正文补全任务',
      `任务:只输出补全文本本身；从<正文尾部>最后一个字符之后继续；只补完当前截断句并自然收束；禁止重复正文尾部；禁止输出任何任务说明、JSON、Markdown、标题；${this.compactReturnRule('prose')}结尾必须是。！？或右引号。`,
      `本次行动:${actionText}`,
      this.continuityFallbackRule(),
      '边界:只补当前句或收束当前动作，不扩展新动作阶段，不为了字数追加新情节，不替玩家执行下一步。',
      `问题:汉字数=${reason.count || 0};句尾未完成=${reason.tailIncomplete ? '是' : '否'}`,
      `<正文尾部>${String(narration || '').slice(-1600)}</正文尾部>`,
      '现在仅输出正文后续suffix。',
```

- [ ] **Step 8: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: all tests pass.

---

### Task 4: Replace Stage 3A Skill Router With Base-Field Router

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Produces: `buildConfiguredStage3BasePrompt({ store, action, base, loaded, materialSession, narration, trace, config }) -> Promise<string>`.
- Produces: `completeConfiguredStage3Base(store, prompt, logId, config) -> Promise<object>`.
- Produces: `normalizeStage3BaseFields(raw, store, config) -> object`.
- Consumes: `generateConfiguredFinal` calls Stage 3A base fields before Stage 3B.

- [ ] **Step 1: Add failing Stage 3A tests**

Append:

```js
test('Stage 3A base prompt does not ask for groups or skills', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '' };
  const prompt = await loop.buildConfiguredStage3BasePrompt({ store: makeStore(), action: '观察', base: '基础', loaded: [], narration: '正文', trace: [], config });
  assert.ok(prompt.includes('elapsedSeconds'));
  assert.ok(prompt.includes('choices'));
  assert.ok(!prompt.includes('groups'));
  assert.ok(!prompt.includes('Skills 元数据'));
});

test('normalizeStage3BaseFields ignores groups and returns defaults', () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  const loop = context.window.GameModules.realWorldAgentLoop;
  const out = loop.normalizeStage3BaseFields({ groups: { metrics: [] }, elapsedSeconds: 0, choices: ['A'] }, store, loop.realConfig());
  assert.strictEqual(out.elapsedSeconds, 300);
  assert.deepStrictEqual(out.choices, ['A', '交流', '行动', '等待']);
  assert.ok(!Object.prototype.hasOwnProperty.call(out, 'groups'));
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because `buildConfiguredStage3BasePrompt` is missing.

- [ ] **Step 3: Add Stage 3A base methods**

Insert after `buildConfiguredSkillSelectionPrompt` or before `completeSkillSelection`:

```js
  async buildConfiguredStage3BasePrompt({ store, action, base, loaded, materialSession = null, narration, trace = [], config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.mode === 'story' ? (config.materials?.acquiredSummary?.(materialSession) || '') : (config.materials?.summary?.(materialSession) || '');
    const participants = this.stageParticipants(trace);
    const schema = { elapsedSeconds: 180, status: '当前状态', quest: '当前目标', choices: ['行动一', '行动二', '行动三', '行动四'], sceneTitle: '场景标题', locationName: '地点名' };
    return [
      `# ${config.label}阶段3A：基础结算字段`,
      `${this.compactReturnRule('JSON')}只输出 ${JSON.stringify(schema)} 这一类字段；禁止输出 groups、updateSkills、initSkills、genericUpdates、initUpdates、正文或解释。`,
      `本次行动:${this.compactUpdatePromptText(actionText, 500)}`,
      `基础上下文:${this.compactUpdatePromptText(base, 1200)}`,
      `已动态载入资料:${this.compactUpdatePromptText([loadedText, materialText].filter(Boolean).join(' ') || '无', 1200)}`,
      `本回合参与者:${JSON.stringify(participants)}`,
      `阶段2正文:${this.compactUpdatePromptText(narration, 1800, true)}`,
      `返回示例:${JSON.stringify(schema)}`,
    ].filter(Boolean).join('\n');
  },

  stageParticipants(trace = []) {
    const seen = new Set();
    const out = [];
    (Array.isArray(trace) ? trace : []).forEach((item) => {
      (Array.isArray(item?.participants) ? item.participants : []).forEach((p) => {
        const key = `${p.type || ''}:${p.id || p.idOrName || p.name || ''}`;
        if (!key.trim() || seen.has(key)) return;
        seen.add(key);
        out.push(p);
      });
    });
    return out.slice(0, 12);
  },

  normalizeStage3BaseFields(raw = {}, store = null, config = this.realConfig()) {
    const fallbackChoices = config.mode === 'story'
      ? ['观察四周', '尝试行动', '与人交谈', '隐藏异样']
      : (Array.isArray(store?.realWorldChoices) && store.realWorldChoices.length ? store.realWorldChoices.slice(0, 4) : ['观察手机异常', '处理现实事务', '联系熟人', '暂时休息']);
    const choices = Array.isArray(raw?.choices) ? raw.choices.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4) : [];
    while (choices.length < 4 && fallbackChoices[choices.length]) choices.push(fallbackChoices[choices.length]);
    return {
      elapsedSeconds: Number.isFinite(Number(raw?.elapsedSeconds)) && Number(raw.elapsedSeconds) > 0 ? Math.max(1, Math.round(Number(raw.elapsedSeconds))) : 300,
      status: String(raw?.status || store?.realWorldStatus || '现实推演继续中').slice(0, 60),
      quest: String(raw?.quest || store?.realWorldQuest || '确认现实处境').slice(0, 40),
      choices: choices.slice(0, 4),
      sceneTitle: String(raw?.sceneTitle || store?.realWorldSceneTitle || '现实世界').slice(0, 40),
      locationName: String(raw?.locationName || store?.realWorldLocationName || store?.realWorldMap?.current || '').slice(0, 60),
    };
  },

  async completeConfiguredStage3Base(store, prompt, logId, config = this.realConfig()) {
    const raw = await this.completeConfiguredStep(store, prompt, logId, false, { ...config, sourceTitle: `${config.label}阶段3A-基础结算字段` });
    try {
      const data = window.GameModules.jsonUtils.parseLoose(this.compactJsonReturn(raw)) || {};
      return this.normalizeStage3BaseFields(data, store, config);
    } catch (err) {
      console.warn(`${config.label}阶段3A基础字段解析失败:`, err.message);
      return this.normalizeStage3BaseFields({}, store, config);
    }
  },
```

- [ ] **Step 4: Update `generateConfiguredFinal` Stage 3A flow**

Replace the block that builds `skillPrompt`, calls `completeConfiguredSkillSelection`, and sets `jsonPrompt = JSON.stringify(selectedSkills.groups || {})` with:

```js
      skillPrompt = await this.buildConfiguredStage3BasePrompt({ store, action, base, loaded, materialSession, narration, trace, config });
      this.markConfiguredStep(store, logId, `${config.label}正文已完成，正在生成基础结算字段…`, config, { keepNarration: true });
      selectedSkills = await this.completeConfiguredStage3Base(store, skillPrompt, logId, config);

      jsonPrompt = JSON.stringify(selectedSkills);
      this.markConfiguredStep(store, logId, '基础字段已生成，正在执行全量状态更新…', config, { keepNarration: true });
      updates = await this.completeGroupedStage3Updates({ store, action, base, loaded, skills, materialSession, narration, route: selectedSkills, logId, config, trace });
```

Leave old `buildConfiguredSkillSelectionPrompt`, `completeConfiguredSkillSelection`, and `normalizeStage3Groups` in place for compatibility until all tests pass; they can be removed in a later cleanup only if unused.

- [ ] **Step 5: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: all tests pass.

---

### Task 5: Make Stage 3B Run Exactly Four Compact Groups

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Produces: `stage3UpdateGroups()` with keys `metrics/bodySex/survival/worldSocialInventory` only for ordinary Stage 3B.
- Produces: `stage3GroupRoute(route) -> object` selecting all groups.
- Produces: `buildUpdateContextPack({ store, action, base, loaded, materialSession, narration, trace, groupKey, config }) -> string`.
- Consumes: `completeGroupedStage3Updates`, `buildGroupedUpdateJsonPrompt`, `filterGroupedUpdatePatch`, `groupAllowsUpdateField`.

- [ ] **Step 1: Add failing Stage 3B routing tests**

Append:

```js
test('Stage 3B groups are capped at four update requests', () => {
  const context = createContext();
  loadCore(context);
  const groups = context.window.GameModules.realWorldAgentLoop.stage3UpdateGroups();
  assert.deepStrictEqual(Object.keys(groups), ['metrics', 'bodySex', 'survival', 'worldSocialInventory']);
  assert.ok(groups.bodySex.skills.includes('wearing-state'));
});

test('completeGroupedStage3Updates calls all four groups even when route has no groups', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const called = [];
  loop.completeConfiguredUpdateJson = async (_store, _prompt, _logId, cfg) => {
    called.push(cfg.sourceTitle);
    return { genericUpdates: [] };
  };
  await loop.completeGroupedStage3Updates({ store, action: '行动', base: '基础', loaded: [], narration: '正文', route: { elapsedSeconds: 60 }, logId: null, config: loop.realConfig(), trace: [] });
  assert.strictEqual(called.length, 4);
  assert.ok(called.some((x) => x.includes('情绪与感觉')));
  assert.ok(called.some((x) => x.includes('身体、性经历与穿着')));
  assert.ok(called.some((x) => x.includes('生命体征与系统')));
  assert.ok(called.some((x) => x.includes('世界、关系与物品')));
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because current groups include `init/worldSocial/inventory` and skip empty selections.

- [ ] **Step 3: Replace `stage3UpdateGroups`**

Replace the method with:

```js
  stage3UpdateGroups() {
    return {
      metrics: { title: '现实阶段3B-情绪与感觉更新', skills: ['emotion', 'feeling'] },
      bodySex: { title: '现实阶段3B-身体、性经历与穿着更新', skills: ['body-status', 'sexual-experience', 'sexual-history', 'wearing-state'] },
      survival: { title: '现实阶段3B-生命体征与系统更新', skills: ['vital', 'system'] },
      worldSocialInventory: { title: '现实阶段3B-世界、关系与物品更新', skills: ['relationship', 'role-card', 'map', 'faction-overview', 'faction-structure', 'generic', 'item'] },
    };
  },
```

- [ ] **Step 4: Add fixed route helper**

Insert after `stage3UpdateGroups`:

```js
  stage3GroupRoute(route = {}) {
    const groups = {};
    Object.entries(this.stage3UpdateGroups()).forEach(([key, group]) => {
      groups[key] = [...group.skills];
    });
    return { ...route, groups };
  },
```

- [ ] **Step 5: Update `completeGroupedStage3Updates` to always run four groups**

Replace the start of the method with:

```js
    const patches = [];
    const fixedRoute = this.stage3GroupRoute(route);
    const groups = fixedRoute.groups || {};
    for (const [key, group] of Object.entries(this.stage3UpdateGroups())) {
      const selected = Array.isArray(groups[key]) ? groups[key] : [...group.skills];
      try {
        this.markConfiguredStep(store, logId, `${group.title}…`, config, { keepNarration: true });
        const prompt = await this.buildGroupedUpdateJsonPrompt({ store, action, base, loaded, skills, materialSession, narration, groupKey: key, selectedSkills: selected, config, trace });
        const patch = await this.completeConfiguredUpdateJson(store, prompt, logId, { ...config, sourceTitle: group.title });
        patches.push(this.filterGroupedUpdatePatch(patch, group));
      } catch (err) {
        console.warn(`${group.title}失败，已跳过该组:`, err.message);
      }
    }
    return this.mergeGroupedUpdatePatches(patches, fixedRoute);
```

Remove the old `if (!selected.length) continue;` behavior.

- [ ] **Step 6: Add compact update context pack**

Insert before `buildGroupedUpdateJsonPrompt`:

```js
  buildUpdateContextPack({ store, action, base, loaded, materialSession = null, narration, trace = [], groupKey, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const participants = this.stageParticipants(trace);
    const participantText = participants.length ? JSON.stringify(participants) : '[]';
    const common = [
      `本次行动:${this.compactUpdatePromptText(actionText, 500)}`,
      `阶段2正文:${this.compactUpdatePromptText(narration, 2400, true)}`,
      `当前地点:${this.compactUpdatePromptText(store?.realWorldLocationName || store?.realWorldMap?.current || '', 120)}`,
      `本回合参与者:${participantText}`,
    ];
    if (groupKey === 'metrics') return [...common, this.metricsContextText(store, participants)].filter(Boolean).join('\n');
    if (groupKey === 'bodySex') return [...common, this.bodySexContextText(store, participants)].filter(Boolean).join('\n');
    if (groupKey === 'survival') return [...common, this.survivalContextText(store, participants)].filter(Boolean).join('\n');
    return [...common, this.worldSocialInventoryContextText({ store, base, loaded, materialSession, config })].filter(Boolean).join('\n');
  },

  participantStates(store, participants = []) {
    const ids = new Set(['player-self']);
    (Array.isArray(participants) ? participants : []).forEach((p) => {
      const id = p?.id || p?.idOrName || p?.name;
      if (id) ids.add(String(id));
    });
    const states = [];
    ids.forEach((id) => {
      const state = id === 'player-self' ? store?.playerIdentityState?.() : (store?.itemSkillState?.(id) || window.GameModules.updateRegistry?.findStateByNameSuffix?.(store, id));
      if (state && !states.some((item) => item.id === state.id)) states.push(state);
    });
    return states.slice(0, 8);
  },

  metricsContextText(store, participants = []) {
    return this.participantStates(store, participants).map((state) => {
      const metrics = store?.ensureStateMetrics?.(state) || {};
      return `${state.id}:${state.profile?.name || state.name || state.id}:emotions=${JSON.stringify(metrics.emotions || {})};temporaryEmotions=${JSON.stringify(metrics.temporaryEmotions || {})};playerFeelings=${JSON.stringify(metrics.playerFeelings || {})};temporaryPlayerFeelings=${JSON.stringify(metrics.temporaryPlayerFeelings || {})}`;
    }).join('\n');
  },

  bodySexContextText(store, participants = []) {
    return this.participantStates(store, participants).map((state) => {
      const values = state.values || {};
      const wearing = store?.wearingItems?.(state) || values.wearing || [];
      return `${state.id}:${state.profile?.name || state.name || state.id}:bodyStatus=${JSON.stringify(values.bodyStatus || {})};intimacy=${JSON.stringify(values.intimacy || {})};wearing=${JSON.stringify(wearing)}`;
    }).join('\n');
  },

  survivalContextText(store, participants = []) {
    return this.participantStates(store, participants).map((state) => {
      const vitals = store?.rpgVitals?.(state) || [];
      return `${state.id}:${state.profile?.name || state.name || state.id}:vitals=${JSON.stringify(vitals)};system=${JSON.stringify(state.values?.system || {})}`;
    }).join('\n');
  },

  worldSocialInventoryContextText({ store, base, loaded, materialSession = null, config = this.realConfig() }) {
    const loadedText = config.ctx.buildLoadedText(loaded);
    const materialText = config.mode === 'story' ? (config.materials?.acquiredSummary?.(materialSession) || '') : (config.materials?.summary?.(materialSession) || '');
    return `基础上下文摘要:${this.compactUpdatePromptText(base, 1200)}\n已动态载入资料摘要:${this.compactUpdatePromptText([loadedText, materialText].filter(Boolean).join(' ') || '无', 1400)}`;
  },
```

- [ ] **Step 7: Update `buildGroupedUpdateJsonPrompt`**

Replace `loadedText/materialText` usage and the context lines with `contextPack`:

```js
    const contextPack = this.buildUpdateContextPack({ store, action, base, loaded, materialSession, narration, trace: arguments[0]?.trace || [], groupKey, config });
```

Then replace lines that output `本次行动/基础上下文/已动态载入资料/阶段2正文` with:

```js
      `紧凑上下文:${contextPack}`,
```

Replace the first rule string with:

```js
      `你只输出本分组最小补丁 JSON；基础显示字段、时间字段、备选行动字段只由阶段3A负责，本组不得输出；${this.compactReturnRule('JSON')}`,
```

Replace worldSocial-only rule with:

```js
      groupKey === 'worldSocialInventory' ? 'worldSocialInventory 组禁止输出 metrics.*、intimacy.*、bodyStatus.*、values.wearing、wearing、亲密相关穿着状态；只允许关系、角色卡非亲密字段、地图、势力、泛用世界变化、物品。' : '',
```

Add bodySex rule line:

```js
      groupKey === 'bodySex' ? 'bodySex 组必须完整检查 body-status、sexual-experience、sexual-history、亲密相关穿着/外观状态；双方参与同一性经历时双方各自一条 sexual-experience；穿着被推开/掀起/解开/拉下但未脱下时必须保留仍穿着并记录局部状态。' : '',
```

- [ ] **Step 8: Update field filtering**

Replace `groupAllowsUpdateField` with:

```js
  groupAllowsUpdateField(update = {}, group = {}) {
    const title = String(group.title || '');
    const field = String(update.field || '');
    if (title.includes('世界、关系与物品')) {
      if (/^(?:values\.)?(?:emotionalState|feelingState|wearing)$/iu.test(field)) return false;
      if (/^(?:metrics|intimacy|bodyStatus)(?:\.|$)/u.test(field)) return false;
      if (String(update.updateType || '') === 'wearing-state') return false;
    }
    return true;
  },
```

- [ ] **Step 9: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: all tests pass.

---

### Task 6: Add Wearing State Update Skill Under bodySex

**Files:**
- Create: `publish/update/wearing-state-update-prompt.js`
- Create: `publish/update/wearing-state-update.js`
- Create: `publish/update/wearing-state-update-ui.js`
- Modify: `publish/index.html`
- Modify: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Produces update type: `wearing-state`.
- AI JSON shape: `{ updateType:'wearing-state', subject:{type,id,name}, field:'values.wearing', change:{mode:'set'|'merge', value:[...]|{...}}, reasons:[...] }`.
- Consumes: generic applier existing `values.wearing` special case to mirror into `state.profile.wearingItems` and `state.profile.wearing`.

- [ ] **Step 1: Add failing wearing tests**

Append:

```js
test('wearing-state update writes values and mirrors profile wearing', async () => {
  const context = createContext();
  loadCore(context);
  assert.ok(context.window.GameModules.updateRegistry.types.some((type) => type.id === 'wearing-state'));
  const store = makeStore();
  const update = {
    updateType: 'wearing-state',
    subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
    field: 'values.wearing',
    change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开，胸部外露' }] },
    reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认胸罩被推开但未脱下', confidence: 'confirmed' }],
  };
  await context.window.GameModules.updateRegistry.applyGeneric(store, [update]);
  assert.strictEqual(store.__npc.values.wearing[0].state, '仍穿着但被推开，胸部外露');
  assert.strictEqual(store.__npc.profile.wearingItems[0].state, '仍穿着但被推开，胸部外露');
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: FAIL because `wearing-state` script does not exist/register.

- [ ] **Step 3: Create `publish/update/wearing-state-update-prompt.js`**

```js
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.('wearing-state-update', `---
name: wearing-state-update
description: 根据正文确认事实更新亲密相关穿着/外观状态
---

# wearing-state-update

正文确认亲密相关衣物或外观状态变化时，返回 updateType:"wearing-state"。

- 绑定卡片：角色卡；玩家本人绑定玩家卡。
- 本 skill 属于 bodySex 组，因为穿着状态会影响身体接触、外露状态、性经历和性历史判断。
- 更新字段优先使用 values.wearing；如项目已有数组结构，change.value 返回完整数组。
- 更新依据必须同时参考当前已知穿着状态与 Stage 2 正文确认变化。
- 穿着状态必须描述当前实际状态，不是简单二值脱/穿。
- 如果正文只确认衣物被推开、掀起、解开、拉下但未脱下，必须保留“仍穿着”并记录局部状态。
- 如果正文没有确认脱下，禁止更新为未穿。
- 禁止因为亲密行为自动推断脱衣、换衣、衣物破损。
- 示例：{"updateType":"wearing-state","subject":{"type":"character","id":"角色id","name":"姓名"},"field":"values.wearing","change":{"mode":"set","value":[{"slot":"bra","name":"胸罩","state":"仍穿着但被推开，胸部外露"}]},"reasons":[{"trigger":"衣物局部状态变化","evidence":"正文确认胸罩被推开但未脱下","confidence":"confirmed"}]}
`);
```

- [ ] **Step 4: Create `publish/update/wearing-state-update.js`**

```js
window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.register?.({
  id: 'wearing-state', promptId: 'wearing-state-update', section: '角色卡字段',
  match: (change, text) => /wearing-state|values\.wearing|profile\.wearing|穿着|衣物|胸罩|衬衫|裙子|连裤袜/u.test(text),
  card(change, store) {
    const subject = change.subject || {};
    const id = subject.characterId || subject.playerId || subject.id || 'player-self';
    const title = store?.realWorldSettlementTargetGroup?.(id, subject.name || '') || subject.name || id;
    return { id: `role:${id}`, title, section: '角色卡' };
  },
  normalize(raw = {}) {
    const direct = window.GameModules.updateRegistry.genericLike(raw, ['wearingUpdates'])
      .map((item) => ({ ...item, updateType: 'wearing-state', field: item.field || 'values.wearing' }));
    return direct;
  },
  examples: [{
    updateType: 'wearing-state',
    subject: { type: 'character', id: '角色id', name: '姓名' },
    field: 'values.wearing',
    change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开，胸部外露' }] },
    reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认衣物被推开但未脱下', confidence: 'confirmed' }],
  }],
});
```

- [ ] **Step 5: Create `publish/update/wearing-state-update-ui.js`**

```js
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerUi?.('wearing-state', {
  row(update = {}, _store = null, row = {}) {
    return {
      ...row,
      uiTitle: '穿着/外观状态',
      uiName: update.subject?.name || row.cardTitle || row.name || '穿着',
      uiValue: window.GameModules.updateRegistry.displayValue(update.change?.value ?? update.value ?? ''),
    };
  },
});
```

- [ ] **Step 6: Include scripts in `publish/index.html`**

Add after `body-status-update-prompt.js`:

```html
  <script src="update/wearing-state-update-prompt.js"></script>
```

Add after `body-status-update.js`:

```html
  <script src="update/wearing-state-update.js"></script>
```

Add after `body-status-update-ui.js`:

```html
  <script src="update/wearing-state-update-ui.js"></script>
```

- [ ] **Step 7: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: all tests pass.

---

### Task 7: Expand Sexual History Rules and Generic Apply Coverage

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `publish/update/sexual-history-update.js`
- Modify: `publish/update/sexual-history-update-prompt.js`

**Interfaces:**
- Produces supported fields under `intimacy.sexualHistory.*`:
  - `virginityStatus`
  - `firstVaginalPartner`
  - `firstVaginalAt`
  - `firstVaginalEvidence`
  - `defloweredPartners`
- Consumes: existing generic applier `nextValue` merge/append behavior.

- [ ] **Step 1: Add failing sexual-history tests**

Append:

```js
test('sexual-history supports unknown to virgin to non-virgin facts', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  const updates = [
    {
      updateType: 'sexual-history',
      subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
      field: 'intimacy.sexualHistory',
      change: { mode: 'merge', value: { virginityStatus: '处女', virginityEvidence: '正文确认此前无既往阴道性交历史' } },
      reasons: [{ trigger: '此前处女事实确认', evidence: '正文明确建立此前处女事实', confidence: 'confirmed' }],
    },
    {
      updateType: 'sexual-history',
      subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
      field: 'intimacy.sexualHistory',
      change: { mode: 'merge', value: { virginityStatus: '非处女', firstVaginalPartner: { type: 'player', id: 'player-self', name: '玩家' }, firstVaginalAt: '当前回合', firstVaginalEvidence: '正文确认首次事实' } },
      reasons: [{ trigger: '首次事实确认', evidence: '正文确认首次阴道插入或处女膜破裂', confidence: 'confirmed' }],
    },
  ];
  await context.window.GameModules.updateRegistry.applyGeneric(store, updates);
  assert.strictEqual(store.__npc.values.intimacy.sexualHistory.virginityStatus, '非处女');
  assert.strictEqual(store.__npc.values.intimacy.sexualHistory.firstVaginalPartner.id, 'player-self');
});

test('sexual-history records defloweredPartners on the other subject', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  await context.window.GameModules.updateRegistry.applyGeneric(store, [{
    updateType: 'sexual-history',
    subject: { type: 'player', id: 'player-self', name: '玩家' },
    field: 'intimacy.sexualHistory.defloweredPartners',
    change: { mode: 'append', value: { type: 'character', id: 'rushiqi', name: '刘思琪', at: '当前回合' } },
    reasons: [{ trigger: '成为对方首次对象', evidence: '正文确认', confidence: 'confirmed' }],
  }]);
  assert.strictEqual(store.__player.values.intimacy.sexualHistory.defloweredPartners[0].id, 'rushiqi');
});
```

- [ ] **Step 2: Run tests and verify failure if unsupported**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: may fail because current `sexual-history` prompt/examples do not advertise these fields, or because `nextValue` append de-dupe mishandles object values.

- [ ] **Step 3: Update `sexual-history-update.js` examples and match**

Replace the `match` line with:

```js
  match: (change, text) => /sexual-history|sexualHistory|sexualStatus|sexualPartnerCount|sexualPartners|virginityStatus|firstVaginalPartner|defloweredPartners|性经历|经历人数|经历人列表|处女|非处女|破处|初体验/u.test(text),
```

Replace `examples` with:

```js
  examples: [
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { virginityStatus: '处女', virginityEvidence: '正文明确建立此前处女事实' } }, reasons: [{ trigger: '此前处女事实确认', evidence: '正文明确建立此前处女事实', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory', change: { mode: 'merge', value: { virginityStatus: '非处女', firstVaginalPartner: { type: 'character', id: '角色id', name: '姓名' }, firstVaginalAt: '当前回合', firstVaginalEvidence: '正文明确确认首次事实' } }, reasons: [{ trigger: '首次阴道插入或处女膜破裂事实确认', evidence: '正文明确确认', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualHistory.defloweredPartners', change: { mode: 'append', value: { type: 'character', id: '角色id', name: '姓名', at: '当前回合' } }, reasons: [{ trigger: '成为对方初体验对象', evidence: '正文明确确认', confidence: 'confirmed' }] },
    { updateType: 'sexual-history', subject: { type: 'player', id: 'player-self' }, field: 'intimacy.sexualPartnerCount', change: { mode: 'set', value: 1 }, reasons: [{ trigger: '成人身份且稳定事实确认阴部插入经历', evidence: '与已确认经历人列表保持一致', confidence: 'confirmed' }] },
  ],
```

- [ ] **Step 4: Update `sexual-history-update-prompt.js`**

Replace the prompt body string with a version containing these exact rule lines:

```js
window.GameModules = window.GameModules || {};
window.GameModules.updateRegistry?.registerPrompt?.("sexual-history-update", "---\nname: sexual-history-update\ndescription: 根据成人虚构身份的稳定事实，更新性历史、处女状态、初体验对象与经历对象\n---\n\n# sexual-history-update\n\n确认玩家或角色的性历史稳定事实变化时，返回 updateType:\"sexual-history\"。\n\n- 绑定卡片：角色卡；玩家本人绑定玩家卡。\n- 只处理成人虚构身份的抽象元数据，不输出过程、姿势、器官互动或感官细节。\n- 当前历史对象字段：intimacy.sexualHistory。\n- 处女状态字段：intimacy.sexualHistory.virginityStatus，可为 unknown/处女/非处女。\n- 当前状态是 unknown 且 Stage 2 正文在行动范围内明确建立此前处女事实时，先返回 merge 更新，将 virginityStatus 设为 处女，并写 virginityEvidence。\n- 同一回合随后确认首次阴道插入、首次性交、由本次插入造成处女膜破裂或等价首次事实时，再返回 merge 更新，将 virginityStatus 设为 非处女，并写 firstVaginalPartner、firstVaginalAt、firstVaginalEvidence。\n- 如果当前状态是 unknown，正文只确认插入但没有处女事实、首次事实或处女膜破裂证据，不能直接更新为处女或非处女。\n- firstVaginalPartner 记录首次阴道性交对象；defloweredPartners 记录主体曾作为破处人的对象列表。\n- 被破处方写 intimacy.sexualHistory merge；破处人写 intimacy.sexualHistory.defloweredPartners append。\n- 仅亲吻、抚摸、摩擦、手指、口交、隔衣接触不改变 virginityStatus。\n- 经历人数字段 intimacy.sexualPartnerCount 与经历人列表 intimacy.sexualPartners 可继续使用，但只在稳定事实确认阴部插入时更新。\n- reasons.trigger 写稳定事实来源；reasons.evidence 写阶段正文或已载入资料中的依据，禁止露骨描述。\n\n示例：{\"updateType\":\"sexual-history\",\"subject\":{\"type\":\"character\",\"id\":\"角色id\",\"name\":\"姓名\"},\"field\":\"intimacy.sexualHistory\",\"change\":{\"mode\":\"merge\",\"value\":{\"virginityStatus\":\"非处女\",\"firstVaginalPartner\":{\"type\":\"player\",\"id\":\"player-self\",\"name\":\"玩家\"},\"firstVaginalAt\":\"当前回合\",\"firstVaginalEvidence\":\"正文明确确认首次事实\"}},\"reasons\":[{\"trigger\":\"首次事实确认\",\"evidence\":\"正文明确确认\",\"confidence\":\"confirmed\"}]}\n");
```

- [ ] **Step 5: If append object de-dupe fails, update `nextValue` append mode**

If the `defloweredPartners` test fails because object append does not preserve object values, replace append handling in `nextValue` with:

```js
    if (mode === 'append') {
      const currentList = Array.isArray(current) ? current : [];
      const incoming = Array.isArray(raw) ? raw : [raw];
      const seen = new Set(currentList.map((item) => JSON.stringify(item)));
      const next = [...currentList];
      incoming.filter((item) => item !== undefined && item !== null && item !== '').forEach((item) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return;
        seen.add(key);
        next.push(item);
      });
      return next;
    }
```

- [ ] **Step 6: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: all tests pass.

---

### Task 8: Enforce bodySex Sexual Experience Pair Rules in Prompt and Tests

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `publish/update/sexual-experience-update-prompt.js`
- Modify: `publish/real-world-agent-loop.js`

**Interfaces:**
- Consumes: `bodySex` group prompt.
- Produces prompt rules requiring per-subject updates for all confirmed participants.

- [ ] **Step 1: Add failing bodySex prompt test**

Append:

```js
test('bodySex prompt requires both participants to record sexual-experience', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const prompt = await loop.buildGroupedUpdateJsonPrompt({
    store,
    action: '亲密互动',
    base: '基础',
    loaded: [],
    narration: '玩家与刘思琪发生正文确认的亲密事件。',
    groupKey: 'bodySex',
    selectedSkills: ['body-status', 'sexual-experience', 'sexual-history', 'wearing-state'],
    config: loop.realConfig(),
    trace: [{ participants: [{ type: 'player', id: 'player-self', name: '玩家', role: 'actor' }, { type: 'character', id: 'rushiqi', name: '刘思琪', role: 'direct-target' }] }],
  });
  assert.ok(prompt.includes('双方各自一条 sexual-experience'));
  assert.ok(prompt.includes('本回合参与者'));
  assert.ok(prompt.includes('亲密相关穿着'));
});
```

- [ ] **Step 2: Run tests and verify failure if missing**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: may fail until Task 5 bodySex rule is present.

- [ ] **Step 3: Update `sexual-experience-update-prompt.js`**

Add these exact bullet lines to the prompt body:

```text
- subject 永远表示这条性经历记录写入谁的角色卡。
- 同一亲密/性事件若玩家与角色双方都参与，则必须输出两条 sexual-experience：玩家一条，对方角色一条。
- 多人参与时，每个 Stage 1 参与者清单和 Stage 2 正文明确确认参与的人各自一条。
- 禁止根据 skill 名称凭空猜对象；参与者只能来自本回合参与者清单和正文明确事实。
- 如果只是接触、摩擦、亲吻，不得升级为插入、高潮或性交记录。
```

Keep existing abstract-counting and non-process rules unchanged.

- [ ] **Step 4: Ensure bodySex group prompt includes participants and rule**

If not already present after Task 5, add this line to `buildGroupedUpdateJsonPrompt` bodySex branch:

```js
      groupKey === 'bodySex' ? 'bodySex 组必须完整检查 body-status、sexual-experience、sexual-history、亲密相关穿着/外观状态；同一亲密/性事件若玩家与角色双方都参与，必须双方各自一条 sexual-experience；只根据本回合参与者清单和阶段2正文确认事实判断主体；禁止把接触、摩擦、亲吻升级为插入、高潮或性交记录。' : '',
```

- [ ] **Step 5: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: all tests pass.

---

### Task 9: End-to-End Stage Flow Regression

**Files:**
- Modify: `tests/real-world-loop-update.test.js`
- Modify: `publish/real-world-agent-loop.js` if any integration issue is found.

**Interfaces:**
- Consumes all previous tasks.
- Produces regression coverage for:
  - Stage 3A no groups.
  - Stage 3B four calls.
  - Merged output includes base fields and generic updates.

- [ ] **Step 1: Add E2E-style unit test**

Append:

```js
test('generateConfiguredFinal uses base fields and four grouped patches', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = {
    buildLoadedText: () => '',
    limit: (text) => String(text || ''),
  };
  const calls = [];
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    if (streamToUi) return '你完成了本次行动范围内的直接动作，对方作出即时反应。';
    if (cfg?.sourceTitle?.includes('阶段3A')) return '{"elapsedSeconds":180,"status":"测试状态","quest":"测试目标","choices":["一","二","三","四"],"sceneTitle":"测试标题","locationName":"测试地点"}';
    return '{"genericUpdates":[]}';
  };
  loop.completeConfiguredUpdateJson = async (_store, _prompt, _logId, cfg) => {
    calls.push(cfg.sourceTitle);
    if (cfg.sourceTitle.includes('身体、性经历与穿着')) return { genericUpdates: [{ updateType: 'wearing-state', subject: { type: 'character', id: 'rushiqi', name: '刘思琪' }, field: 'values.wearing', change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开' }] }, reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认', confidence: 'confirmed' }] }] };
    return { genericUpdates: [] };
  };
  const out = await loop.generateConfiguredFinal({ store, action: '行动', base: '基础', loaded: [], skills: '', trace: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'direct-target' }] }], materialSession: null, logId: null, config });
  assert.strictEqual(out.result.elapsedSeconds, 180);
  assert.strictEqual(out.result.status, '测试状态');
  assert.strictEqual(out.result.genericUpdates.length, 1);
  assert.strictEqual(calls.length, 4);
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: all tests pass. If it fails because `completeConfiguredStep` override bypasses `completeConfiguredStage3Base`, adjust only the test stubs, not production behavior.

- [ ] **Step 3: Browser smoke check by static script order**

Run:

```bash
node -e "const fs=require('fs');const html=fs.readFileSync('publish/index.html','utf8');for(const s of ['update/wearing-state-update-prompt.js','update/wearing-state-update.js','update/wearing-state-update-ui.js']){if(!html.includes(s)){throw new Error('missing '+s)}}console.log('PASS script order smoke')"
```

Expected:

```text
PASS script order smoke
```

---

### Task 10: Final Verification and Cleanup

**Files:**
- Modify: only files touched by previous tasks if verification exposes issues.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified implementation ready for user review.

- [ ] **Step 1: Run full regression test**

Run:

```bash
node "tests/real-world-loop-update.test.js"
```

Expected: every test prints `PASS ...` and process exits `0`.

- [ ] **Step 2: Check no accidental Stage 3A groups remain in active flow**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('publish/real-world-agent-loop.js','utf8');if(/正在判断需要结算的 Skills/.test(s)) throw new Error('old Stage3A status remains'); if(/JSON\.stringify\(selectedSkills\.groups/.test(s)) throw new Error('old groups flow remains'); console.log('PASS no old Stage3A groups flow')"
```

Expected:

```text
PASS no old Stage3A groups flow
```

- [ ] **Step 3: Check no AI prompt asks for non-compact output**

Run:

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('publish/real-world-agent-loop.js','utf8');for(const phrase of ['不要换行符','不要制表符','不可见字符']){if(!s.includes(phrase)) throw new Error('missing compact phrase '+phrase)}console.log('PASS compact prompt phrases')"
```

Expected:

```text
PASS compact prompt phrases
```

- [ ] **Step 4: Inspect git diff without committing**

Run:

```bash
git status --short && git diff -- "publish/real-world-agent-loop.js" "publish/update/sexual-history-update.js" "publish/update/sexual-history-update-prompt.js" "publish/update/wearing-state-update-prompt.js" "publish/update/wearing-state-update.js" "publish/update/wearing-state-update-ui.js" "publish/index.html" "tests/real-world-loop-update.test.js"
```

Expected: shows only intended file changes. Do not run `git commit`.

---

## Self-Review

**Spec coverage:**
- Stage 1 context routing and participants: Task 3.
- Stage 2 action-boundary narration and continuation: Task 3.
- Global compact AI return and parser cleaning: Task 2.
- Stage 3A no groups / base fields only: Task 4.
- Stage 3B max 4 groups and all groups always run: Task 5.
- Compact update context packs: Task 5.
- Wearing/appearance state in bodySex: Task 6.
- Sexual experience both-subject rule: Task 8.
- Sexual history unknown/virgin/non-virgin and first partner: Task 7.
- End-to-end and verification: Tasks 9-10.

**Placeholder scan:** No TBD/TODO placeholders are present. All new files include concrete code blocks. Commit steps are intentionally omitted because the approved spec says not to commit and user has not requested commits.

**Type consistency:** Group key is consistently `worldSocialInventory`; bodySex skills include `wearing-state`; Stage 3A normalized object has no `groups`; tests use the same method names defined in tasks.
