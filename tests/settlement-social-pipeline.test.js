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
      const list = Array.isArray(state.values.memberships) ? state.values.memberships : [];
      const idx = list.findIndex((m) => m.orgName === mem.orgName && m.title === mem.title);
      if (idx >= 0) list[idx] = { ...list[idx], ...mem };
      else list.push(mem);
      state.values.memberships = list;
      return mem;
    },
    findCharacterStateByName: () => null,
  };
  context.window.GameModules.app = {
    orgTerritory: {
      settlementActions: {
        ot() { return context.window.GameModules.orgTerritory; },
        reasonText(update = {}) {
          return String(update?.reasons?.[0]?.evidence || update?.change?.value?.reason || '').trim();
        },
        applyMembershipUpdate(store, update = {}) {
          const ot = this.ot();
          const subject = update.subject || {};
          const characterName = String(subject.name || '').trim();
          let state = subject.id === 'player-self' || !characterName
            ? store.playerIdentityState?.()
            : store.itemSkillState?.(subject.id);
          if (!state?.values) return { ok: false, text: 'missing' };
          const change = update.change || {};
          const patch = typeof change.value === 'object' && change.value ? change.value : {};
          const reason = this.reasonText(update);
          const now = ot.nowLabel(store);
          ot.upsertCharacterMembership(state, { ...patch, since: patch.since || now, reason: patch.reason || reason }, store);
          if (state.profile) {
            state.profile.memberships = Array.isArray(state.values.memberships) ? state.values.memberships.slice() : [];
            state.profile.roleCardUpdatedAt = now;
          }
          return { ok: true, text: 'ok' };
        },
      },
    },
  };
}

function makeStore() {
  const player = {
    id: 'player-self',
    profile: { name: '刘悠', factions: [], memberships: [] },
    values: { factions: [], memberships: [] },
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

test('Stage4 JSON 人事归属 orgName/title 可解析并写 values+profile.memberships', () => {
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
  assert.strictEqual(update.field, 'values.memberships');
  assert.strictEqual(update.change.mode, 'upsert');
  assert.strictEqual(update.change.value.orgName, '成都市高新区科创有限公司');
  assert.strictEqual(update.change.value.title, '程序工程师');

  const applied = context.window.GameModules.app.orgTerritory.settlementActions.applyMembershipUpdate(store, update);
  assert.strictEqual(applied.ok, true);
  const state = store.playerIdentityState();
  assert.strictEqual(state.values.memberships[0].orgName, '成都市高新区科创有限公司');
  assert.strictEqual(state.profile.memberships[0].title, '程序工程师');
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
  assert.ok(Array.isArray(state.values.factions) && state.values.factions.length >= 1);
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

console.log('all settlement social pipeline tests passed');
