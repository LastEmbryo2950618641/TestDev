const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function installStage9Prompts(context) {
  context.window.GameModules.promptTemplates = { inline: {} };
  ['stage9-1-faction-create.js', 'stage9-2-faction-update.js'].forEach((name) => {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/prompts/推演引擎', name), 'utf8'), context, { filename: `publish/prompts/推演引擎/${name}` });
  });
  context.window.GameModules.renderPrompt = async (id, vars = {}) => String(context.window.GameModules.promptTemplates.inline[id] || '').replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(vars, String(key).trim()) ? String(vars[String(key).trim()]) : match
  ));
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

test('Stage9 prompts use direct JSON arrays with official example marker', () => {
  const root = path.join(__dirname, '..');
  const createMd = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage9-1-faction-create.md'), 'utf8');
  const updateMd = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage9-2-faction-update.md'), 'utf8');
  assert.ok(createMd.includes('Stage9-1 势力完整创建'));
  assert.ok(updateMd.includes('Stage9-2 势力字段更新'));
  assert.ok(createMd.includes('EXAMPLE JSON OUTPUT:'));
  assert.ok(updateMd.includes('EXAMPLE JSON OUTPUT:'));
  assert.ok(createMd.includes('JSON 容器最多四层'));
  assert.ok(updateMd.includes('JSON 容器最多四层'));
  assert.ok(createMd.includes('一次补全每个势力的完整信息'));
  assert.ok(updateMd.includes('明显不合理、空白、占位、壳化'));
  assert.ok(updateMd.includes('当前字段已经具体、合理、成型'));
  assert.ok(!createMd.includes('createFactionDraft'));
  assert.ok(!updateMd.includes('patchFactionDraft'));
  const runtime = fs.readFileSync(path.join(root, 'publish/inference/faction-stage-update.js'), 'utf8');
  assert.ok(runtime.includes('inference-stage9-faction-create'));
  assert.ok(runtime.includes('inference-stage9-faction-update'));
  assert.ok(!runtime.includes('createFactionDraft'));
  assert.ok(!runtime.includes('patchFactionDraft'));
  const bootScripts = fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8');
  const bootManifest = fs.readFileSync(path.join(root, 'publish/boot/script-manifest.js'), 'utf8');
  assert.ok(bootScripts.includes('stage9-1-faction-create.js'));
  assert.ok(bootScripts.includes('stage9-2-faction-update.js'));
  assert.ok(bootManifest.includes('stage9-1-faction-create.js'));
  assert.ok(bootManifest.includes('stage9-2-faction-update.js'));
  assert.ok(!bootScripts.includes('stage6-faction-update.js'));
  assert.ok(!bootManifest.includes('stage6-faction-update.js'));
});

test('Stage9-1 independently rechecks full context and requests complete faction JSON', async () => {
  const context = vm.createContext({
    console,
    Set,
    Map,
    Date,
    JSON,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  installStage9Prompts(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/inference/faction-stage-update.js'), 'utf8'), context, { filename: 'publish/inference/faction-stage-update.js' });
  const stage = context.window.GameModules.inferenceFactionStageUpdate;
  const prompt = await stage.buildCreatePrompt({
    action: '前往刘思琪房间',
    narration: '刘思琪把英语作业放到桌边。',
    factionIndex: '暂无势力。',
    pendingFactionCandidates: [],
    contextReview: '角色卡：刘思琪是某中学学生；刘悠任职于成都市高新区科创有限公司。',
  });
  assert.ok(prompt.includes('即使 Stage1 候选为空'));
  assert.ok(prompt.includes('重新检查本轮完整上下文'));
  assert.ok(prompt.includes('角色卡：刘思琪是某中学学生'));
  assert.ok(prompt.includes('一次补全每个势力的完整信息'));
  assert.ok(prompt.includes('EXAMPLE JSON OUTPUT:'));
  assert.ok(prompt.includes('JSON 容器最多四层'));
  assert.ok(prompt.includes('面板 key 只使用'));
  assert.ok(!prompt.includes('createFactionDraft'));
});

test('Stage9 direct arrays map complete factions and patches to storage operations', () => {
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
  installStage9Prompts(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/inference/faction-stage-update.js'), 'utf8'), context, { filename: 'publish/inference/faction-stage-update.js' });
  const stage = context.window.GameModules.inferenceFactionStageUpdate;
  const store = { factionState: { factions: [] } };
  const created = stage.applyItems(store, [{
      id: 'force-school',
      candidate: '某中学',
      name: '成都市明德初级中学',
      type: '学校',
      class: 'faction',
      structure: ['校务处|校长,教导主任'],
      econ: { income: '财政拨款', orgs: ['总务处|负责后勤保障'] },
      ter: { regions: ['校本部|武侯区|约3公顷|稳定|约1500人|教学区域|保安室'] },
  }], 'create');
  assert.strictEqual(created.applied[0].method, 'createFaction');
  assert.ok(created.applied[0].params.solid.overviewPanels.economy.entries.income);
  assert.ok(created.applied[0].params.solid.overviewPanels.territory.entries.regions);
  assert.strictEqual(created.applied[0].params.structure[0].roles[0].title, '校长');
  assert.strictEqual(created.applied[0].params.solid.overviewPanels.economy.entries.institutions.value[0].description, '负责后勤保障');
  assert.strictEqual(created.applied[0].params.solid.overviewPanels.territory.entries.regions.value[0].capital, '武侯区');
  store.factionState.factions[0].solid = created.applied[0].params.solid;
  const patched = stage.applyItems(store, [{
      id: 'force-school',
      field: 'econ.income',
      op: 'set',
      value: '新增校企合作',
      reason: '正文提到合作项目',
  }], 'update');
  assert.strictEqual(patched.applied[0].method, 'patchFactionField');
  assert.strictEqual(patched.applied[0].params.panel, 'economy');
  assert.strictEqual(patched.applied[0].params.field, 'income');
});

test('Stage9 rejects malformed JSON arrays instead of silently returning no operations', () => {
  const context = vm.createContext({ console, Set, Map, Date, JSON, window: { GameModules: {} } });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/inference/faction-stage-update.js'), 'utf8'), context, { filename: 'publish/inference/faction-stage-update.js' });
  const stage = context.window.GameModules.inferenceFactionStageUpdate;
  assert.throws(() => stage.parseArrayPayload('[{"name":"中华人民共和国",members:[]}]'), /JSON 数组解析失败/);
});


test('createFaction writes every draft and replaces an existing matching id', () => {
  const ctx = loadFactionQuery();
  const store = {
    factionState: { factions: [] },
    initFactionSystem() {},
    phoneDate() { return new Date('2026-07-31T10:00:00.000Z'); },
    factionIdByName(name = '') { return `force-${String(name || '').trim()}`; },
    factionParentName() { return ''; },
    normalizeFactionStructure(faction) { return faction; },
    completeFactionReasons(_faction, reasons = {}, _reason = '') { return reasons; },
  };

  const familyText = ctx.createFaction(store, {
    id: 'force-family-liu',
    name: '刘悠家庭',
    type: '家庭',
    kind: 'family',
    classification: 'community',
    worldTag: '2026现代都市现实世界',
    level: '家庭',
    location: '成都市武侯区锦苑小区3栋2单元601号',
    domain: '家庭生活',
    scale: '成员5人',
    stance: '中立',
    influence: 10,
    description: '家庭组织',
    relations: [
      { target: '成都市高新区科创有限公司', type: '雇佣' },
      { target: '成都市锦苑中学', type: '就学' },
    ],
    solid: { overviewPanels: fullOverviewPanels() },
    reason: '测试创建家庭',
  });
  assert.ok(String(familyText).includes('已创建势力'));
  assert.strictEqual(store.factionState.factions.length, 1);

  const companyText = ctx.createFaction(store, {
    id: 'force-company-tech',
    name: '成都市高新区科创有限公司',
    type: '企业',
    classification: 'faction',
    worldTag: '2026现代都市现实世界',
    level: '公司',
    location: '成都市高新区',
    domain: '软件与信息技术服务',
    scale: '中型企业',
    stance: '中立',
    influence: 40,
    description: '科技企业',
    solid: { overviewPanels: fullOverviewPanels() },
    reason: '测试创建公司',
  });
  assert.ok(String(companyText).includes('已创建势力'));

  const schoolText = ctx.createFaction(store, {
    id: 'force-school-jinyuan',
    name: '成都市锦苑中学',
    type: '学校',
    classification: 'faction',
    worldTag: '2026现代都市现实世界',
    level: '初级中学',
    location: '成都市武侯区',
    domain: '初中教育',
    scale: '在校学生约1500人',
    stance: '中立',
    influence: 25,
    description: '公立中学',
    solid: { overviewPanels: fullOverviewPanels() },
    reason: '测试创建学校',
  });
  assert.ok(String(schoolText).includes('已创建势力'));
  assert.strictEqual(store.factionState.factions.length, 3);
  assert.deepStrictEqual(
    store.factionState.factions.map((item) => item.name),
    ['刘悠家庭', '成都市高新区科创有限公司', '成都市锦苑中学'],
  );

  const replacementText = ctx.createFaction(store, {
    id: 'force-company-tech',
    name: '成都高新区科创公司',
    type: '企业',
    classification: 'faction',
    description: '更新后的公司资料',
    solid: { overviewPanels: fullOverviewPanels() },
    reason: '相同 ID 覆盖',
  });
  assert.ok(String(replacementText).includes('已覆盖势力'));
  assert.strictEqual(store.factionState.factions.length, 3);
  assert.strictEqual(store.factionState.factions[1].name, '成都高新区科创公司');
  assert.strictEqual(store.factionState.factions[1].description, '更新后的公司资料');
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
  installStage9Prompts(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/inference/faction-stage-update.js'), 'utf8'), context, { filename: 'publish/inference/faction-stage-update.js' });
  const stage = context.window.GameModules.inferenceFactionStageUpdate;
  const store = { factionState: { factions: [] }, initFactionSystem() {} };
  const prompts = [];
  const requestOptions = [];
  const loop = {
    completeCachedJsonPrompt: async (_store, options) => {
      prompts.push(options.prompt);
      requestOptions.push(options);
      if (prompts.length === 1) return JSON.stringify([{ id: 'force-pending-tech', candidate: '成都市高新区科创有限公司', name: '成都市高新区科创有限公司', type: '公司', class: 'faction', world: '2026现代都市现实世界', structure: ['管理层|负责人'], econ: { income: '项目收入' } }]);
      return JSON.stringify([{ id: 'force-pending-tech', field: 'desc', op: 'set', value: '新增组织说明', reason: '正文确认' }]);
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
  assert.ok(prompts[0].includes('Stage9-1 势力完整创建'));
  assert.ok(prompts[0].includes('Stage1 查询链与场景锚定完整上下文'));
  assert.ok(prompts[1].includes('Stage9-2 势力字段更新'));
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





