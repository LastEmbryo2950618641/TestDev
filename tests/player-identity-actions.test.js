const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

function createStore(overrides = {}) {
  const savedStates = overrides.savedStates || {};
  const saveCalls = [];
  const generatedProfile = overrides.generatedProfile || {
    id: 'player-self',
    name: '测试玩家',
    work: '2026 现代都市现实世界',
    role: '记者',
    detail: '测试角色卡详情',
    personality: '测试性格',
    appearance: '测试外貌',
    workplace: '晨报社',
    position: '记者',
    items: [],
    factions: [{ faction: '调查记者互助会', role: '联络人', reason: '角色卡已明确该社群身份。' }],
    memberships: [{ orgName: '晨报社', title: '记者', reason: '角色卡已明确该组织身份。' }],
  };
  const factionRolesResult = overrides.factionRolesResult;
  const membershipsResult = overrides.membershipsResult;
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    window: {
      GameModules: {
        realWorld2026: { label: '2026 现代都市现实世界', defaults: {} },
        socialPosition: {
          workplace: () => '晨报社',
          position: () => '记者',
          playerItems: () => [{ faction: '上海市', role: '居民', reason: '旧玩家逻辑。' }],
          membershipItems: () => [{ orgName: '晨报社', title: '记者', reason: '旧玩家逻辑。' }],
        },
        characterProfile: {
          ensure: async () => ({ ...generatedProfile }),
          memberships: (profile) => membershipsResult || (Array.isArray(profile.memberships) ? profile.memberships : []),
          factionRoles: (profile) => factionRolesResult || (Array.isArray(profile.factions) ? profile.factions : []),
          requireRpgFieldReasons: () => {},
        },
        rpgState: {
          ensureCharacter: async (character) => ({
            id: character.id || 'player-self',
            profile: character,
            values: { items: [] },
          }),
          syncSocialFields(state, source = 'profile') {
            const input = source === 'values' ? state.values : state.profile;
            const clone = (value) => (Array.isArray(value) ? value.map((item) => ({ ...item })) : []);
            state.profile.factions = clone(input.factions);
            state.profile.memberships = clone(input.memberships);
            state.values.factions = clone(input.factions);
            state.values.memberships = clone(input.memberships);
            return true;
          },
        },
        progression: {
          syncInventoryFromProfile: () => {},
          ensureStateMechanics: () => false,
        },
        initPromptRegistry: {
          ensureTemplateState: () => false,
        },
        predefinedRoleCards: {
          upgradeSavedProfileAppearance: () => false,
        },
        orgTerritory: {
          syncCharacterOrgMemberships: () => {},
        },
        sqliteSave: {
          db: {},
          saveCharacterState: async (state) => {
            saveCalls.push(state);
            savedStates[state.id] = state;
          },
          getCharacterState: (id) => savedStates[id] || null,
        },
      },
      Alpine: {},
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/player-identity-actions.js');
  loadScript(context, 'publish/rpg-actions.js');
  const store = {
    playerProfile: { name: '测试玩家', refinedCity: '上海', refinedRole: '记者', gender: '男' },
    playerName: '测试玩家',
    rpgStates: savedStates,
    roleCardSetup: {},
    roleCardLoadingState: null,
    playerSetupSummary: () => '测试玩家资料',
    hasPlayerAspiration: () => false,
    initFactionSystem: () => {},
    updateRoleCardLoadingStep: () => {},
    finishRoleCardLoading: () => {},
    startRoleCardLoadingBatch: () => {},
    updateRoleCardLoading: () => {},
    ...context.window.GameModules.playerIdentityActions,
    ...context.window.GameModules.rpgActions,
  };
  return { context, store, saveCalls, generatedProfile };
}

test('new player state reuses generated profile factions', async () => {
  const { store, generatedProfile } = createStore();
  const state = await store.ensurePlayerRpgState(true);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(state.values.factions)),
    JSON.parse(JSON.stringify(generatedProfile.factions)),
  );
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(state.values.memberships)),
    JSON.parse(JSON.stringify(generatedProfile.memberships)),
  );
  assert.notStrictEqual(state.profile.factions, state.values.factions);
  assert.notStrictEqual(state.profile.memberships, state.values.memberships);
});

test('saved player state backfills factions from generated profile', async () => {
  const savedState = {
    id: 'player-self',
    profile: {
      id: 'player-self',
      name: '测试玩家',
      work: '2026 现代都市现实世界',
      role: '记者',
      detail: '测试角色卡详情',
      personality: '测试性格',
      appearance: '测试外貌',
      factions: [{ faction: '调查记者互助会', role: '联络人', reason: '角色卡已明确该社群身份。' }],
      memberships: [{ orgName: '晨报社', title: '记者', reason: '角色卡已明确该组织身份。' }],
    },
    values: {
      items: [],
      factions: [{ faction: '上海市', role: '居民', reason: '旧玩家逻辑。' }],
      memberships: [{ orgName: '晨报社', title: '记者', reason: '角色卡已明确该组织身份。' }],
    },
  };
  const { store } = createStore({ savedStates: { 'player-self': savedState } });
  const state = await store.ensurePlayerRpgState(false);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(state.values.factions)),
    JSON.parse(JSON.stringify(savedState.profile.factions)),
  );
});

test('saved player state still backfills memberships from character profile logic', async () => {
  const savedState = {
    id: 'player-self',
    profile: {
      id: 'player-self',
      name: '测试玩家',
      work: '2026 现代都市现实世界',
      role: '记者',
      detail: '测试角色卡详情',
      personality: '测试性格',
      appearance: '测试外貌',
      factions: [{ faction: '调查记者互助会', role: '联络人', reason: '角色卡已明确该社群身份。' }],
      memberships: [{ orgName: '晨报社', title: '记者', reason: '角色卡已明确该组织身份。' }],
    },
    values: {
      items: [],
      factions: [{ faction: '调查记者互助会', role: '联络人', reason: '角色卡已明确该社群身份。' }],
      memberships: [{ orgName: '晨报社', title: '记者', reason: '旧存档只保存了工作归属。' }],
    },
  };
  const backfilledMemberships = [
    { orgName: '中华人民共和国', title: '公民', reason: '现实世界默认国籍。' },
    { orgName: '晨报社', title: '记者', reason: '角色卡已明确该组织身份。' },
  ];
  const { store } = createStore({
    savedStates: { 'player-self': savedState },
    membershipsResult: backfilledMemberships,
  });
  const state = await store.ensurePlayerRpgState(false);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(state.values.memberships)),
    JSON.parse(JSON.stringify(backfilledMemberships)),
  );
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
