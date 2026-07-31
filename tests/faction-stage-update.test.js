const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadFactionQuery() {
  const context = vm.createContext({
    console,
    Set,
    Map,
    Date,
    JSON,
    window: {
      GameModules: {
        orgTerritory: {
          resolveFactionWorldTag: (f, store) => f.worldTag || store?.currentWorldTag?.() || '测试世界',
          normalizeFaction: (f) => f,
          normalizeOverviewPanels: (p) => p || {},
          normalizeOverviewField: (raw) => raw,
          overviewFieldSchema: () => ({ kind: 'text' }),
          normalizeOverviewEntryValue: (_panel, _field, value) => value,
          ideologyFixedKeys: () => ['core', 'reason', 'description', 'base', 'legitimacy'],
          economyFixedKeys: () => ['institutions', 'laws', 'works'],
          defaultOverviewPanels: () => ({
            ideology: {},
            economy: { entries: {} },
            politics: { entries: {} },
            military: { entries: {} },
            diplomacy: { entries: {} },
            territory: { entries: {} },
          }),
        },
        realWorldAgentContext: {},
      },
    },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/prompts/materials/real-world-faction-query.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/prompts/materials/real-world-faction-query.js' });
  return context.window.GameModules.realWorldAgentContext;
}

function fullOverviewPanels() {
  const field = (value = '已根据上下文补全') => ({ value, reason: '测试依据' });
  const nameList = [{ name: '测试机构', description: '测试职责' }];
  const relationList = [{ name: '测试对象', description: '测试关系', viewOfSelf: '视为普通合作方' }];
  return {
    ideology: {
      core: field('商业导向'),
      reason: field('由组织目标形成'),
      description: field('以持续运作为核心'),
      base: field('成员与岗位协作'),
      legitimacy: { value: 50, unit: '/100', reason: '测试依据' },
    },
    economy: { entries: {
      gdp: field('非国家组织不适用，按营收规模评估'),
      income: field('项目收入'),
      expenditure: field('薪酬与运营支出'),
      assets: field('办公资产与知识产权'),
      resources: field('人力与技术资源'),
      production: field('软件交付'),
      system: field('市场化公司制度'),
      institutions: { value: nameList, reason: '测试依据' },
      laws: { value: nameList, reason: '测试依据' },
      works: { value: nameList, reason: '测试依据' },
    } },
    politics: { entries: {
      regime: field('公司治理'),
      powerStructure: field('管理层负责'),
      rulemaking: field('制度由管理层制定'),
      adjudication: field('内部流程处理'),
      execution: field('部门执行'),
      participation: field('员工参与有限'),
      leadership: field('负责人管理'),
      institutions: { value: nameList, reason: '测试依据' },
      laws: { value: nameList, reason: '测试依据' },
      works: { value: nameList, reason: '测试依据' },
    } },
    military: { entries: {
      posture: field('无军事职能'),
      forces: { value: [{ name: '无武装力量', items: ['仅办公安保'] }], reason: '测试依据' },
      personnel: field('无军事人员'),
      quality: field('无战备要求'),
      sustainment: field('无军事后勤'),
      projection: field('无投送能力'),
      equipment: field('无军事装备'),
      institutions: { value: nameList, reason: '测试依据' },
      laws: { value: nameList, reason: '测试依据' },
      works: { value: nameList, reason: '测试依据' },
    } },
    diplomacy: { entries: {
      posture: field('客户合作导向'),
      orientation: field('市场合作'),
      allies: { value: relationList, reason: '测试依据' },
      rivals: { value: relationList, reason: '测试依据' },
      memberships: { value: nameList, reason: '测试依据' },
      treaties: { value: nameList, reason: '测试依据' },
      presence: field('本地业务网络'),
      institutions: { value: nameList, reason: '测试依据' },
      laws: { value: nameList, reason: '测试依据' },
      works: { value: nameList, reason: '测试依据' },
    } },
    territory: { entries: {
      capital: field('无首都，办公地为核心地点'),
      area: field('办公区域规模'),
      population: field('员工规模'),
      adminDivision: field('公司部门层级'),
      regions: { value: [{ name: '办公区域', capital: '无', area: '办公区', controlRate: '内部管理', population: '员工', description: '日常办公空间', garrison: '无' }], reason: '测试依据' },
    } },
  };
}

test('UI no longer exposes manual generateFactionsByAI button', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'publish/index.html'), 'utf8');
  assert.ok(!html.includes('generateFactionsByAI()'));
  assert.ok(!html.includes('初始化/全量检视势力'));
});

test('Stage4 settlement queue drops faction overview/structure/panel types', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'publish/real-world-agent-loop.js'), 'utf8');
  const match = script.match(/settlementTypeQueue[\s\S]*?return \(story/);
  assert.ok(match, 'settlementTypeQueue present');
  const block = match[0];
  assert.ok(!block.includes("'势力总览'"), '势力总览 moved out of Stage4');
  assert.ok(!block.includes("'势力结构'"), '势力结构 moved out of Stage4');
  assert.ok(!block.includes("'组织能力'"), '组织能力 moved out of Stage4');
});

test('faction skill supports createFaction / patchFactionField / getFactionField', () => {
  const ctx = loadFactionQuery();
  const store = {
    factionState: { factions: [] },
    initFactionSystem() {},
    currentWorldTag: () => '测试世界',
    phoneDate: () => new Date('2026-07-24T00:00:00.000Z'),
    factionIdByName: (name) => 'force-' + name,
    completeFactionReasons: () => ({}),
    normalizeFactionStructure: (f) => f,
    factionParentName: () => '无',
  };
  const created = ctx.createFaction(store, {
    id: 'country-test',
    name: '测试国',
    type: '国家',
    classification: 'country',
    worldTag: '测试世界',
    description: '完整创建',
    solid: {
      overviewPanels: {
        ideology: { core: { value: '国体A' } },
        economy: { entries: { institutions: { value: [{ name: '央行', description: '货币' }] } } },
      },
    },
    reason: '正文确认',
  });
  assert.ok(String(created).includes('已创建势力'));
  assert.strictEqual(store.factionState.factions.length, 1);
  assert.strictEqual(store.factionState.factions[0].id, 'country-test');

  const field = ctx.getFactionField(store, { id: 'country-test', panel: 'economy', field: 'institutions' });
  assert.ok(String(field).includes('央行'));

  ctx.patchFactionField(store, {
    id: 'country-test',
    panel: 'economy',
    field: 'institutions',
    op: 'append',
    value: { name: '财政部', description: '财政' },
    reason: '追加',
  });
  const list = store.factionState.factions[0].solid.overviewPanels.economy.entries.institutions.value;
  assert.strictEqual(list.length, 2);

  ctx.patchFactionField(store, {
    id: 'country-test',
    panel: 'economy',
    field: 'institutions',
    op: 'delete',
    index: 0,
    reason: '删除',
  });
  assert.strictEqual(store.factionState.factions[0].solid.overviewPanels.economy.entries.institutions.value[0].name, '财政部');

  ctx.patchFactionField(store, {
    id: 'country-test',
    panel: 'ideology',
    field: 'core',
    op: 'set',
    value: '国体B',
    reason: '覆盖',
  });
  assert.strictEqual(store.factionState.factions[0].solid.overviewPanels.ideology.core.value, '国体B');
});

test('listFactions default text includes id and structure', () => {
  const ctx = loadFactionQuery();
  const store = {
    factionState: {
      factions: [{
        id: 'country-test',
        name: '测试国',
        type: '国家',
        level: '国家级',
        parentName: '无势力归属',
        worldTag: '测试世界',
        structure: [{ name: '内阁', roles: [{ title: '首相', characters: ['未知'] }] }],
      }],
    },
    initFactionSystem() {},
    factionParentName: () => '无势力归属',
    normalizeFactionRoles: (roles) => roles,
  };
  const text = ctx.factionList(store);
  assert.ok(text.includes('country-test'));
  assert.ok(text.includes('测试国'));
  assert.ok(text.includes('内阁') || text.includes('组织架构'));
});

test('Stage9 prompt is split into create and update phases', () => {
  const root = path.join(__dirname, '..');
  const md = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage6-faction-update.md'), 'utf8');
  assert.ok(md.includes('Stage9-1 势力创建'));
  assert.ok(md.includes('Stage9-2 势力更新'));
  assert.ok(md.includes('只允许输出 `createFactionDraft`'));
  assert.ok(md.includes('只允许输出 `patchFactionDraft`'));
  assert.ok(md.includes('明显不合理、空白、占位、壳化'));
  assert.ok(md.includes('当前字段已经具体、合理、成型'));
  const runtime = fs.readFileSync(path.join(root, 'publish/inference/faction-stage-update.js'), 'utf8');
  assert.ok(runtime.includes('buildCreatePrompt'));
  assert.ok(runtime.includes('buildUpdatePrompt'));
  assert.ok(runtime.includes('Stage9-1 势力创建'));
  assert.ok(runtime.includes('Stage9-2 势力更新'));
  assert.ok(runtime.includes('当前势力完整快照'));
  assert.ok(runtime.includes('明显不合理、空白、占位、壳化'));
});

test('Stage9-1 independently rechecks full context and requests batch creation JSON', () => {
  const context = vm.createContext({
    console,
    Set,
    Map,
    Date,
    JSON,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/inference/faction-stage-update.js'), 'utf8'), context, { filename: 'publish/inference/faction-stage-update.js' });
  const stage = context.window.GameModules.inferenceFactionStageUpdate;
  const prompt = stage.buildCreatePrompt({
    action: '前往刘思琪房间',
    narration: '刘思琪把英语作业放到桌边。',
    factionIndex: '暂无势力。',
    pendingFactionCandidates: [],
    contextReview: '角色卡：刘思琪是某中学学生；刘悠任职于成都市高新区科创有限公司。',
  });
  assert.ok(prompt.includes('即使 Stage1 候选为空'));
  assert.ok(prompt.includes('重新检查本轮完整上下文'));
  assert.ok(prompt.includes('角色卡：刘思琪是某中学学生'));
  assert.ok(prompt.includes('一次性批量'));
  assert.ok(prompt.includes('createFactionDraft'));
  assert.ok(prompt.includes('必须沿用该 id'));
  assert.ok(prompt.includes('短 English key'));
  assert.ok(prompt.includes('panel key 只用'));
  assert.ok(prompt.includes('reason 在 Stage9-1 可省略'));

});

test('Stage9 createFaction rejects overviewPanels that do not match UI schema', () => {
  const context = vm.createContext({
    console,
    Set,
    Map,
    Date,
    JSON,
    window: {
      GameModules: {
        realWorldAgentContext: {
          faction: (store, method, params) => {
            store.factionState.factions.push({ id: params.id, name: params.name });
            return '已创建势力';
          },
        },
      },
    },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/inference/faction-stage-update.js'), 'utf8'), context, { filename: 'publish/inference/faction-stage-update.js' });
  const stage = context.window.GameModules.inferenceFactionStageUpdate;
  const store = { factionState: { factions: [] } };
  const result = stage.applyOps(store, [{
    method: 'createFaction',
    params: {
      id: 'force-bad',
      name: '错形状势力',
      solid: {
        overviewPanels: {
          ideology: { value: '技术创新驱动' },
          economy: { entries: { 主要收入: '软件定制开发' } },
          teritory: { entries: { 办公地点: '高新区' } },
        },
      },
    },
  }]);
  assert.strictEqual(store.factionState.factions.length, 0);
  assert.ok(result.lines[0].includes('拒绝不完整 createFaction'));
  assert.ok(result.lines[0].includes('teritory'));
});

test('Stage9 draft ops map to final faction ops', () => {
  const context = vm.createContext({
    console,
    Set,
    Map,
    Date,
    JSON,
    window: {
      GameModules: {
        realWorldAgentContext: {
          faction: (store, method, params) => {
            if (method === 'createFaction') {
              store.factionState.factions.push({ id: params.id, name: params.name, solid: params.solid || {} });
              return '已创建势力';
            }
            if (method === 'patchFactionField') return '已更新势力';
            return 'noop';
          },
        },
      },
    },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/inference/faction-stage-update.js'), 'utf8'), context, { filename: 'publish/inference/faction-stage-update.js' });
  const stage = context.window.GameModules.inferenceFactionStageUpdate;
  const store = { factionState: { factions: [] } };
  const created = stage.applyOps(store, [{
    method: 'createFactionDraft',
    params: {
      id: 'force-school',
      candidate: '某中学',
      name: '成都市明德初级中学',
      type: '学校',
      class: 'faction',
      panels: {
        econ: { income: '财政拨款', orgs: ['总务处'] },
        ter: { regions: ['校本部'] },
      },
    },
  }]);
  assert.strictEqual(created.applied[0].method, 'createFaction');
  assert.ok(created.applied[0].params.solid.overviewPanels.economy.entries.income);
  assert.ok(created.applied[0].params.solid.overviewPanels.territory.entries.regions);
  store.factionState.factions[0].solid = created.applied[0].params.solid;
  const patched = stage.applyOps(store, [{
    method: 'patchFactionDraft',
    params: {
      id: 'force-school',
      field: 'econ.income',
      op: 'set',
      value: '新增校企合作',
      reason: '正文提到合作项目',
    },
  }]);
  assert.strictEqual(patched.applied[0].method, 'patchFactionField');
  assert.strictEqual(patched.applied[0].params.panel, 'economy');
  assert.strictEqual(patched.applied[0].params.field, 'income');
});

test('Stage9 runs create phase before update phase', async () => {
  const context = vm.createContext({
    console,
    Set,
    Map,
    Date,
    JSON,
    window: {
      GameModules: {
        realWorldAgentContext: {
          factionList: (store) => (store.factionState.factions.length ? '已有势力：成都市高新区科创有限公司' : '已有势力：无'),
          faction: (store, method, params) => {
            if (method === 'createFaction') {
              store.factionState.factions.push({ id: params.id || params.name, name: params.name || '未命名势力' });
              return '已创建势力：' + (params.name || '');
            }
            if (method === 'patchFactionField') return '已更新势力：' + (params.id || 'unknown');
            return 'noop';
          },
        },
        realWorldMaterials: {
          pendingFactionCandidates: () => ([{ id: 'force-pending-tech', name: '成都市高新区科创有限公司', status: '待创建', type: '公司', worldTag: '2026现代都市现实世界' }]),
        },
      },
    },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/inference/faction-stage-update.js'), 'utf8'), context, { filename: 'publish/inference/faction-stage-update.js' });
  const stage = context.window.GameModules.inferenceFactionStageUpdate;
  const store = { factionState: { factions: [] }, initFactionSystem() {} };
  const prompts = [];
  const requestOptions = [];
  const loop = {
    completeCachedJsonPrompt: async (_store, options) => {
      prompts.push(options.prompt);
      requestOptions.push(options);
       if (prompts.length === 1) return JSON.stringify({ ops: [{ method: 'createFactionDraft', params: { id: 'force-pending-tech', candidate: '成都市高新区科创有限公司', name: '成都市高新区科创有限公司', type: '公司', class: 'faction', world: '2026现代都市现实世界', structure: [{ name: '管理层', members: ['负责人'] }], panels: { econ: { income: '项目收入' } } } }], done: true });
       return JSON.stringify({ ops: [{ method: 'patchFactionDraft', params: { id: 'faction-tech-company', field: 'desc', op: 'set', value: '新增组织说明', reason: '正文确认' } }], done: true });
    },
    markConfiguredStep() {},
    patchConfiguredSettlementThinking() {},
  };
  const result = await stage.runAfterSettlement({
    store,
    action: '去公司处理项目',
    narration: '刘悠准备去成都市高新区科创有限公司处理项目事务。',
    updates: {},
    participants: [],
    logId: 'test-log',
    config: { label: '现实', mode: 'real' },
    loop,
    materialSession: {},
    contextReview: 'Stage1 查询链与场景锚定完整上下文',
  });
  assert.strictEqual(prompts.length, 2);
  assert.ok(prompts[0].includes('Stage9-1 势力创建'));
  assert.ok(prompts[0].includes('Stage1 查询链与场景锚定完整上下文'));
  assert.ok(prompts[1].includes('Stage9-2 势力更新'));
  assert.ok(requestOptions[0].sourceTitle.includes('Stage9-1'));
  assert.ok(requestOptions[1].sourceTitle.includes('Stage9-2'));
  assert.strictEqual(result.ops.length, 2);
  assert.strictEqual(result.ops[0].method, 'createFaction');
  assert.strictEqual(result.ops[1].method, 'patchFactionField');
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





