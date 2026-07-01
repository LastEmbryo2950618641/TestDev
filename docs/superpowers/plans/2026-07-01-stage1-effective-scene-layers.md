# Stage1 Effective Scene Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a final effective Stage1 scene-layer resolver so Stage2/Stage3/Stage4 use the converged participant boundary instead of the historical trace union, while always forcing the player/current controlled subject into forced participants.

**Architecture:** Keep Stage1 `trace` as audit history, add resolver helpers in `publish/real-world-agent-loop.js`, and pass a resolved `effectiveSceneLayers` object into Stage2 context and settlement participant selection. Prompt templates get small additions so Stage1 sees the prior planning summary and Stage2 understands that upstream candidates mean final effective candidates.

**Tech Stack:** Browser-style JavaScript modules on `window.GameModules`, Node.js built-in `node:test` + `assert`, prompt markdown files under `publish/prompts/推演引擎`, runtime prompt bundle `publish/inference-prompts-runtime.js`.

## Global Constraints

- Stage1 trace remains historical debug/audit data and must not directly define Stage2 participant boundary.
- Stage2/Stage3/Stage4 consume the resolved final effective scene layers.
- Player/current controlled subject is always a forced participant.
- `forcedParticipants` is an array and may contain multiple people.
- Random active events are background/offstage by default and are removed when the same person appears in forced/priority/drama/forbidden.
- Loaded role cards remain reference material only and do not automatically make a character present or settleable.
- No new runtime dependencies.
- Preserve existing Chinese K:V prompt format.
- Do not perform git commits unless the user explicitly asks during execution.

---

## File Structure

- Modify: `publish/real-world-agent-loop.js`
  - Add `previousGuidanceSummary(guidance)` for Stage1 prior-plan prompt injection.
  - Add `resolveEffectiveSceneLayers(trace, store, config)` and small helper methods for name normalization, candidate de-duplication, layer conflict cleanup, player/current-control forced insertion, and random-event filtering.
  - Change `buildConfiguredPrompt()` to pass `上一轮查询规划摘要` into Stage1 template.
  - Change `buildConfiguredSceneAnchorPrompt()` to resolve and pass `effectiveSceneLayers` to context.
  - Change `sceneLayerSummary()` and `stageParticipants()` to accept/use effective layers.
  - Change `generateConfiguredFinal()` to resolve once and use the same object for Stage2 and settlement.

- Modify: `publish/real-world-agent-context.js`
  - Change `sceneParticipantBoundary()` to accept either trace arrays or an effective layers object.
  - Change `buildSceneAnchorContext()` to prefer `effectiveSceneLayers` when provided.

- Modify: `publish/story-agent-context.js`
  - Update its `sceneParticipantBoundary(trace = [])` wrapper to accept `effectiveSceneLayers` and forward it to `realWorldAgentContext.sceneParticipantBoundary(trace, effectiveSceneLayers)`.
  - Update its `buildSceneAnchorContext()` signature to accept `effectiveSceneLayers` and pass it into the boundary call.

- Modify: `publish/prompts/推演引擎/stage1-guided-query.md`
  - Add `上一轮查询规划摘要` block and rules for continuing from prior decisions.
  - State player/current controlled subject is system-forced and forced participants may be multiple.

- Modify: `publish/prompts/推演引擎/stage2-scene-anchor.md`
  - Clarify that upstream candidates are the final effective candidate layers, not the full trace history.

- Modify: `publish/prompts/推演引擎/stage1-guided-query.js`
  - Update the JS template text to match `stage1-guided-query.md` exactly for the new previous-summary block and forced-participant rules.

- Modify: `publish/prompts/推演引擎/stage2-scene-anchor.js`
  - Update the JS template text to match `stage2-scene-anchor.md` exactly for the final-effective-candidate rule.

- Modify: `publish/inference-prompts-runtime.js`
  - Keep inline runtime template bundle in sync if this repo stores generated prompt templates there.

- Modify: `tests/real-world-loop-update.test.js`
  - Add resolver, prompt, Stage2 context, random cleanup, and settlement participant tests.

---

### Task 1: Add failing tests for effective scene layer resolution

**Files:**
- Modify: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes existing: `loadCore(context)`, `makeStore()`, `loop.currentPlayerParticipant(store)`.
- Produces test expectations for future method:
  - `loop.resolveEffectiveSceneLayers(trace: Array<object>, store?: object, config?: object): object`
  - Return shape:
    ```js
    {
      forcedParticipants: Array<object>,
      priorityCandidates: Array<object>,
      dramaCandidates: Array<object>,
      forbiddenParticipants: Array<object>,
      randomActiveEvents: Array<object>,
      randomIntrusionCondition: string,
      sceneQueries: { location: string[], causality: string[], conflict: string[] }
    }
    ```

- [ ] **Step 1: Add resolver tests**

Append these tests near the existing Stage1/Stage2 tests in `tests/real-world-loop-update.test.js`, after the `scene anchor report prompt uses slim anchor context and current-scene impact field` test:

```js
test('resolveEffectiveSceneLayers uses latest explicit layers and always forces player', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } };
  const trace = [
    {
      forcedParticipants: [],
      priorityCandidates: [{ name: '刘思瑶', reason: '第一轮探索候选' }],
      dramaCandidates: [{ name: '刘思怡', reason: '第一轮戏剧候选' }],
      forbiddenParticipants: [],
      randomActiveEvents: [{ characterName: '刘思琪', eventType: 'background_only', motivation: '第一轮随机' }],
      randomIntrusionCondition: '无明确条件则禁止闯入',
      sceneQueries: { location: ['房间门口'], causality: [], conflict: [] },
    },
    {
      forcedParticipants: [{ name: '刘思琪', reason: '本次行动明确目标' }],
      priorityCandidates: [],
      dramaCandidates: [],
      forbiddenParticipants: [],
      randomActiveEvents: [{ characterName: '刘思瑶', eventType: 'background_only', motivation: '第二轮随机' }],
      randomIntrusionCondition: '无明确条件则禁止闯入',
      sceneQueries: { location: ['房间内部'], causality: [], conflict: [] },
    },
    {
      forcedParticipants: [],
      priorityCandidates: [],
      dramaCandidates: [],
      forbiddenParticipants: [],
      randomActiveEvents: [{ characterName: '刘思怡', eventType: 'background_only', motivation: '第三轮随机' }],
      randomIntrusionCondition: '无明确条件则禁止闯入',
      sceneQueries: { location: [], causality: [], conflict: [] },
    },
  ];

  const layers = loop.resolveEffectiveSceneLayers(trace, store, loop.realConfig());

  assert.strictEqual(JSON.stringify(layers.forcedParticipants.map((item) => item.name)), JSON.stringify(['刘悠']));
  assert.strictEqual(JSON.stringify(layers.priorityCandidates.map((item) => item.name)), JSON.stringify([]));
  assert.strictEqual(JSON.stringify(layers.dramaCandidates.map((item) => item.name)), JSON.stringify([]));
  assert.strictEqual(JSON.stringify(layers.randomActiveEvents.map((item) => item.characterName)), JSON.stringify(['刘思怡']));
  assert.strictEqual(layers.randomIntrusionCondition, '无明确条件则禁止闯入');
});

test('resolveEffectiveSceneLayers supports multiple forced participants and removes conflicting random events', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } };
  const trace = [{
    forcedParticipants: [{ name: '刘思琪', reason: '本次行动明确目标' }],
    priorityCandidates: [{ name: '刘思瑶', reason: '同住相邻' }],
    dramaCandidates: [{ name: '刘思瑶', reason: '重复层级，应被高优先覆盖' }, { name: '刘思怡', reason: '可能听见' }],
    forbiddenParticipants: [{ name: '王主管', reason: '只能场外微信' }, { name: '刘悠', reason: '模型误判玩家不在场' }],
    randomActiveEvents: [
      { characterName: '刘思琪', eventType: 'background_only', motivation: '与强制冲突' },
      { characterName: '王主管', eventType: 'wechat', motivation: '与禁止冲突' },
      { characterName: '路人甲', eventType: 'background_only', motivation: '可保留场外' },
    ],
    randomIntrusionCondition: '无明确条件则禁止闯入',
  }];

  const layers = loop.resolveEffectiveSceneLayers(trace, store, loop.realConfig());

  assert.strictEqual(JSON.stringify(layers.forcedParticipants.map((item) => item.name)), JSON.stringify(['刘思琪', '刘悠']));
  assert.strictEqual(JSON.stringify(layers.priorityCandidates.map((item) => item.name)), JSON.stringify(['刘思瑶']));
  assert.strictEqual(JSON.stringify(layers.dramaCandidates.map((item) => item.name)), JSON.stringify(['刘思怡']));
  assert.strictEqual(JSON.stringify(layers.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.strictEqual(JSON.stringify(layers.randomActiveEvents.map((item) => item.characterName)), JSON.stringify(['路人甲']));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: FAIL with an error similar to:

```text
TypeError: loop.resolveEffectiveSceneLayers is not a function
```

- [ ] **Step 3: Stop Task 1 after confirming the expected failure**

Leave the failing tests in place. Task 2 starts from this red test state and adds the resolver implementation.

---

### Task 2: Implement effective scene layer resolver

**Files:**
- Modify: `publish/real-world-agent-loop.js:241-264`
- Modify: `publish/real-world-agent-loop.js:351-390`

**Interfaces:**
- Produces:
  - `participantDisplayName(item: object|string): string`
  - `dedupeParticipants(items: Array<object>, options?: { blockedNames?: Set<string> }): Array<object>`
  - `currentForcedParticipants(store?: object, config?: object): Array<object>`
  - `resolveEffectiveSceneLayers(trace: Array<object>|object, store?: object, config?: object): object`
- Later tasks consume `resolveEffectiveSceneLayers()` in Stage2 and settlement flow.

- [ ] **Step 1: Add helper and resolver implementation**

In `publish/real-world-agent-loop.js`, insert the following methods after `compactReturnRule()` and before `sceneLayerSummary(trace = [])`:

```js
  participantDisplayName(item = {}) {
    if (typeof item === 'string') return item.trim();
    return String(item?.name || item?.characterName || item?.idOrName || item?.id || '').trim();
  },

  participantKey(item = {}) {
    if (typeof item === 'string') return item.trim();
    return String(item?.id || item?.idOrName || item?.name || item?.characterName || '').trim();
  },

  dedupeParticipants(items = [], options = {}) {
    const seen = new Set();
    const blockedNames = options.blockedNames || new Set();
    return (Array.isArray(items) ? items : []).filter((item) => {
      const name = this.participantDisplayName(item);
      const key = this.participantKey(item) || name;
      if (!name || blockedNames.has(name) || blockedNames.has(key) || seen.has(key) || seen.has(name)) return false;
      seen.add(key);
      seen.add(name);
      return true;
    });
  },

  currentForcedParticipants(store = null, config = this.realConfig()) {
    const forced = [this.currentPlayerParticipant(store)];
    const shared = store?.sharedControlState?.();
    const sharedName = String(shared?.profile?.name || shared?.name || '').trim();
    const sharedId = String(shared?.id || shared?.characterId || sharedName || '').trim();
    if (sharedName || sharedId) {
      forced.push({
        type: 'character',
        id: sharedId || sharedName,
        name: sharedName || sharedId,
        role: config?.mode === 'story' ? 'controlled-subject' : 'shared-control-subject',
        canSettle: true,
        reason: '玩家当前控制主体',
      });
    }
    return this.dedupeParticipants(forced);
  },

  latestLayer(items = [], key) {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (Array.isArray(items[i]?.[key])) return items[i][key];
    }
    return [];
  },

  resolveEffectiveSceneLayers(trace = [], store = null, config = this.realConfig()) {
    const items = Array.isArray(trace) ? trace : (trace ? [trace] : []);
    const forcedBase = this.latestLayer(items, 'forcedParticipants').map((item) => ({ ...item, role: item.role || 'forced', canSettle: item.canSettle === false ? false : true }));
    const systemForced = this.currentForcedParticipants(store, config).map((item) => ({ ...item, role: item.role || 'actor', canSettle: true, reason: item.reason || '系统固定强制出场' }));
    const forcedParticipants = this.dedupeParticipants([...forcedBase, ...systemForced]);
    const forcedNames = new Set(forcedParticipants.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const forbiddenRaw = this.latestLayer(items, 'forbiddenParticipants').map((item) => ({ ...item, role: item.role || 'forbidden', canLoadRoleCard: false, canEnterNarration: false, canSettle: false }));
    const forbiddenParticipants = this.dedupeParticipants(forbiddenRaw, { blockedNames: forcedNames });
    const forbiddenNames = new Set(forbiddenParticipants.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const priorityBlocked = new Set([...forcedNames, ...forbiddenNames]);
    const priorityCandidates = this.dedupeParticipants(this.latestLayer(items, 'priorityCandidates').map((item) => ({ ...item, role: item.role || 'priority-candidate', canSettle: false })), { blockedNames: priorityBlocked });
    const priorityNames = new Set(priorityCandidates.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const dramaBlocked = new Set([...priorityBlocked, ...priorityNames]);
    const dramaCandidates = this.dedupeParticipants(this.latestLayer(items, 'dramaCandidates').map((item) => ({ ...item, role: item.role || 'drama-candidate', canSettle: false })), { blockedNames: dramaBlocked });
    const dramaNames = new Set(dramaCandidates.flatMap((item) => [this.participantDisplayName(item), this.participantKey(item)]).filter(Boolean));

    const randomBlocked = new Set([...dramaBlocked, ...dramaNames]);
    const randomActiveEvents = this.dedupeParticipants(this.latestLayer(items, 'randomActiveEvents'), { blockedNames: randomBlocked });
    const latestCondition = [...items].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '无明确条件则禁止闯入';
    const query = (key) => [...new Set(items.flatMap((item) => Array.isArray(item?.sceneQueries?.[key]) ? item.sceneQueries[key] : []))];

    return {
      forcedParticipants,
      priorityCandidates,
      dramaCandidates,
      forbiddenParticipants,
      randomActiveEvents,
      randomIntrusionCondition: latestCondition,
      sceneQueries: { location: query('location'), causality: query('causality'), conflict: query('conflict') },
    };
  },
```

- [ ] **Step 2: Update sceneLayerSummary to use resolver output**

Replace the entire existing `sceneLayerSummary(trace = []) { ... }` method with:

```js
  sceneLayerSummary(trace = [], store = null, config = this.realConfig()) {
    const layers = Array.isArray(trace) ? this.resolveEffectiveSceneLayers(trace, store, config) : this.resolveEffectiveSceneLayers([trace], store, config);
    const names = (group = [], reasonLabel = '理由') => group.map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${reasonLabel}：${item.reason}）` : `（${reasonLabel}：需在场景锚定中明确）`}`;
    }).join('、') || '无';
    const random = (layers.randomActiveEvents || []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`).join('；') || '无';
    const query = (key) => [...new Set(Array.isArray(layers.sceneQueries?.[key]) ? layers.sceneQueries[key] : [])].join('；') || '无';
    return [`强制出场：${names(layers.forcedParticipants, '出场理由')}`, `高优先候选：${names(layers.priorityCandidates, '出场或不出场理由')}`, `戏剧候选：${names(layers.dramaCandidates, '出场或不出场理由')}`, `禁止出场：${names(layers.forbiddenParticipants, '不出场理由')}`, `地点查询：${query('location')}`, `因果查询：${query('causality')}`, `冲突查询：${query('conflict')}`, `随机主动事件：${random}`, `随机事件闯入条件：${layers.randomIntrusionCondition || '无明确条件则禁止闯入'}`].join('\n');
  },
```

- [ ] **Step 3: Run resolver tests**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: Resolver tests PASS. Some later prompt tests may still fail until Task 3 and Task 4.

- [ ] **Step 4: Fix only syntax errors if present**

If Node reports a syntax error, fix the exact punctuation/commas in `publish/real-world-agent-loop.js` and rerun:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: No syntax errors.

---

### Task 3: Inject previous Stage1 planning summary into Stage1 prompt

**Files:**
- Modify: `publish/real-world-agent-loop.js:133-165`
- Modify: `publish/prompts/推演引擎/stage1-guided-query.md:19-26`
- Modify: `publish/prompts/推演引擎/stage1-guided-query.js`
- Modify: `publish/inference-prompts-runtime.js`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes existing `guidance` object from `runConfigured()` / `lastGuidance`.
- Produces:
  - `previousGuidanceSummary(guidance?: object): string`
  - Template variable `上一轮查询规划摘要`.

- [ ] **Step 1: Add failing prompt test**

Append this test after the existing `buildConfiguredPrompt passes prior guidance to random active candidate filtering` test:

```js
test('buildConfiguredPrompt includes previous Stage1 planning summary for later rounds', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = {
    buildLoadedText: () => '',
    limit: (text) => String(text || ''),
    randomActiveEventCandidates: () => [],
    buildStage1RoutingContext: () => '模式：现实\n本次行动：观察门口',
    loadedRoutingSummary: () => '无',
    stage1MaterialCatalogText: () => '无',
  };

  const prompt = await loop.buildConfiguredPrompt({
    store: makeStore(),
    action: '前往刘思琪房间',
    base: '基础',
    loaded: [],
    skills: '',
    step: 2,
    config,
    guidance: {
      forcedParticipants: [{ name: '刘思琪', reason: '本次行动目标' }],
      priorityCandidates: [{ name: '刘思瑶', reason: '同住相邻' }],
      dramaCandidates: [],
      forbiddenParticipants: [{ name: '王主管', reason: '场外微信' }],
      randomActiveEvents: [{ characterName: '路人甲', eventType: 'background_only', motivation: '路过' }],
      randomIntrusionCondition: '无明确条件则禁止闯入',
    },
  });

  assert.ok(prompt.includes('上一轮查询规划摘要：'));
  assert.ok(prompt.includes('强制出场：刘思琪'));
  assert.ok(prompt.includes('高优先候选：刘思瑶'));
  assert.ok(prompt.includes('禁止出场：王主管'));
  assert.ok(prompt.includes('随机主动事件：路人甲'));
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: FAIL because the prompt does not contain `上一轮查询规划摘要：`.

- [ ] **Step 3: Implement previousGuidanceSummary**

In `publish/real-world-agent-loop.js`, insert after `stepOutputRule()`:

```js
  previousGuidanceSummary(guidance = null) {
    if (!guidance) return '无';
    const names = (group = [], reasonLabel = '理由') => (Array.isArray(group) ? group : []).map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${reasonLabel}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(guidance.randomActiveEvents) ? guidance.randomActiveEvents : [])
      .map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '背景行动'}｜${item.motivation || item.reason || ''}`)
      .join('；') || '无';
    const query = (key) => [...new Set(Array.isArray(guidance.sceneQueries?.[key]) ? guidance.sceneQueries[key] : [])].join('；') || '无';
    return [
      `资料状态：${guidance.type === 'context_done' ? '资料已足够' : '继续请求资料'}`,
      `地点查询：${query('location')}`,
      `因果查询：${query('causality')}`,
      `冲突查询：${query('conflict')}`,
      `强制出场：${names(guidance.forcedParticipants, '出场理由')}`,
      `高优先候选：${names(guidance.priorityCandidates, '候选理由')}`,
      `戏剧候选：${names(guidance.dramaCandidates, '候选理由')}`,
      `禁止出场：${names(guidance.forbiddenParticipants, '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${guidance.randomIntrusionCondition || '无明确条件则禁止闯入'}`,
    ].join('\n');
  },
```

- [ ] **Step 4: Pass template variable**

In `buildConfiguredPrompt()`, inside the `promptTemplates.render(config.firstTemplateId ...` variable object, add:

```js
        上一轮查询规划摘要: this.previousGuidanceSummary(guidance),
```

The block should include:

```js
      return window.GameModules.promptTemplates.render(config.firstTemplateId || 'inference-stage1-guided-query', {
        ...commonVars,
        路由上下文: stage1RoutingContext,
        上一轮查询规划摘要: this.previousGuidanceSummary(guidance),
        已加载资料摘要: config.ctx.loadedRoutingSummary?.(loaded) || '无',
        可请求资料目录: config.ctx.stage1MaterialCatalogText?.(config.mode) || '无',
      });
```

- [ ] **Step 5: Update Stage1 markdown template**

In `publish/prompts/推演引擎/stage1-guided-query.md`, after the `路由上下文` block and before `已加载资料摘要`, add:

```md
上一轮查询规划摘要：
{{上一轮查询规划摘要}}
```

Under `出场边界规则：`, add these bullets:

```md
- 本轮必须基于上一轮查询规划摘要继续收敛；若候选层发生变化，以本轮字段作为当前判断，不要无理由重置候选层。
- 玩家/当前被控主体由系统最终兜底为强制出场；强制出场允许多人，表示本次行动必然涉及、出现、回应或受影响的人物集合。
```

- [ ] **Step 6: Update Stage1 JS template and runtime bundle**

Open `publish/prompts/推演引擎/stage1-guided-query.js` and mirror the exact markdown text. Then update `publish/inference-prompts-runtime.js` so the inline `inference-stage1-guided-query` template also includes:

```text
上一轮查询规划摘要：
{{上一轮查询规划摘要}}
```

and the two new bullets from Step 5.

- [ ] **Step 7: Run prompt tests**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: the new previous-summary test PASS; existing runtime-template cleanliness tests still PASS.

---

### Task 4: Make Stage2 consume effective layers instead of trace union

**Files:**
- Modify: `publish/real-world-agent-loop.js:70-96`
- Modify: `publish/real-world-agent-loop.js:267-280`
- Modify: `publish/real-world-agent-context.js:506-545`
- Modify: `publish/story-agent-context.js` if it has `sceneParticipantBoundary()` or `buildSceneAnchorContext()`.
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes `resolveEffectiveSceneLayers(trace, store, config)` from Task 2.
- Produces context param:
  - `effectiveSceneLayers?: object`
  - `ctx.buildSceneAnchorContext({ store, action, loaded, trace, effectiveSceneLayers, materialSession, config })`.

- [ ] **Step 1: Add failing Stage2 effective-boundary test**

Append this test after the Stage2 prompt test:

```js
test('scene anchor prompt uses effective scene layers instead of trace union', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage2-scene-anchor.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } };

  const prompt = await loop.buildConfiguredSceneAnchorPrompt({
    store,
    action: '前往刘思琪房间',
    base: '基础',
    loaded: [],
    trace: [
      {
        forcedParticipants: [],
        priorityCandidates: [{ name: '刘思瑶', reason: '第一轮探索候选' }],
        dramaCandidates: [{ name: '刘思怡', reason: '第一轮戏剧候选' }],
        randomActiveEvents: [{ characterName: '刘思琪', eventType: 'background_only', motivation: '第一轮随机' }],
        randomIntrusionCondition: '无明确条件则禁止闯入',
      },
      {
        forcedParticipants: [{ name: '刘思琪', reason: '最终目标' }],
        priorityCandidates: [],
        dramaCandidates: [],
        forbiddenParticipants: [],
        randomActiveEvents: [{ characterName: '刘思怡', eventType: 'background_only', motivation: '最终场外' }],
        randomIntrusionCondition: '无明确条件则禁止闯入',
      },
    ],
    config,
  });

  assert.ok(prompt.includes('强制出场：刘思琪'));
  assert.ok(prompt.includes('强制出场：刘思琪') && prompt.includes('刘悠'));
  assert.ok(!prompt.includes('高优先候选：刘思瑶'));
  assert.ok(!prompt.includes('戏剧候选：刘思怡'));
  assert.ok(prompt.includes('随机主动事件：刘思怡'));
  assert.ok(!prompt.includes('随机主动事件：刘思琪'));
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: FAIL because Stage2 still sees trace union or does not include player in forced boundary.

- [ ] **Step 3: Update buildConfiguredSceneAnchorPrompt**

Replace `buildConfiguredSceneAnchorPrompt()` with:

```js
  async buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace = [], effectiveSceneLayers = null, materialSession = null, config = this.realConfig() }) {
    const actionText = this.actionText(action, config.mode === 'story' ? '继续推进操控剧情' : '继续观察现实世界');
    const layers = effectiveSceneLayers || this.resolveEffectiveSceneLayers(trace, store, config);
    const anchorContext = config.ctx.buildSceneAnchorContext?.({ store, action: actionText, loaded, trace, effectiveSceneLayers: layers, materialSession, config }) || [
      `模式：${config.label}`,
      `本次行动：${actionText}`,
      `参与者边界：\n${this.sceneLayerSummary(layers, store, config)}`,
    ].join('\n');
    return window.GameModules.promptTemplates.render('inference-stage2-scene-anchor', {
      模式标签: config.label,
      本次行动: actionText,
      场景锚定上下文: anchorContext,
      紧凑返回规则: this.compactReturnRule('prose'),
    });
  },
```

- [ ] **Step 4: Update generateConfiguredFinal to resolve once**

In `generateConfiguredFinal()`, before building `sceneAnchorPrompt`, add:

```js
    const effectiveSceneLayers = this.resolveEffectiveSceneLayers(trace, store, config);
```

Then change the scene anchor call to:

```js
    const sceneAnchorPrompt = await this.buildConfiguredSceneAnchorPrompt({ store, action, base, loaded, trace, effectiveSceneLayers, materialSession, config });
```

Later in the settlement block, change:

```js
      const participants = this.mergeNarrationParticipants(this.stageParticipants(trace, loaded, store), narration, store);
```

to:

```js
      const participants = this.mergeNarrationParticipants(this.stageParticipants(effectiveSceneLayers, loaded, store), narration, store);
```

- [ ] **Step 5: Update real-world context boundary**

Replace `sceneParticipantBoundary(trace = [])` in `publish/real-world-agent-context.js` with:

```js
  sceneParticipantBoundary(trace = [], effectiveSceneLayers = null) {
    const layers = effectiveSceneLayers || (Array.isArray(trace) ? {
      forcedParticipants: trace.flatMap((item) => Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []),
      priorityCandidates: trace.flatMap((item) => Array.isArray(item?.priorityCandidates) ? item.priorityCandidates : []),
      dramaCandidates: trace.flatMap((item) => Array.isArray(item?.dramaCandidates) ? item.dramaCandidates : []),
      forbiddenParticipants: trace.flatMap((item) => Array.isArray(item?.forbiddenParticipants) ? item.forbiddenParticipants : []),
      randomActiveEvents: trace.flatMap((item) => Array.isArray(item?.randomActiveEvents) ? item.randomActiveEvents : []),
      randomIntrusionCondition: [...trace].reverse().find((item) => item?.randomIntrusionCondition)?.randomIntrusionCondition || '无明确条件则禁止闯入',
    } : trace || {});
    const seenNames = new Set();
    const clean = (group = []) => (Array.isArray(group) ? group : []).filter((item) => {
      const name = String(item?.name || item?.idOrName || item?.id || item?.characterName || '').trim();
      if (!name || seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });
    const names = (group = [], label = '理由') => clean(group).map((item) => {
      const name = item.name || item.idOrName || item.id || item.characterName;
      return `${name}${item.reason ? `（${label}：${item.reason}）` : ''}`;
    }).join('、') || '无';
    const random = (Array.isArray(layers.randomActiveEvents) ? layers.randomActiveEvents : []).map((item) => `${item.characterName || item.name}：${item.eventType || item.actionMethod || '场外事件'}｜${item.motivation || ''}`).join('；') || '无';
    return [
      `强制出场：${names(layers.forcedParticipants, '出场理由')}`,
      `高优先候选：${names(layers.priorityCandidates, '候选理由')}`,
      `戏剧候选：${names(layers.dramaCandidates, '候选理由')}`,
      `禁止出场：${names(layers.forbiddenParticipants, '不在场理由')}`,
      `随机主动事件：${random}`,
      `随机事件闯入条件：${layers.randomIntrusionCondition || '无明确条件则禁止闯入'}`,
    ].join('\n');
  },
```

- [ ] **Step 6: Update real-world buildSceneAnchorContext**

Change the signature in `publish/real-world-agent-context.js` from:

```js
  buildSceneAnchorContext({ store, action, loaded = [], trace = [], config = null } = {}) {
```

to:

```js
  buildSceneAnchorContext({ store, action, loaded = [], trace = [], effectiveSceneLayers = null, config = null } = {}) {
```

Change the participant boundary line from:

```js
      `参与者边界：\n${this.sceneParticipantBoundary(trace)}`,
```

to:

```js
      `参与者边界：\n${this.sceneParticipantBoundary(trace, effectiveSceneLayers)}`,
```

- [ ] **Step 7: Update story context boundary wrapper**

In `publish/story-agent-context.js`, change:

```js
  sceneParticipantBoundary(trace = []) {
    return window.GameModules.realWorldAgentContext.sceneParticipantBoundary(trace);
  },

  buildSceneAnchorContext({ store, action, loaded = [], trace = [], config = null } = {}) {
```

to:

```js
  sceneParticipantBoundary(trace = [], effectiveSceneLayers = null) {
    return window.GameModules.realWorldAgentContext.sceneParticipantBoundary(trace, effectiveSceneLayers);
  },

  buildSceneAnchorContext({ store, action, loaded = [], trace = [], effectiveSceneLayers = null, config = null } = {}) {
```

Then change the participant boundary line from:

```js
      `参与者边界：\n${this.sceneParticipantBoundary(trace)}`,
```

to:

```js
      `参与者边界：\n${this.sceneParticipantBoundary(trace, effectiveSceneLayers)}`,
```

- [ ] **Step 8: Run Stage2 tests**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: Stage2 effective-boundary test PASS. Existing Stage2 slim context tests PASS.

---

### Task 5: Make settlement participant selection use effective forced participants only

**Files:**
- Modify: `publish/real-world-agent-loop.js:356-390`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes `effectiveSceneLayers` object from Task 2.
- Produces `stageParticipants(traceOrLayers, loaded, store): Array<object>` that accepts either historical trace arrays or effective layer objects.

- [ ] **Step 1: Add failing settlement participant test**

Append this test near existing `stageParticipants` tests:

```js
test('stageParticipants accepts effective layers and excludes priority drama and random candidates from settlement seed', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } };
  const effectiveLayers = {
    forcedParticipants: [{ name: '刘思琪', role: 'forced', canSettle: true }],
    priorityCandidates: [{ name: '刘思瑶', role: 'priority-candidate', canSettle: false }],
    dramaCandidates: [{ name: '刘思怡', role: 'drama-candidate', canSettle: false }],
    forbiddenParticipants: [{ name: '王主管', role: 'forbidden', canSettle: false }],
    randomActiveEvents: [{ characterName: '路人甲', eventType: 'background_only' }],
  };

  const participants = loop.stageParticipants(effectiveLayers, [], store);

  assert.ok(participants.some((item) => item.type === 'player' && item.id === 'player-self' && item.name === '刘悠'));
  assert.ok(participants.some((item) => item.name === '刘思琪'));
  assert.ok(!participants.some((item) => item.name === '刘思瑶'));
  assert.ok(!participants.some((item) => item.name === '刘思怡'));
  assert.ok(!participants.some((item) => item.name === '王主管'));
  assert.ok(!participants.some((item) => item.name === '路人甲'));
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: FAIL because `stageParticipants()` treats a non-array effective layers object as empty except current player.

- [ ] **Step 3: Update stageParticipants input handling**

At the start of `stageParticipants(trace = [], loaded = [], store = null)`, add:

```js
    const sourceItems = Array.isArray(trace) ? trace : (trace ? [{ ...trace, participants: [], characters: [] }] : []);
```

Then replace every occurrence of:

```js
    (Array.isArray(trace) ? trace : [])
```

inside that method with:

```js
    sourceItems
```

- [ ] **Step 4: Ensure effective forced participants are added**

In the second loop in `stageParticipants()`, make sure this line remains present and uses `sourceItems`:

```js
      (Array.isArray(item?.forcedParticipants) ? item.forcedParticipants : []).forEach((p) => add({ ...p, role: p.role || 'forced', canSettle: p.canSettle === false ? false : true }));
```

- [ ] **Step 5: Run stage participant tests**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: all `stageParticipants` tests PASS, including existing role-card promotion tests.

---

### Task 6: Update Stage2 prompt wording and generated template files

**Files:**
- Modify: `publish/prompts/推演引擎/stage2-scene-anchor.md:13-20`
- Modify: `publish/prompts/推演引擎/stage2-scene-anchor.js`
- Modify: `publish/inference-prompts-runtime.js`
- Test: `tests/real-world-loop-update.test.js`

**Interfaces:**
- Consumes effective Stage2 context from Task 4.
- Produces prompt contract clarification only; no new JS function.

- [ ] **Step 1: Update Stage2 markdown rule**

In `publish/prompts/推演引擎/stage2-scene-anchor.md`, replace this bullet:

```md
- 强制出场、高优先候选、戏剧候选、禁止出场都必须保留候选姓名并写明出场理由或不出场理由；不得把上游候选直接省略成“无”。
```

with:

```md
- 强制出场、高优先候选、戏剧候选、禁止出场都来自最终有效候选层，必须保留候选姓名并写明出场理由或不出场理由；不得把最终有效上游候选直接省略成“无”，也不得从历史 trace 中恢复已被后轮清除的候选。
```

- [ ] **Step 2: Update Stage2 JS template and runtime bundle**

Mirror the exact updated bullet in:

```text
publish/prompts/推演引擎/stage2-scene-anchor.js
publish/inference-prompts-runtime.js
```

- [ ] **Step 3: Add runtime-template assertion**

In test `inference runtime bundle keeps Stage1 Stage2 Stage3 slim template fields clean`, after the existing Stage2 assertions, add:

```js
  assert.ok(stage2.includes('最终有效候选层'), 'Stage2 runtime template should mention final effective candidate layers');
  assert.ok(stage2.includes('不得从历史 trace 中恢复已被后轮清除的候选'), 'Stage2 runtime template should forbid restoring cleared trace candidates');
```

- [ ] **Step 4: Run tests**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected: runtime template test PASS.

---

### Task 7: Full verification and regression check

**Files:**
- Read/verify only unless failures require fixes:
  - `publish/real-world-agent-loop.js`
  - `publish/real-world-agent-context.js`
  - `publish/story-agent-context.js`
  - `publish/prompts/推演引擎/stage1-guided-query.md`
  - `publish/prompts/推演引擎/stage2-scene-anchor.md`
  - `publish/prompts/推演引擎/stage1-guided-query.js`
  - `publish/prompts/推演引擎/stage2-scene-anchor.js`
  - `publish/inference-prompts-runtime.js`
  - `tests/real-world-loop-update.test.js`

**Interfaces:**
- Verifies all interfaces from previous tasks are stable.
- Produces no new public interface.

- [ ] **Step 1: Run targeted test file**

Run:

```bash
node --test tests/real-world-loop-update.test.js
```

Expected:

```text
# pass
```

or Node's equivalent all-tests-passing summary with zero failures.

- [ ] **Step 2: Search for old trace-union Stage2 usage**

Run a code search with the Grep tool or equivalent for:

```text
sceneParticipantBoundary(trace)
sceneLayerSummary(trace)
buildSceneAnchorContext?.({ store, action: actionText, loaded, trace, materialSession, config })
stageParticipants(trace, loaded, store)
```

Expected:

- No Stage2 prompt path calls `sceneParticipantBoundary(trace)` without effective layers.
- No final settlement path calls `stageParticipants(trace, loaded, store)` after `effectiveSceneLayers` has been computed.
- Fallback/debug helpers may still accept trace for compatibility.

- [ ] **Step 3: Verify prompt bundles are synchronized**

Read these files and confirm the same semantic additions exist in all relevant versions:

```text
publish/prompts/推演引擎/stage1-guided-query.md
publish/prompts/推演引擎/stage1-guided-query.js
publish/prompts/推演引擎/stage2-scene-anchor.md
publish/prompts/推演引擎/stage2-scene-anchor.js
publish/inference-prompts-runtime.js
```

Expected:

- Stage1 contains `上一轮查询规划摘要`.
- Stage1 contains `玩家/当前被控主体由系统最终兜底为强制出场`.
- Stage1 contains `强制出场允许多人`.
- Stage2 contains `最终有效候选层`.
- Stage2 contains `不得从历史 trace 中恢复已被后轮清除的候选`.

- [ ] **Step 4: Run broader available tests if known**

Run:

```bash
node --test tests/*.test.js
```

Expected: all available Node test files PASS. If unrelated pre-existing failures appear, capture their exact test names and error messages, then run the targeted test again to verify this feature remains passing.

- [ ] **Step 5: Report verification status**

Prepare a concise status for the user with:

```text
- 已实现：Stage1 previous summary / effective scene layers / player forced / random cleanup / Stage2 effective boundary / settlement seed filtering
- 验证：node --test tests/real-world-loop-update.test.js passed
- 如运行 broader tests：node --test tests/*.test.js passed 或列出无关失败
```

Do not claim completion until the commands actually pass.

---

## Self-Review

- Spec coverage:
  - Prior Stage1 summary: Task 3.
  - Stage2 final effective layers: Task 4.
  - Player/current controlled subject forced: Task 2.
  - Multiple forced participants: Task 1 and Task 2.
  - Random cleanup: Task 1 and Task 2.
  - Role cards not auto-present/settleable: Task 5 preserves settlement eligibility and existing tests.
  - Prompt wording: Task 3 and Task 6.
  - Verification: Task 7.

- Placeholder scan:
  - The plan contains no TBD/TODO placeholders.
  - Each code-changing task includes concrete code snippets and exact commands.

- Type consistency:
  - `resolveEffectiveSceneLayers(trace, store, config)` return shape is used consistently by Stage2 and settlement tasks.
  - `effectiveSceneLayers` parameter name is consistent across loop and context.
  - `previousGuidanceSummary(guidance)` is only consumed by `buildConfiguredPrompt()`.
