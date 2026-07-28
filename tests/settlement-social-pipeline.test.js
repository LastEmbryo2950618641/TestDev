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
    characterStateStore: { save: async () => {} },
    initPromptRegistry: {
      skillText: () => '',
      schema: () => ({ initUpdates: [] }),
      canonicalSkillIds: (ids = []) => ids,
      ensureTemplateState(_template, state) {
        state.values = state.values || {};
      },
    },
  };
  return vm.createContext(context);
}

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relativePath });
}

function loadPipeline(context) {
  loadScript(context, 'publish/social-position.js');
  loadScript(context, 'publish/rpg-state.js');
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/update/generic-update-applier.js');
  loadScript(context, 'publish/update/membership-update.js');
  loadScript(context, 'publish/update/role-card-update.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  // minimal orgTerritory for membership apply
  context.window.GameModules.orgTerritory = {
    nowLabel: () => '2026-07-25',
    resolveOrgIdByName: () => '',
    normalizeMembership: (m) => ({
      ...m,
      displayLine: `${m.orgName || ''} / ${m.title || ''}`.trim(),
    }),
    upsertCharacterMembership(state, patch = {}) {
      const mem = this.normalizeMembership(patch);
      const list = Array.isArray(state.profile.memberships) ? state.profile.memberships : [];
      const idx = list.findIndex((m) => m.orgName === mem.orgName && m.title === mem.title);
      if (idx >= 0) list[idx] = { ...list[idx], ...mem };
      else list.push(mem);
      state.profile.memberships = list;
      return mem;
    },
    syncCharacterOrgMemberships(state) {
      state.profile.memberships = (state.profile.memberships || []).map((item) => ({ ...item }));
      return state;
    },
    findCharacterStateByName: () => null,
  };
  loadScript(context, 'publish/app/org-territory/settlement-actions.js');
}

function makeStore() {
  const player = {
    id: 'player-self',
    profile: { name: '刘悠', factions: [], memberships: [] },
    values: {},
  };
  return {
    playerName: '刘悠',
    playerProfile: { name: '刘悠' },
    rpgStates: { 'player-self': player },
    playerIdentityState: () => player,
    itemSkillState: (id) => (id === 'player-self' ? player : null),
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test('Stage4 JSON 人事归属 orgName/title 可解析并写 profile.memberships', () => {
  const context = createContext();
  loadPipeline(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'player', id: 'player-self', name: '刘悠' }];
  const parsed = loop.parseSettlementJson(JSON.stringify({
    人事归属: [{
      subject: '刘悠',
      orgName: '成都市高新区科创有限公司',
      title: '程序工程师',
      department: '研发部',
      departmentFog: false,
      state: 'sketch',
      reason: '正文确认入职该公司研发部',
    }],
  }), { requestedTypes: ['人事归属'], participants, store });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['人事归属']));
  assert.strictEqual(parsed.incompleteTypes.length, 0);
  assert.strictEqual(parsed.genericUpdates.length, 1);
  const update = parsed.genericUpdates[0];
  assert.strictEqual(update.updateType, 'membership');
  assert.strictEqual(update.field, 'profile.memberships');
  assert.strictEqual(update.change.mode, 'upsert');
  assert.strictEqual(update.change.value.orgName, '成都市高新区科创有限公司');
  assert.strictEqual(update.change.value.title, '程序工程师');

  const applied = context.window.GameModules.app.orgTerritory.settlementActions.applyMembershipUpdate(store, update);
  assert.strictEqual(applied.ok, true);
  const state = store.playerIdentityState();
  assert.strictEqual(state.profile.memberships[0].orgName, '成都市高新区科创有限公司');
  assert.strictEqual(state.profile.memberships[0].title, '程序工程师');
  assert.strictEqual(state.values.memberships, undefined);
});

test('Stage4 JSON 角色卡社群角色写入 profile.factions 而非中文幽灵字段', () => {
  const context = createContext();
  loadPipeline(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'player', id: 'player-self', name: '刘悠' }];
  const parsed = loop.parseSettlementJson(JSON.stringify({
    角色卡: [{
      subject: '刘悠',
      field: '社群角色',
      op: '增加',
      value: '刘家/长兄',
      reason: '正文确认家庭身份',
      result: '写入社群角色',
    }],
  }), { requestedTypes: ['角色卡'], participants, store });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['角色卡']));
  const update = parsed.genericUpdates[0];
  assert.strictEqual(update.updateType, 'role-card');
  assert.strictEqual(update.field, 'profile.factions');
  assert.ok(update.change.value.faction === '刘家' || update.change.value.community === '刘家');

  const ok = context.window.GameModules.updateRegistry.applyOne(store, update);
  assert.strictEqual(ok, true);
  const state = store.playerIdentityState();
  assert.ok(Array.isArray(state.profile.factions) && state.profile.factions.length >= 1);
  assert.strictEqual(state.profile['社群角色'], undefined);
  assert.strictEqual(state.values.factions, undefined);
});

test('旧 RPG 社群角色字段兼容转写到 profile', () => {
  const context = createContext();
  loadPipeline(context);
  const store = makeStore();
  const update = {
    updateType: 'role-card',
    subject: { id: 'player-self' },
    field: 'values.factions',
    change: { mode: 'set', value: [{ faction: '夜跑群', role: '成员', reason: '剧情确认。' }] },
  };

  assert.strictEqual(context.window.GameModules.updateRegistry.applyOne(store, update), true);
  const state = store.playerIdentityState();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(state.profile.factions)), [{ faction: '夜跑群', role: '成员', reason: '剧情确认。' }]);
  assert.strictEqual(state.values.factions, undefined);
});

test('Stage4 JSON 角色卡人事归属路由到 membership upsert', () => {
  const context = createContext();
  loadPipeline(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'player', id: 'player-self', name: '刘悠' }];
  const parsed = loop.parseSettlementJson(JSON.stringify({
    角色卡: [{
      subject: '刘悠',
      field: '人事归属',
      op: '增加',
      value: '成都市某中学/教师',
      reason: '正文确认在该校任职',
      result: '写入人事归属',
    }],
  }), { requestedTypes: ['角色卡'], participants, store });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['角色卡']));
  const update = parsed.genericUpdates[0];
  assert.strictEqual(update.updateType, 'membership');
  assert.strictEqual(update.change.value.orgName, '成都市某中学');
  assert.strictEqual(update.change.value.title, '教师');
});

test('Stage4 JSON 证书与称号写入 profile 且不进入 RPG values', () => {
  const context = createContext();
  loadPipeline(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'player', id: 'player-self', name: '刘悠' }];
  const parsed = loop.parseSettlementJson(JSON.stringify({
    角色卡: [
      { subject: '刘悠', field: '证书', op: '增加', value: '四川大学/计算机科学与技术/工学硕士学位', reason: '本轮确认学历', result: '写入证书' },
      { subject: '刘悠', field: '称号', op: '增加', value: '成都程序员社区/开源贡献/年度贡献者', reason: '本轮确认认可', result: '写入称号' },
    ],
  }), { requestedTypes: ['角色卡'], participants, store });

  assert.strictEqual(parsed.genericUpdates.length, 2);
  parsed.genericUpdates.forEach((update) => assert.strictEqual(context.window.GameModules.updateRegistry.applyOne(store, update), true));
  parsed.genericUpdates.forEach((update) => assert.strictEqual(context.window.GameModules.updateRegistry.applyOne(store, update), false));
  const state = store.playerIdentityState();
  assert.strictEqual(state.profile.certificates[0].orgName, '四川大学');
  assert.strictEqual(state.profile.titles[0].title, '年度贡献者');
  assert.strictEqual(state.profile.certificates.length, 1);
  assert.strictEqual(state.profile.titles.length, 1);
  assert.strictEqual(state.values.certificates, undefined);
  assert.strictEqual(state.values.titles, undefined);
});

test('身份列表追加按旧字符串和别名业务键去重且保留无法识别条目', () => {
  const context = createContext();
  loadPipeline(context);
  const registry = context.window.GameModules.updateRegistry;
  const store = makeStore();
  const state = store.playerIdentityState();
  state.profile.factions = ['刘家/长兄'];
  state.profile.certificates = [
    { organization: '四川大学', domain: '计算机科学与技术', title: '工学硕士学位' },
    { legacyUnknown: '保留此条' },
  ];

  assert.strictEqual(registry.applyOne(store, {
    subject: { type: 'player', id: 'player-self', name: '刘悠' },
    field: 'profile.factions',
    change: { mode: 'append', value: { faction: '刘家', role: '长兄', reason: '重复语义' } },
  }), false);
  assert.strictEqual(registry.applyOne(store, {
    subject: { type: 'player', id: 'player-self', name: '刘悠' },
    field: 'profile.certificates',
    change: { mode: 'append', value: { orgName: '四川大学', field: '计算机科学与技术', level: '工学硕士学位', reason: '重复语义' } },
  }), false);
  assert.strictEqual(state.profile.factions.length, 1);
  assert.strictEqual(state.profile.certificates.length, 2);
  assert.strictEqual(state.profile.certificates[1].legacyUnknown, '保留此条');
});

console.log('all settlement social pipeline tests passed');
