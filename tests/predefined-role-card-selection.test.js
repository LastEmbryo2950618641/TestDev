const assert = require('assert');
const fs = require('fs');
const test = require('node:test');
const vm = require('vm');

function loadPredefinedRoleCardsModule(data) {
  const code = fs.readFileSync('publish/predefined-role-cards.js', 'utf8');
  const context = {
    console,
    window: {
      GameModules: {
        predefinedRoleCardData: data,
        predefinedRoleCardActions: {
          cloneRoleCardForEditing: (card) => JSON.parse(JSON.stringify(card)),
        },
        playerAspirationConfig: {},
        appearanceProfileTags: null,
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window.GameModules;
}

function loadPlayerSetupDefaultsModule() {
  const context = {
    console,
    window: {
      GameModules: {
        playerSetupActions: {},
        currentLocationField: {},
        aiProvider: {
          currentProviderId: () => 'test',
          currentProvider: () => ({ complete: async () => '{}' }),
        },
        jsonUtils: {
          generateJsonWithRetry: async () => ({
            currentLocation: '中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号',
            refinedCity: '四川省-成都市-武侯区-锦苑小区-3栋-2单元601号',
          }),
        },
      },
    },
    setTimeout,
    clearTimeout,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('publish/current-location-field.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('publish/player-setup-defaults.js', 'utf8'), context);
  return context.window.GameModules;
}

function loadPlayerIdentityActionsModule() {
  const context = {
    console,
    window: { GameModules: { playerIdentityActions: {} } },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('publish/player-identity-actions.js', 'utf8'), context);
  return context.window.GameModules;
}

test('predefined role card selection dedupes by role card id, not file key or name', async () => {
  const modules = loadPredefinedRoleCardsModule({
    first_file_name: { id: 'same-role-id', name: '甲', role: 'A' },
    second_file_name: { id: 'same-role-id', name: '甲复制', role: 'B' },
    third_file_name: { id: 'other-role-id', name: '乙', role: 'C' },
  });
  const tool = modules.predefinedRoleCards;
  const cards = await tool.loadAll();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(cards.map((card) => `${card.id}:${card.name}`))), [
    'same-role-id:甲',
    'other-role-id:乙',
  ]);

  const store = {
    phoneSetupDone: false,
    roleCardSetup: {
      cards,
      selectedPlayerId: 'same-role-id',
      selectedPlayerName: '甲',
      selectedCardIds: cards.map((card) => tool.roleCardId(card)),
      selectedCardId: '',
    },
  };
  Object.assign(store, modules.predefinedRoleCardActions);
  store.syncInitialCardPicker();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.selectedInitialRoleCards().map((card) => card.id))), ['other-role-id']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.availableInitialRoleCards().map((card) => card.id))), []);
});

test('player profile from card does not inherit fallback current location', () => {
  const modules = loadPredefinedRoleCardsModule({});
  const profile = modules.predefinedRoleCards.playerProfileFromCard(
    { id: 'player', name: '甲', birthday: '2000-01-01', role: '居民' },
    { city: '四川省', refinedCity: '四川省', currentLocation: '四川省', livingStatus: '旧资料', refinedLivingStatus: '旧居住资料' },
  );

  assert.strictEqual(profile.city, '');
  assert.strictEqual(profile.refinedCity, '');
  assert.strictEqual(profile.currentLocation, '');
  assert.strictEqual(profile.livingStatus, '');
  assert.strictEqual(profile.refinedLivingStatus, '');
});

test('missing predefined player current location is inferred and written to card', async () => {
  const modules = loadPlayerSetupDefaultsModule();
  const card = { id: 'player', name: '刘悠', birthday: '2000-01-01', role: '居民', detail: '住在锦苑小区3栋。' };
  const store = {
    playerProfile: { name: '刘悠', birthday: '2000-01-01', currentLocation: '' },
    selectedPlayerRoleCard: () => card,
    modelId: 'test-model',
  };
  Object.assign(store, modules.playerSetupActions);

  const location = await store.fillMissingPlayerCurrentLocationFromCard();

  assert.strictEqual(location, '中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号');
  assert.strictEqual(store.playerProfile.currentLocation, location);
  assert.strictEqual(card.currentLocation, location);
  assert.strictEqual(store.currentLocationFillState.status, 'done');
  assert.strictEqual(store.currentLocationFillState.percent, 100);
  assert.strictEqual(store.currentLocationFillState.currentLocation, location);
});

test('existing predefined player current location still shows progress dialog', async () => {
  const modules = loadPlayerSetupDefaultsModule();
  const location = '中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号';
  const card = { id: 'player', name: '刘悠', birthday: '2000-01-01', currentLocation: location };
  const store = {
    playerProfile: { name: '刘悠', birthday: '2000-01-01', currentLocation: location },
    selectedPlayerRoleCard: () => card,
    modelId: 'test-model',
  };
  Object.assign(store, modules.playerSetupActions);

  const result = await store.fillMissingPlayerCurrentLocationFromCard();

  assert.strictEqual(result, location);
  assert.strictEqual(store.currentLocationFillState.open, true);
  assert.strictEqual(store.currentLocationFillState.status, 'done');
  assert.strictEqual(store.currentLocationFillState.percent, 100);
});

test('predefined player current location is synced into identity state', async () => {
  const modules = loadPlayerSetupDefaultsModule();
  const location = '中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号';
  let savedState = null;
  modules.characterStateStore = {
    save: async (state) => {
      savedState = JSON.parse(JSON.stringify(state));
    },
  };
  const store = {
    playerProfile: { name: '刘悠', birthday: '2000-01-01', currentLocation: location },
    rpgStates: {
      'player-self': {
        id: 'player-self',
        name: '刘悠',
        profile: { id: 'player-self', name: '刘悠', roleCard: true, currentLocation: '' },
        values: { current_location: { name: '当前位置未知' } },
      },
    },
    phoneDateText: () => '2026-07-22',
    selectedWork: '2026 现代都市现实世界',
  };
  Object.assign(store, modules.playerSetupActions);

  const changed = await store.syncPlayerCurrentLocationToIdentityState();

  assert.strictEqual(changed, true);
  assert.strictEqual(store.rpgStates['player-self'].profile.currentLocation, location);
  assert.strictEqual(store.rpgStates['player-self'].values.current_location.name, '锦苑小区3栋');
  assert.strictEqual(store.rpgStates['player-self'].values.current_location.currentLocation, location);
  assert.strictEqual(savedState.profile.currentLocation, location);
});

test('identity display does not fall back to setup player profile', () => {
  const modules = loadPlayerIdentityActionsModule();
  const store = {
    rpgStates: {},
    playerProfile: {
      name: '临时资料名',
      currentLocation: '中华人民共和国·四川省·成都市武侯区·临时地点·房间',
    },
    selectedWork: '2026 现代都市现实世界',
  };
  Object.assign(store, modules.playerIdentityActions);

  const profile = store.identityTargetProfile();

  assert.strictEqual(profile.name, 'player-self');
  assert.strictEqual(profile.currentLocation, '');
  assert.strictEqual(profile.pendingRoleCard, true);
});

test('identity current location reads saved rpg state value', () => {
  const modules = loadPlayerIdentityActionsModule();
  const store = {
    identityTargetId: 'player-self',
    rpgStates: {
      'player-self': {
        id: 'player-self',
        name: '刘悠',
        worldTag: '2026 现代都市现实世界',
        profile: { id: 'player-self', name: '刘悠', roleCard: true, currentLocation: '' },
        values: {
          current_location: {
            name: '中华人民共和国·四川省·成都市·锦苑小区3栋·2单元601号',
            worldTag: '2026 现代都市现实世界',
          },
        },
      },
    },
    roleCardReasonGetter: () => () => '',
  };
  Object.assign(store, modules.playerIdentityActions);

  const field = store.identityTargetFields().find((item) => item.label === '当前位置');

  assert.strictEqual(field.value, '中华人民共和国·四川省·成都市·锦苑小区3栋·2单元601号');
  assert.strictEqual(field.raw.name, '中华人民共和国·四川省·成都市·锦苑小区3栋·2单元601号');
});

test('predefined player state opens storage before creation', async () => {
  const modules = loadPredefinedRoleCardsModule({});
  let opened = false;
  let saved = null;
  Object.assign(modules, {
    platform: {
      storage: {
        capabilities: { isReady: () => opened },
        backend: { currentSlot: () => 'slot-1' },
      },
    },
    storage: {
      open: async (slot) => {
        assert.strictEqual(slot, 'slot-1');
        opened = true;
      },
    },
    characterStateStore: {
      get: () => null,
      save: async (state) => {
        saved = JSON.parse(JSON.stringify(state));
      },
    },
    rpgState: {
      ensureSchema: async (worldTag) => ({ worldTag, sections: [{ title: '身份信息', fields: [{ key: 'world_tag' }] }] }),
      createCharacterState: (profile, schema) => ({ id: profile.id, name: profile.name, worldTag: schema.worldTag, schema, profile, values: { world_tag: schema.worldTag } }),
      upgradeCharacterState: () => {},
    },
    rpgLexicon: { syncState: async () => {} },
    currentLocationField: {
      stateValue: (profile) => ({ name: '锦苑小区3栋', currentLocation: profile.currentLocation }),
    },
    realWorld2026: { label: '2026 现代都市现实世界' },
  });
  const store = {
    selectedSlot: 'slot-1',
    roleCardSetup: {
      usePredefinedPlayerCard: true,
      cards: [{ id: 'liu-you', name: '刘悠', birthday: '2000-01-01', currentLocation: '中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号' }],
      selectedPlayerId: 'liu-you',
      selectedCardIds: ['liu-you'],
    },
    rpgStates: {},
  };

  const states = await modules.predefinedRoleCards.saveSelectedRoleCardStates(store);

  assert.strictEqual(opened, true);
  assert.strictEqual(states[0].id, 'player-self');
  assert.strictEqual(store.rpgStates['player-self'].profile.name, '刘悠');
  assert.strictEqual(saved.id, 'player-self');
});

test('predefined player repair restores profile without replacing values', async () => {
  const modules = loadPredefinedRoleCardsModule({});
  const placeholder = {
    id: 'player-self',
    name: 'player-self',
    worldTag: '原创世界',
    profile: { id: 'player-self', name: 'player-self' },
    values: { world_tag: '原创世界', level: 12, current_location: { name: '当前位置未知' } },
  };
  Object.assign(modules, {
    platform: {
      storage: {
        capabilities: { isReady: () => true },
        backend: { currentSlot: () => 'slot-1' },
      },
    },
    characterStateStore: {
      get: () => placeholder,
      save: async () => {},
    },
    rpgState: {
      ensureSchema: async (worldTag) => ({ worldTag, sections: [{ title: '身份信息', fields: [{ key: 'world_tag' }] }] }),
      createCharacterState: () => { throw new Error('should reuse existing values'); },
      upgradeCharacterState: () => {},
    },
    rpgLexicon: { syncState: async () => {} },
    currentLocationField: {
      stateValue: (profile) => ({ name: '锦苑小区3栋', currentLocation: profile.currentLocation }),
    },
    realWorld2026: { label: '2026 现代都市现实世界' },
  });
  const store = {
    roleCardSetup: {
      usePredefinedPlayerCard: true,
      cards: [{ id: 'liu-you', name: '刘悠', birthday: '2000-01-01', role: '程序工程师', currentLocation: '中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号' }],
      selectedPlayerId: 'liu-you',
      selectedCardIds: ['liu-you'],
    },
    rpgStates: { 'player-self': placeholder },
  };
  Object.assign(store, modules.predefinedRoleCardActions);

  const state = await store.repairSelectedPlayerRoleCardState();

  assert.strictEqual(state.profile.name, '刘悠');
  assert.strictEqual(state.profile.roleCard, true);
  assert.strictEqual(state.values.level, 12);
  assert.strictEqual(state.values.current_location.name, '锦苑小区3栋');
});

test('real world panel does not auto-submit location fill as narration action', () => {
  const source = fs.readFileSync('publish/real-world-clock-actions.js', 'utf8');
  assert.ok(!source.includes("submitRealWorldAction('根据我的现实资料确认当前所在的具体地点，并建立电子地图根节点')"));
});

test('activation page contains current location progress dialog', () => {
  const html = fs.readFileSync('publish/index.html', 'utf8');
  assert.ok(html.includes('currentLocationFillState?.open'));
  assert.ok(html.includes("profileSetupBusy && $store.game.phoneActivationChoice === 'existing'"));
  assert.ok(html.includes('获取玩家当前位置'));
  assert.ok(html.includes('写入玩家角色卡当前位置并建立地图根节点'));
  assert.ok(html.includes('confirmPhoneActivationSetup()'));
});

test('identity dossier rerenders when section fields change', () => {
  const html = fs.readFileSync('publish/index.html', 'utf8');
  const effect = 'x-effect="dossier = $store.game.identityInfoPresentation(section.fields)"';
  assert.strictEqual(html.split(effect).length - 1, 2);
});
