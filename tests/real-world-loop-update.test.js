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
    ai: {
      normalizeChoices(choices, fallback = []) {
        return Array.isArray(choices) && choices.length ? choices.slice(0, 4) : fallback.slice(0, 4);
      },
      normalizeCharacter(item) { return item; },
    },
    promptTemplates: { render: async (_id, vars) => JSON.stringify(vars) },
    updateRegistry: null,
    sqliteSave: {
      getCharacterState: () => null,
      getCharacterStateByName: () => null,
      saveCharacterState: async () => {},
    },
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
  loadScript(context, 'publish/real-world-agent-context.js');
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

test('compactJsonReturn preserves ordinary spaces inside JSON string values', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = '{\n  "name": "Liu Si Qi",\n  "evidence": "two words"\n}';
  assert.strictEqual(loop.compactJsonReturn(raw), '{"name":"Liu Si Qi","evidence":"two words"}');
});

test('cleanPhasedNarration compacts prose to a single line', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  assert.strictEqual(loop.cleanPhasedNarration('第一句。\n\t第二句。\u200B'), '第一句。第二句。');
});

test('inference engine prompts are centralized markdown sources', () => {
  const base = path.join(root, 'publish/prompts/推演引擎');
  ['stage1-guided-query.md', 'stage2-scene-anchor.md', 'stage3-narration.md', 'stage4-settlement-window.md'].forEach((name) => {
    assert.ok(fs.existsSync(path.join(base, name)), `${name} missing`);
  });
  assert.ok(fs.existsSync(path.join(base, 'init/intimacy-body-init-prompt.md')), 'init prompt missing');
  ['emotion', 'feeling', 'vital', 'body-status', 'wearing-state', 'sexual-experience', 'sexual-history', 'relationship', 'role-card', 'item', 'map', 'faction-overview', 'faction-structure', 'system', 'generic'].forEach((id) => {
    assert.ok(fs.existsSync(path.join(base, `update/${id}-update-prompt.md`)), `${id} update prompt missing`);
  });
});

test('old inference prompt markdown sources are not duplicated outside unified directory', () => {
  const oldSources = [
    'publish/prompts/real-world-engine-first.md',
    'publish/prompts/real-world-engine.md',
    'publish/prompts/story-agent-engine-first.md',
    'publish/prompts/story-agent-engine.md',
    'publish/prompts/stage1-guided-query.md',
    'publish/prompts/stage2-scene-anchor.md',
    'publish/prompts/stage3-narration.md',
    'publish/init/intimacy-body-init-prompt.md',
    ...['emotion', 'feeling', 'vital', 'body-status', 'wearing-state', 'sexual-experience', 'sexual-history', 'relationship', 'role-card', 'item', 'map', 'faction-overview', 'faction-structure', 'system', 'generic'].map((id) => `publish/update/${id}-update-prompt.md`),
  ];
  oldSources.forEach((relative) => {
    const full = path.join(root, relative);
    if (!fs.existsSync(full)) return;
    assert.ok(fs.readFileSync(full, 'utf8').startsWith('<!-- GENERATED FROM publish/prompts/推演引擎/'), `${relative} should be migrated or marked generated`);
  });
});

test('Stage 1 prompt requires Chinese K:V guided query planning', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  context.window.GameModules.promptTemplates.render = async (id, vars) => (id === 'inference-stage1-guided-query'
    ? `只输出中文 K:V\n查询规划：\n资料状态：\n强制出场：\n资料请求1：角色查询，搜索角色卡，角色全称，世界全称\n随机场外角色候选：${vars.随机场外角色候选}`
    : JSON.stringify(vars));
  const config = loop.realConfig();
  config.ctx = {
    buildLoadedText: () => '',
    baseSnapshot: () => '',
    skillText: async () => '',
    limit: (text) => String(text || ''),
    randomActiveEventCandidates: () => [{ id: 'boss', name: '王主管' }],
  };
  const prompt = await loop.buildConfiguredPrompt({ store: makeStore(), action: '和刘思琪对话', base: '基础', loaded: [], skills: '', step: 1, config });
  assert.ok(prompt.includes('只输出中文 K:V'));
  assert.ok(prompt.includes('查询规划：'));
  assert.ok(prompt.includes('资料状态：'));
  assert.ok(prompt.includes('强制出场：'));
  assert.ok(prompt.includes('资料请求1：角色查询，搜索角色卡'));
  assert.ok(prompt.includes('随机场外角色候选'));
  assert.ok(prompt.includes('王主管'));
  assert.ok(!prompt.includes('只允许返回一个合法 JSON 对象'));
});

test('Stage 1 follow-up prompt remains Chinese K:V and never asks for JSON', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const renderedIds = [];
  context.window.GameModules.promptTemplates.render = async (id, vars) => {
    renderedIds.push(id);
    return id === 'inference-stage1-guided-query'
      ? `Stage1模板\n查询规划：\n资料状态：\n输出要求：${vars.当前步骤输出要求}`
      : `基础模板\n输出要求：${vars.当前步骤输出要求}`;
  };
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };

  const prompt = await loop.buildConfiguredPrompt({ store: makeStore(), action: '继续查询', base: '基础', loaded: [{ title: '角色卡', text: '刘思琪' }], skills: '', step: 2, config });

  assert.ok(renderedIds.includes('inference-stage1-guided-query'));
  assert.ok(prompt.includes('中文 K:V'));
  assert.ok(prompt.includes('查询规划'));
  assert.ok(prompt.includes('资料状态'));
  assert.ok(!prompt.includes('只允许返回一个合法 JSON 对象'));
  assert.ok(!prompt.includes('第一个字符必须是 {'));
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
  assert.ok(prompt.includes('身体感受'));
  assert.ok(prompt.includes('可见细节'));
  assert.ok(prompt.includes('对话回应'));
  assert.ok(prompt.includes('不替玩家执行下一步新行动'));
  assert.ok(prompt.includes('不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮'));
  assert.ok(prompt.includes('不要换行符'));
});

test('scene anchor report prompt uses Chinese K:V fields and layered context', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  context.window.GameModules.promptTemplates.render = async (id, vars) => (id === 'inference-stage2-scene-anchor'
    ? `只输出中文 K:V\n场景锚定报告：\n正文写作重点：\n结算边界：\n${vars.参与者分层与查询规划}\n${vars.已加载资料摘要}`
    : JSON.stringify(vars));
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '角色卡：刘思琪', limit: (text) => String(text || '') };
  const prompt = await loop.buildConfiguredSceneAnchorPrompt({ store: makeStore(), action: '拉扯刘思琪的 choker', base: '基础', loaded: [{ title: '角色卡', text: '刘思琪资料' }], trace: [{ type: 'request_context', forcedParticipants: [{ name: '刘思琪' }], priorityCandidates: [{ name: '刘思怡', reason: '相邻房间' }], randomActiveEvents: [{ characterName: '王主管', eventType: 'wechat', motivation: '工作确认' }], sceneQueries: { location: ['房间门口'], causality: [], conflict: [] } }], config });
  assert.ok(prompt.includes('只输出中文 K:V'));
  assert.ok(prompt.includes('场景锚定报告：'));
  assert.ok(prompt.includes('正文写作重点：'));
  assert.ok(prompt.includes('结算边界：'));
  assert.ok(prompt.includes('刘思琪'));
  assert.ok(prompt.includes('王主管'));
});

test('parse scene anchor report requires critical writing and settlement fields', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const out = loop.parseSceneAnchorReport(`场景锚定报告：本轮只处理门口动作。\n当前地点：刘思琪房间门口\n当前时间：12:56\n空间状态：相邻房间可能听见但不能无因果闯入。\n当前动作：玩家拉扯 choker。\n强制出场：刘悠；刘思琪\n高优先候选：刘思怡\n戏剧候选：无\n禁止出场：无\n随机事件影响：王主管可能发微信，默认场外。\n正文写作重点：写清动作与即时反应。\n结算边界：只结算刘悠与刘思琪。`, loop.realConfig());
  assert.strictEqual(out.currentLocation, '刘思琪房间门口');
  assert.ok(out.text.includes('结算边界：只结算刘悠与刘思琪。'));
  assert.ok(out.parseScore.successRate >= 0.8);
});

test('parse scene anchor report rejects missing location time space or action anchors', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const full = {
    '场景锚定报告': '本轮只处理门口动作。',
    '当前地点': '刘思琪房间门口',
    '当前时间': '12:56',
    '空间状态': '相邻房间可能听见但不能无因果闯入。',
    '当前动作': '玩家拉扯 choker。',
    '强制出场': '刘思琪',
    '高优先候选': '无',
    '戏剧候选': '无',
    '禁止出场': '无',
    '随机事件影响': '无',
    '正文写作重点': '只写当前动作。',
    '结算边界': '只结算刘思琪。',
  };
  ['当前地点', '当前时间', '空间状态', '当前动作'].forEach((missingKey) => {
    const text = Object.entries(full).filter(([key]) => key !== missingKey).map(([key, value]) => `${key}：${value}`).join('\n');
    assert.throws(() => loop.parseSceneAnchorReport(text, loop.realConfig()), /场景锚定报告解析错误请重试/u, missingKey);
  });
});

test('parseStep normalizes Chinese K:V participants into trace items', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep(`查询规划：确认互动边界
资料状态：继续请求资料
强制出场：刘悠；刘思琪
高优先候选：赵敏
戏剧候选：无
禁止出场：王主管
随机事件候选：王主管｜wechat｜工作确认；路人甲｜background｜经过门口
随机事件闯入条件：无明确条件则禁止闯入
资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界
资料请求结束：是`, loop.realConfig());
  const traced = loop.traceItem(1, data, '查询规划：确认互动边界', context.window.GameModules.realWorldAgentContext);

  assert.strictEqual(data.type, 'request_context');
  assert.strictEqual(JSON.stringify(data.participants.map((item) => item.name)), JSON.stringify(['刘悠', '刘思琪']));
  assert.strictEqual(JSON.stringify(data.priorityCandidates.map((item) => item.name)), JSON.stringify(['赵敏']));
  assert.strictEqual(JSON.stringify(data.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.strictEqual(JSON.stringify(data.randomActiveEvents.map((item) => item.characterName)), JSON.stringify(['路人甲']));
  assert.strictEqual(data.requests.length, 1);
  assert.strictEqual(traced.participants.length, 2);
  assert.strictEqual(JSON.stringify(traced.priorityCandidates.map((item) => item.name)), JSON.stringify(['赵敏']));
  assert.strictEqual(JSON.stringify(traced.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.strictEqual(JSON.stringify(traced.randomActiveEvents.map((item) => item.characterName)), JSON.stringify(['路人甲']));
  assert.ok(traced.parseScore.successRate >= 0.8);
  assert.strictEqual(typeof traced.parseDegraded, 'boolean');
  assert.strictEqual(JSON.stringify(traced.droppedMaterialRequests), JSON.stringify([]));
});

test('parseStep rejects legacy JSON Stage1 payloads on strict Chinese K:V path', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  assert.throws(() => loop.parseStep('{"type":"request_context","participants":["刘思琪"],"requests":[]}', loop.realConfig()), /缺少中文 K:V 查询规划字段/u);
});

test('parseChineseKvBlock parses fixed Chinese keys and aliases with score', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseChineseKvBlock(`查询规划：确认地点和直接互动对象\n资料状态：继续请求资料\n必须出场：刘悠；刘思琪\n不能出场：王主管\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界\n资料请求结束：是`, loop.guidedStepFields(), { parseMaterialRequests: true, config: loop.realConfig() });

  assert.strictEqual(parsed.values['强制出场'], '刘悠；刘思琪');
  assert.strictEqual(parsed.values['禁止出场'], '王主管');
  assert.strictEqual(parsed.materialRequests.length, 1);
  assert.ok(parsed.successRate >= 0.8);
});

test('mergeGuidedParseResults combines complementary fields before scoring threshold', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const first = loop.parseChineseKvBlock('查询规划：先确认参与者\n资料状态：继续请求资料\n强制出场：刘悠', loop.guidedStepFields());
  const second = loop.parseChineseKvBlock('禁止出场：王主管\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求结束：是', loop.guidedStepFields());
  const merged = loop.mergeGuidedParseResults(first, second);

  assert.strictEqual(merged.values['强制出场'], '刘悠');
  assert.strictEqual(merged.values['禁止出场'], '王主管');
  assert.ok(merged.successRate >= first.successRate);
  assert.ok(merged.successRate >= second.successRate);
});

test('parseChineseKvBlock does not count empty critical values as successful hits', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseChineseKvBlock('资料状态：\n强制出场：\n禁止出场：\n随机事件闯入条件：', loop.guidedStepFields());

  assert.ok(parsed.keyHits.includes('资料状态'));
  assert.strictEqual(parsed.criticalHits.length, 0);
  assert.ok(parsed.successRate < 0.8);
});

test('mergeGuidedParseResults deduplicates material request scoring and best result picks highest score', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const first = loop.parseChineseKvBlock('资料状态：继续请求资料\n资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界', loop.guidedStepFields(), { parseMaterialRequests: true, config: loop.realConfig() });
  const second = loop.parseChineseKvBlock('资料状态：继续请求资料\n强制出场：刘思琪\n资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界', loop.guidedStepFields(), { parseMaterialRequests: true, config: loop.realConfig() });
  const merged = loop.mergeGuidedParseResults(first, second);

  assert.strictEqual(merged.materialRequests.length, 1);
  assert.ok(merged.successRate >= first.successRate);
  assert.ok(merged.successRate >= second.successRate);
  assert.strictEqual(loop.bestGuidedParseResult([first, merged]), merged);
});

test('parseChineseMaterialRequest maps real Chinese requests to whitelist calls', () => {
  const context = createContext();
  loadCore(context);
  context.window.GameModules.realWorld2026 = { label: '2026现代都市现实世界' };
  const ctx = context.window.GameModules.realWorldAgentContext;

  const role = ctx.parseChineseMaterialRequest('资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界', { mode: 'real' });
  const nearby = ctx.parseChineseMaterialRequest('资料请求2：地点查询，查询附近地点，刘思琪房间门口', { mode: 'real' });
  const bad = ctx.parseChineseMaterialRequest('资料请求3：未知查询，删除资料，刘思琪', { mode: 'real' });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(role)), { skill: 'character.query', method: 'searchCharacterProfile', params: { name: '刘思琪', world: '2026现代都市现实世界' }, sourceText: '资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界' });
  assert.strictEqual(nearby.skill, 'realworld.location.query');
  assert.strictEqual(nearby.method, 'getNearbyLocations');
  assert.strictEqual(nearby.params.locationName, '刘思琪房间门口');
  assert.strictEqual(bad, null);
});

test('promptTemplates registers Stage4 settlement window markdown', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  const item = context.window.GameModules.promptTemplates.find('inference-stage4-settlement-window');
  assert.strictEqual(item.id, 'inference-stage4-settlement-window');
  assert.strictEqual(item.file, 'prompts/推演引擎/stage4-settlement-window.md');
});

test('promptTemplates render expands double-brace markdown variables cleanly', async () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  const templates = context.window.GameModules.promptTemplates;
  templates.inline = { 'inference-stage4-settlement-window': '现有 Update：{{现有Update提示词摘要}}\n旧格式：{旧变量}' };
  const out = await templates.render('inference-stage4-settlement-window', { 现有Update提示词摘要: 'UPDATE_REGISTRY_GUIDANCE', 旧变量: 'LEGACY_VALUE' });
  assert.ok(out.includes('现有 Update：UPDATE_REGISTRY_GUIDANCE'));
  assert.ok(out.includes('旧格式：LEGACY_VALUE'));
  assert.ok(!out.includes('{UPDATE_REGISTRY_GUIDANCE}'));
  assert.ok(!out.includes('{{现有Update提示词摘要}}'));
});

test('promptTemplates inline bundle contains Stage K:V templates and no old guided JSON protocol', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompt-templates-inline.js');
  const inline = context.window.GameModules.promptTemplates.inline || {};
  ['inference-stage1-guided-query', 'inference-stage2-scene-anchor', 'inference-stage3-narration', 'inference-stage4-settlement-window'].forEach((id) => {
    assert.ok(String(inline[id] || '').length > 20, `${id} inline template missing`);
  });
  const guidedText = [
    inline['real-world-engine'] || '',
    inline['real-world-engine-first'] || '',
    inline['story-agent-engine'] || '',
    inline['story-agent-engine-first'] || '',
  ].join('\n');
  assert.ok(!guidedText.includes('资料收集阶段只能返回一个合法 JSON 对象'));
  assert.ok(!guidedText.includes('只允许输出 `request_context`'));
  assert.ok(!guidedText.includes('第一个字符必须是 `{`'));
  assert.ok(String(inline['inference-stage1-guided-query']).includes('只输出中文 K:V'));
  assert.ok(String(inline['inference-stage4-settlement-window']).includes('现有 Update 提示词摘要'));
});

test('Stage4 settlement window prompt includes update and init registry guidance', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  let requestedUpdateIds = null;
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  context.window.GameModules.updateRegistry.register({ id: 'emotion', promptId: 'emotion-update' });
  context.window.GameModules.updateRegistry.registerPrompt('emotion-update', '---\nname: 情绪更新\ndescription: UPDATE_REGISTRY_GUIDANCE\n---\nUPDATE_REGISTRY_GUIDANCE');
  const originalSkillsText = context.window.GameModules.updateRegistry.skillsText.bind(context.window.GameModules.updateRegistry);
  context.window.GameModules.updateRegistry.skillsText = (ids) => {
    requestedUpdateIds = ids;
    return originalSkillsText(ids);
  };
  context.window.GameModules.initPromptRegistry.skillText = () => 'INIT_PROMPT_GUIDANCE';
  context.window.GameModules.initPromptRegistry.schema = () => ({ initUpdates: [{ type: 'INIT_SCHEMA_GUIDANCE' }] });

  const prompt = await loop.buildSettlementTypeWindowPrompt({ requestedTypes: ['情绪'], completedTypes: ['感觉'], incompleteTypes: [], store, action: '行动', base: '基础', loaded: [], narration: '正文', participants: [], config: loop.realConfig() });

  assert.deepStrictEqual(requestedUpdateIds, ['emotion']);
  assert.ok(prompt.includes('UPDATE_REGISTRY_GUIDANCE'));
  assert.ok(prompt.includes('INIT_PROMPT_GUIDANCE'));
  assert.ok(prompt.includes('INIT_SCHEMA_GUIDANCE'));
});

test('Stage4 settlement window awaits rendered prompt on real call chain', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  const participants = [{ type: 'player', id: 'player-self', name: '玩家', role: 'actor' }];
  loop.settlementTypeQueue = () => ['基础结算'];
  context.window.GameModules.promptTemplates.render = async () => '渲染完成提示';
  let receivedPrompt = null;
  loop.completeConfiguredStep = async (_store, prompt) => {
    receivedPrompt = prompt;
    assert.strictEqual(typeof prompt, 'string');
    assert.ok(prompt.includes('渲染完成提示'));
    return '基础结算：\n结算状态：需要更新\n结算对象：玩家｜玩家｜允许结算\n经过时间：90\n当前状态：测试状态\n当前目标：测试目标\n场景标题：测试标题\n地点名称：测试地点\n备选行动1：一\n备选行动2：二\n备选行动3：三\n备选行动4：四\n结算对象结束：玩家\n类型完成：是\n结算结束：是';
  };

  const out = await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(receivedPrompt, '渲染完成提示');
  assert.strictEqual(out.elapsedSeconds, 90);
});

test('stageParticipants promotes character entries that match existing role cards', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const trace = [{
    characters: [
      { id: 'player-self', name: '玩家本人' },
      { id: '刘思琪', name: '刘思琪' },
      { id: '不存在的人', name: '不存在的人' },
    ],
    participants: [],
  }];

  const participants = loop.stageParticipants(trace, [], store);

  assert.strictEqual(JSON.stringify(participants.map(({ type, id, name, role }) => ({ type, id, name, role }))), JSON.stringify([
    { type: 'player', id: 'player-self', name: '玩家本人', role: 'actor' },
    { type: 'character', id: 'rushiqi', name: '刘思琪', role: 'character-role-card' },
  ]));
});

test('stageParticipants promotes character entries found by sqliteSave name lookup', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), rpgStates: {}, itemSkillState: () => null };
  store.sqliteSave = {
    getCharacterStateByName(name) {
      return name === '刘思琪' ? store.__npc : null;
    },
  };

  const participants = loop.stageParticipants([{ characters: [{ id: '刘思琪', name: '刘思琪' }], participants: [] }], [], store);

  assert.strictEqual(JSON.stringify(participants.map(({ type, id, name, role }) => ({ type, id, name, role }))), JSON.stringify([
    { type: 'character', id: 'rushiqi', name: '刘思琪', role: 'character-role-card' },
  ]));
});

test('parseStep derives mapped material requests and keeps missingContext boolean', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep(`查询规划：需要角色和地点资料
资料状态：继续请求资料
强制出场：刘思琪
禁止出场：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界
资料请求2：地点查询，查询附近地点，测试地点
资料请求结束：是`, loop.realConfig());
  const done = loop.parseStep(`查询规划：资料足够
资料状态：资料已足够
强制出场：刘思琪
禁止出场：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无
资料请求结束：是`, loop.realConfig());
  const traced = loop.traceItem(1, data, '查询规划：需要角色和地点资料', context.window.GameModules.realWorldAgentContext);

  assert.strictEqual(JSON.stringify(data.requests.map((item) => item.method)), JSON.stringify(['searchCharacterProfile', 'getNearbyLocations']));
  assert.strictEqual(data.missingContext, true);
  assert.strictEqual(done.type, 'context_done');
  assert.strictEqual(done.missingContext, false);
  assert.strictEqual(traced.missingContext, true);
});

test('completeConfiguredParsedStep retries K:V parse and accepts merged successful fields', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const outputs = [
    '查询规划：先锁定强制出场\n强制出场：刘思琪',
    '查询规划：补齐边界\n资料状态：继续请求资料\n禁止出场：王主管\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求结束：是',
  ];
  loop.completeConfiguredStep = async () => outputs.shift();

  const out = await loop.completeConfiguredParsedStep(makeStore(), '原始 prompt', null, false, false, loop.realConfig());

  assert.strictEqual(out.data.type, 'request_context');
  assert.strictEqual(JSON.stringify(out.data.participants.map((item) => item.name)), JSON.stringify(['刘思琪']));
  assert.strictEqual(JSON.stringify(out.data.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.ok(out.data.parseScore.successRate >= 0.8);
});

test('loadStepContext derives requests from needed when requests is empty', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const seen = [];
  const ctx = {
    autoLoadForStep: async () => [],
    loadRequests: async (_store, _action, requests) => {
      seen.push(...requests);
      return requests.map((item) => ({ title: item, text: `loaded:${item}` }));
    },
  };

  const out = await loop.loadStepContext(ctx, makeStore(), '观察', {
    type: 'request_context',
    requests: [],
    needed: ['character:刘思琪', 'location:测试地点'],
  }, new Set(), [], new Set(), 1, null, null);

  assert.strictEqual(JSON.stringify(seen), JSON.stringify(['character:刘思琪', 'location:测试地点']));
  assert.strictEqual(JSON.stringify(out.map((item) => item.title)), JSON.stringify(['character:刘思琪', 'location:测试地点']));
});

test('loadStepContext loads Top3 profiles, scene anchors, then mapped material requests', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const calls = [];
  const ctx = {
    autoLoadForStep: async () => [],
    participantProfileRequests: () => [{ skill: 'character.query', method: 'searchCharacterProfile', params: { name: '刘思琪' } }],
    sceneAnchorRequests: () => [{ skill: 'realworld.location.query', method: 'getCurrentLocationContext', params: {} }],
    loadRequests: async (_store, _action, requests, _loadedKeys, _session, _materials, _memoryIds, _loaded, _current, options) => { calls.push({ requests, limit: options?.limit }); return requests.map((item) => ({ title: `${item.skill}.${item.method}`, text: 'loaded' })); },
  };
  const out = await loop.loadStepContext(ctx, makeStore(), '观察', { type: 'request_context', requests: [{ skill: 'memory.query', method: 'searchCharacterMemoryWindow', params: { keyword: '旧请求' } }], forcedParticipants: [{ name: '刘思琪' }], sceneQueries: { location: ['门口'] } }, new Set(), [], new Set(), 1, null, null);
  assert.strictEqual(JSON.stringify(calls.map((item) => item.limit)), JSON.stringify([3, 4, 2]));
  assert.strictEqual(out.length, 3);
});

test('real context builds Top3 participant profile requests and excludes forbidden names', () => {
  const context = createContext();
  loadCore(context);
  context.window.GameModules.realWorld2026 = { label: '2026现代都市现实世界' };
  const ctx = context.window.GameModules.realWorldAgentContext;
  const requests = ctx.participantProfileRequests({
    forcedParticipants: [{ name: '刘思琪' }, { name: '刘思怡' }],
    priorityCandidates: [{ name: '王主管' }],
    dramaCandidates: [{ name: '路人甲' }],
    forbiddenParticipants: [{ name: '王主管' }],
  });
  assert.strictEqual(JSON.stringify(requests.map((item) => item.params.name)), JSON.stringify(['刘思琪', '刘思怡', '路人甲']));
});

test('auto-loaded character cards carry structured participants for Stage 3', async () => {
  const context = createContext();
  loadCore(context);
  context.window.GameModules.realWorld2026 = { label: '2026 现代都市现实世界' };
  context.window.GameModules.characterQuery = {
    worldMatches: () => true,
    stateText: () => '资料类型：完整角色卡',
  };
  const store = makeStore();
  const out = await context.window.GameModules.realWorldAgentContext.autoLoadForStep(store, '我前往妹妹刘思琪的房间', new Set(), null, null, new Set(), 1, [], []);

  assert.strictEqual(out.length, 1);
  assert.strictEqual(JSON.stringify(out[0].participants), JSON.stringify([{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'loaded-role-card' }]));
});

test('harness loads core modules', () => {
  const context = createContext();
  loadCore(context);
  assert.ok(context.window.GameModules.realWorldAgentLoop);
  assert.ok(context.window.GameModules.updateRegistry);
});

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

test('completeGroupedStage3Updates runs default non-init groups when route has only base fields', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '' };
  const calls = [];
  loop.buildGroupedUpdateJsonPrompt = async ({ groupKey, selectedSkills }) => {
    calls.push({ groupKey, selectedSkills });
    return '{}';
  };
  loop.completeConfiguredUpdateJson = async () => ({ genericUpdates: [] });
  loop.markConfiguredStep = () => {};

  await loop.completeGroupedStage3Updates({
    store,
    action: '观察',
    base: '基础',
    loaded: [],
    narration: '正文',
    route: { elapsedSeconds: 300, choices: ['A', 'B', 'C', 'D'] },
    config,
  });

  const expectedGroups = Object.entries(loop.stage3UpdateGroups()).filter(([, group]) => !group.init);
  assert.strictEqual(calls.length, expectedGroups.length);
  expectedGroups.forEach(([key, group], index) => {
    assert.strictEqual(calls[index].groupKey, key);
    assert.deepStrictEqual(calls[index].selectedSkills, group.skills);
  });
});

test('Stage 3B groups are capped at four update requests', () => {
  const context = createContext();
  loadCore(context);
  const groups = context.window.GameModules.realWorldAgentLoop.stage3UpdateGroups();
  assert.deepStrictEqual(Object.keys(groups), ['metrics', 'bodySex', 'survival', 'worldSocialInventory']);
  assert.ok(groups.bodySex.skills.includes('wearing-state'));
});

test('sexual-experience prompt clarifies per-subject participant rules', () => {
  const context = createContext();
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/update/sexual-experience-update-prompt.js');
  const body = context.window.GameModules.updateRegistry.prompts['sexual-experience-update'];
  assert.ok(body.includes('subject 永远表示这条性经历记录写入谁的角色卡。'));
  assert.ok(body.includes('同一亲密/性事件若玩家与角色双方都参与，则必须输出两条 sexual-experience：玩家一条，对方角色一条。'));
  assert.ok(body.includes('多人参与时，每个 Stage 1 参与者清单和 Stage 2 正文明确确认参与的人各自一条。'));
  assert.ok(body.includes('禁止根据 skill 名称凭空猜对象；参与者只能来自本回合参与者清单和正文明确事实。'));
  assert.ok(body.includes('如果只是接触、摩擦、亲吻，不得升级为插入、高潮或性交记录。'));
});

test('sexual-experience prompt stays abstract and non-process', () => {
  const context = createContext();
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/update/sexual-experience-update-prompt.js');
  const body = context.window.GameModules.updateRegistry.prompts['sexual-experience-update'];
  assert.ok(body.includes('只记录总数与分类次数，不记录过程'));
  assert.ok(!body.includes('露骨'));
  assert.ok(!body.includes('对未成年'));
  assert.ok(!body.includes('详述'));
});

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
  assert.ok(prompt.includes('只根据本回合参与者清单和阶段2正文确认事实判断主体'));
  assert.ok(prompt.includes('禁止把接触、摩擦、亲吻升级为插入、高潮或性交记录'));
});

test('parseSettlementKv saves complete types and leaves incomplete types for retry', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`情绪结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：情绪，紧张，+2，颈饰被突然拉扯
结算对象结束：刘思琪
类型完成：是
结算结束：是
感觉结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：感觉，警惕，+1`, { requestedTypes: ['情绪', '感觉'], participants, store, config: loop.realConfig() });
  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['情绪']));
  assert.strictEqual(JSON.stringify(parsed.incompleteTypes), JSON.stringify(['感觉']));
  assert.strictEqual(parsed.patchesByType['情绪'].genericUpdates.length, 1);
});

test('parseSettlementKv leaves malformed update types incomplete even with completion markers', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`情绪结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：情绪，紧张
结算对象结束：刘思琪
类型完成：是
结算结束：是`, { requestedTypes: ['情绪'], participants, store, config: loop.realConfig() });
  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify([]));
  assert.strictEqual(JSON.stringify(parsed.incompleteTypes), JSON.stringify(['情绪']));
});

test('mergeGroupedUpdatePatches maps Stage4 baseFields into final route fields', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const merged = loop.mergeGroupedUpdatePatches([{ baseFields: { '经过时间': '90', '当前状态': '门口僵持', '当前目标': '确认反应', '场景标题': '门口拉扯', '地点名称': '刘思琪房间门口', '备选行动1': '松手', '备选行动2': '询问', '备选行动3': '后退', '备选行动4': '观察' }, genericUpdates: [] }], { status: 'Stage3A覆盖状态' });
  assert.strictEqual(merged.elapsedSeconds, 90);
  assert.strictEqual(merged.status, 'Stage3A覆盖状态');
  assert.strictEqual(merged.quest, '确认反应');
  assert.strictEqual(merged.sceneTitle, '门口拉扯');
  assert.strictEqual(merged.locationName, '刘思琪房间门口');
  assert.strictEqual(JSON.stringify(merged.choices), JSON.stringify(['松手', '询问', '后退', '观察']));
});

test('parseSettlementKv handles sexual history relationship and role-card special formats', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`性历史结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：性历史，亲密身份状态变化，刘悠，正文明确确认关系进入新的稳定亲密阶段
结算对象结束：刘思琪
类型完成：是
结算结束：是
关系结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：关系，刘悠(兄)，刘思琪(妹妹)，信任边界，轻微受损，动作越过舒适距离，关系短暂紧张
结算对象结束：刘思琪
类型完成：是
结算结束：是
角色卡结算：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：角色卡，性格，增加，边界感更强，面对越界动作紧张防备，偏向退缩
结算对象结束：刘思琪
类型完成：是
结算结束：是`, { requestedTypes: ['性历史', '关系', '角色卡'], participants, store, config: loop.realConfig() });
  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['性历史', '关系', '角色卡']));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'sexual-history'));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'relationship'));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'role-card'));
});

test('buildGroupedUpdateJsonPrompt requires full checks and avoids empty-only wording', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const prompt = await loop.buildGroupedUpdateJsonPrompt({
    store: makeStore(),
    action: '观察',
    base: '基础',
    loaded: [],
    narration: '正文确认出现变化。',
    groupKey: 'metrics',
    selectedSkills: ['emotion', 'feeling'],
    config: loop.realConfig(),
    trace: [],
  });
  assert.ok(prompt.includes('必须完整检查本组允许的所有更新类型'));
  assert.ok(prompt.includes('凡阶段2正文已经确认的变化都必须返回'));
  assert.ok(prompt.includes('只有本组无明确变化才返回 {"genericUpdates":[]}'));
  assert.ok(!prompt.includes('输出格式只允许：{"genericUpdates":[]}'));
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

test('worldSocialInventory rejects values scoped metrics intimacy bodyStatus and profile wearing while allowing world fields', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const group = loop.stage3UpdateGroups().worldSocialInventory;
  const patch = loop.filterGroupedUpdatePatch({
    genericUpdates: [
      { updateType: 'generic', field: 'values.intimacy.sexualHistory.virginityStatus', value: 'known' },
      { updateType: 'generic', field: 'values.bodyStatus.mouth', value: 'dry' },
      { updateType: 'generic', field: 'values.metrics.emotions', value: { happy: 1 } },
      { updateType: 'generic', field: 'values.wearing.0.state', value: '被推开' },
      { updateType: 'generic', field: 'values.wearing.items', value: [{ name: '外套' }] },
      { updateType: 'role-card', field: 'profile.wearing', value: ['外套'] },
      { updateType: 'role-card', field: 'profile.wearingItems', value: [{ name: '外套' }] },
      { updateType: 'role-card', field: 'profile.title', value: '侦探' },
      { updateType: 'map', field: 'values.map.note', value: '小巷有新线索' },
    ],
  }, group);

  assert.deepStrictEqual(patch.genericUpdates.map((item) => item.field), ['profile.title', 'values.map.note']);
});

test('grouped patch filtering keeps legacy world arrays only for worldSocialInventory', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const groups = loop.stage3UpdateGroups();
  const legacyPatch = {
    genericUpdates: [],
    itemActions: [{ action: 'add', itemName: '钥匙' }],
    lexiconUpdates: [{ name: '词条' }],
    factionUpdates: [{ action: 'addFactionPosition' }],
    wechatActions: [{ action: 'sendIncomingNow' }],
    mapNodes: [{ name: '新节点' }],
    newLocations: [{ name: '新地点' }],
    locationDescriptionUpdates: [{ locationName: '新地点', text: '描述' }],
  };

  const metricsPatch = loop.filterGroupedUpdatePatch(legacyPatch, groups.metrics);
  const worldPatch = loop.filterGroupedUpdatePatch(legacyPatch, groups.worldSocialInventory);
  const merged = loop.mergeGroupedUpdatePatches([metricsPatch, worldPatch], {});

  ['itemActions', 'lexiconUpdates', 'factionUpdates', 'wechatActions', 'mapNodes', 'newLocations', 'locationDescriptionUpdates'].forEach((key) => {
    assert.strictEqual(merged[key].length, 1, `${key} should only come from worldSocialInventory`);
  });
});

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
  assert.strictEqual(store.__npc.profile.wearing[0].state, '仍穿着但被推开，胸部外露');
});

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

test('generateConfiguredFinal merges base fields with Stage4 sliding patch', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = {
    buildLoadedText: () => '',
    limit: (text) => String(text || ''),
  };
  let slidingCalls = 0;
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只结算正文确认对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n结算边界：只结算正文确认对象。';
    if (streamToUi) return '你完成了本次行动范围内的直接动作，对方作出即时反应。';
    if (cfg?.sourceTitle?.includes('阶段3A')) return '{"elapsedSeconds":180,"status":"测试状态","quest":"测试目标","choices":["一","二","三","四"],"sceneTitle":"测试标题","locationName":"测试地点"}';
    return '';
  };
  loop.completeConfiguredSettlementKvWindow = async () => {
    slidingCalls += 1;
    return { type: 'final', elapsedSeconds: 180, status: '测试状态', quest: '测试目标', choices: ['一', '二', '三', '四'], sceneTitle: '测试标题', locationName: '测试地点', genericUpdates: [{ updateType: 'wearing-state', subject: { type: 'character', id: 'rushiqi', name: '刘思琪' }, field: 'values.wearing', change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开' }] }, reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认', confidence: 'confirmed' }] }] };
  };
  const out = await loop.generateConfiguredFinal({ store, action: '行动', base: '基础', loaded: [], skills: '', trace: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'direct-target' }] }], materialSession: null, logId: null, config });
  assert.strictEqual(out.result.elapsedSeconds, 180);
  assert.strictEqual(out.result.status, '测试状态');
  assert.strictEqual(out.result.genericUpdates.length, 1);
  assert.strictEqual(slidingCalls, 1);
});

test('generateConfiguredFinal uses Stage4 sliding settlement and skips legacy grouped path when sliding succeeds', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };
  let slidingCalls = 0;
  let legacyCalls = 0;
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只结算正文确认对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n结算边界：只结算正文确认对象。';
    if (streamToUi) return '正文确认刘思琪紧张。';
    if (cfg?.sourceTitle?.includes('阶段3A')) return '{"elapsedSeconds":180,"status":"测试状态","quest":"测试目标","choices":["一","二","三","四"],"sceneTitle":"测试标题","locationName":"测试地点"}';
    return '';
  };
  loop.completeConfiguredSettlementKvWindow = async () => {
    slidingCalls += 1;
    return { type: 'final', elapsedSeconds: 180, status: '滑动结算状态', quest: '滑动结算目标', choices: ['一', '二', '三', '四'], sceneTitle: '滑动标题', locationName: '滑动地点', genericUpdates: [{ updateType: 'emotion', subject: { type: 'character', id: 'rushiqi', name: '刘思琪' }, field: 'metrics.emotions.紧张', change: { mode: 'delta', value: 1 }, reasons: [] }] };
  };
  loop.completeGroupedStage3Updates = async () => { legacyCalls += 1; return { type: 'final', genericUpdates: [] }; };

  const out = await loop.generateConfiguredFinal({ store, action: '行动', base: '基础', loaded: [], skills: '', trace: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'direct-target' }] }], materialSession: null, logId: null, config });

  assert.strictEqual(slidingCalls, 1);
  assert.strictEqual(legacyCalls, 0);
  assert.strictEqual(out.result.status, '滑动结算状态');
  assert.strictEqual(out.result.genericUpdates.length, 1);
});

test('generateConfiguredFinal reuses computed Stage 3 participants across groups', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };
  let participantCalls = 0;
  const originalStageParticipants = loop.stageParticipants.bind(loop);
  loop.stageParticipants = (...args) => {
    participantCalls += 1;
    return originalStageParticipants(...args);
  };
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只结算正文确认对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n结算边界：只结算正文确认对象。';
    if (streamToUi) return '正文。';
    if (cfg?.sourceTitle?.includes('阶段3A')) return '{"elapsedSeconds":180,"status":"测试状态","quest":"测试目标","choices":["一","二","三","四"],"sceneTitle":"测试标题","locationName":"测试地点"}';
    return '{"genericUpdates":[]}';
  };
  loop.completeConfiguredUpdateJson = async () => ({ genericUpdates: [] });

  await loop.generateConfiguredFinal({
    store,
    action: '行动',
    base: '基础',
    loaded: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪' }] }],
    skills: '',
    trace: [],
    materialSession: null,
    logId: null,
    config,
  });

  assert.strictEqual(participantCalls, 1);
});

test('Stage 3 contexts do not settle loaded role cards when trace participants are empty', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const loaded = [{ title: '结构化资料缓存', text: '资料正文可能被压缩或引用替换。', participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'loaded-role-card' }] }];
  const participants = loop.stageParticipants([], loaded, store);
  const contextPack = loop.buildUpdateContextPack({ store, action: '普通行动', base: '基础', loaded, narration: '正文没有写刘思琪实际入场。', trace: [], groupKey: 'metrics', config: loop.realConfig() });
  assert.strictEqual(JSON.stringify(participants), JSON.stringify([]));
  assert.ok(contextPack.includes('加载角色卡不等于参与或结算'));
  assert.ok(!contextPack.includes('rushiqi:刘思琪:emotions='));
});

test('Stage 3 participants include forced participants but exclude candidates and forbidden roles', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = loop.stageParticipants([{ participants: [{ type: 'player', id: 'player-self', name: '玩家', role: 'actor' }], forcedParticipants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }], priorityCandidates: [{ type: 'character', id: 'liusiyi', name: '刘思怡', role: 'priority-candidate', canSettle: false }], forbiddenParticipants: [{ type: 'character', id: 'boss', name: '王主管', role: 'forbidden', canSettle: false }] }], [], store);
  assert.strictEqual(JSON.stringify(participants.map((item) => item.name)), JSON.stringify(['玩家', '刘思琪']));
});

test('Stage 3 participants sanitize trace participants that duplicate candidate forbidden background and random roles', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const trace = [{
    participants: [
      { type: 'player', id: 'player-self', name: '玩家', role: 'actor' },
      { type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' },
      { type: 'character', id: 'liusiyi', name: '刘思怡', role: 'direct-target' },
      { type: 'character', id: 'boss', name: '王主管', role: 'direct-target' },
      { type: 'character', id: 'passer', name: '路人甲', role: 'direct-target' },
      { type: 'character', id: 'random', name: '随机角色', role: 'direct-target' },
    ],
    priorityCandidates: [{ name: '刘思怡' }],
    forbiddenParticipants: [{ name: '王主管' }],
    dramaCandidates: [{ name: '路人甲' }],
    randomActiveEvents: [{ characterName: '随机角色' }],
  }];

  const participants = loop.stageParticipants(trace, [], store);

  assert.strictEqual(JSON.stringify(participants.map((item) => item.name)), JSON.stringify(['玩家', '刘思琪']));
});

test('Stage 3 participants keep forced participants even when also listed as candidates or random events', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = loop.stageParticipants([{
    forcedParticipants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }],
    priorityCandidates: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'priority-candidate' }],
    randomActiveEvents: [{ id: 'rushiqi', characterName: '刘思琪' }],
  }], [], store);
  assert.strictEqual(JSON.stringify(participants.map((item) => item.name)), JSON.stringify(['刘思琪']));
});

test('real world materials mention Chinese requests, scene anchoring, and Top3 role card rule', () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompts/materials/real-world-materials.js');
  const text = JSON.stringify(context.window.GameModules.realWorldMaterials || {});
  assert.ok(text.includes('中文资料请求'));
  assert.ok(text.includes('场景锚定'));
  assert.ok(text.includes('Top3'));
  assert.ok(text.includes('加载角色卡不等于出场或结算'));
  assert.ok(text.includes('不得输出英文 skill/method'));
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
