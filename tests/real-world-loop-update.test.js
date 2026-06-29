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
  assert.ok(prompt.includes('missingContext'));
  assert.ok(prompt.includes('requests 仅为兼容旧模板可选'));
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
  assert.ok(prompt.includes('身体感受'));
  assert.ok(prompt.includes('可见细节'));
  assert.ok(prompt.includes('对话回应'));
  assert.ok(prompt.includes('不替玩家执行下一步新行动'));
  assert.ok(prompt.includes('不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮'));
  assert.ok(prompt.includes('不要换行符'));
});

test('parseStep normalizes participants into trace items', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep('{"type":"request_context","participants":["刘思琪",{"type":"character","id":"npc-1","name":"赵敏","role":"direct"}],"requests":[],"needed":[],"characters":[]}', loop.realConfig());
  const traced = loop.traceItem(1, data, '{"type":"request_context"}', context.window.GameModules.realWorldAgentContext);
  assert.strictEqual(data.participants.length, 2);
  assert.strictEqual(data.participants[0].name, '刘思琪');
  assert.strictEqual(traced.participants.length, 2);
  assert.strictEqual(traced.participants[1].role, 'direct');
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

  assert.strictEqual(JSON.stringify(participants), JSON.stringify([
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

  assert.strictEqual(JSON.stringify(participants), JSON.stringify([
    { type: 'character', id: 'rushiqi', name: '刘思琪', role: 'character-role-card' },
  ]));
});

test('parseStep derives requests from needed and keeps missingContext boolean', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep('{"type":"request_context","participants":["刘思琪"],"needed":["character:刘思琪","location:测试地点"],"missingContext":true,"reason":"需要上下文"}', loop.realConfig());
  const emptyRequests = loop.parseStep('{"type":"request_context","participants":["刘思琪"],"requests":[],"needed":["character:刘思琪"],"missingContext":true,"reason":"需要上下文"}', loop.realConfig());
  const traced = loop.traceItem(1, data, '{"type":"request_context"}', context.window.GameModules.realWorldAgentContext);
  assert.deepStrictEqual(data.needed, ['character:刘思琪', 'location:测试地点']);
  assert.deepStrictEqual(data.requests, ['character:刘思琪', 'location:测试地点']);
  assert.deepStrictEqual(emptyRequests.requests, ['character:刘思琪']);
  assert.strictEqual(data.missingContext, true);
  assert.strictEqual(traced.missingContext, true);
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

test('Stage 3 contexts include structured loaded role-card participants when trace participants are empty', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const loaded = [{
    title: '结构化资料缓存',
    text: '资料正文可能被压缩或引用替换，不保证保留角色ID和姓名标签。',
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'loaded-role-card' }],
  }];
  store.rpgVitals = (state) => state.id === 'rushiqi'
    ? [{ key: 'fatigue', label: '疲劳度', value: 20, text: '20/100' }]
    : [{ key: 'stamina', label: '精力', value: 88, text: '84/96' }];

  const contextFor = (groupKey) => loop.buildUpdateContextPack({
    store,
    action: '我前往妹妹刘思琪的房间，紧紧抱住妹妹。',
    base: '基础',
    loaded,
    narration: '刘思琪身体放松回应怀抱。',
    trace: [],
    groupKey,
    config: loop.realConfig(),
  });
  const survival = contextFor('survival');
  const metrics = contextFor('metrics');
  const bodySex = contextFor('bodySex');

  assert.ok(survival.includes('player-self'));
  assert.ok(survival.includes('rushiqi:刘思琪:vitals='));
  assert.ok(survival.includes('"fatigue"'));
  assert.ok(metrics.includes('rushiqi:刘思琪:emotions='));
  assert.ok(bodySex.includes('rushiqi:刘思琪:bodyStatus='));
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
