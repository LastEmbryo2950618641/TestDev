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

function loadRoleCardEditorModules() {
  const context = {
    console,
    window: {
      GameModules: {
        predefinedRoleCardData: {},
        predefinedRoleCardActions: {},
        playerAspirationConfig: {},
        appearanceProfileTags: null,
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('publish/predefined-role-cards.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('publish/role-card-editor.js', 'utf8'), context);
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

function loadPlayerSetupActionsModule() {
  const context = {
    console,
    window: {
      GameModules: {
        playerSetupActions: {},
        currentLocationField: { normalize: (value) => String(value || '').trim() },
        characterProfile: { formatRelationships: (value) => value || '' },
        progression: {
          normalizeCarryItem: (item) => ({ ...item, name: String(item?.name || '') }),
          inferEquipSlots: () => [],
        },
      },
    },
    setTimeout,
    clearTimeout,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('publish/player-setup-actions.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('publish/player-setup-extra-actions.js', 'utf8'), context);
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

test('predefined exported role cards keep exact profile fields', async () => {
  const exportData = JSON.parse(fs.readFileSync('publish/predefined-role-card-support/slot-4-export.json', 'utf8'));
  const filesById = {
    'rel-ai-247528': '01-刘思琪-rel-ai-247528',
    'rel-ai-242269': '02-刘思怡-rel-ai-242269',
    'rel-ai-247463': '03-刘思瑶-rel-ai-247463',
    'player-self': '04-刘悠-player-self',
  };
  const data = {};
  for (const [id, fileKey] of Object.entries(filesById)) {
    const stored = JSON.parse(fs.readFileSync(`publish/predefined-role-cards/${fileKey}.json`, 'utf8'));
    const exported = exportData.characters.find((item) => item.id === id);
    assert.ok(exported, `missing exported ${id}`);
    assert.deepStrictEqual(Object.keys(stored.profile), Object.keys(exported.profile), `${id} JSON profile keys`);
    assert.deepStrictEqual(stored.profile, exported.profile, `${id} JSON profile`);
    data[fileKey] = stored;
  }

  const modules = loadPredefinedRoleCardsModule(data);
  const cards = await modules.predefinedRoleCards.loadAll();
  for (const card of cards) {
    const exported = exportData.characters.find((item) => item.id === card.id);
    assert.ok(exported, `missing loaded ${card.id}`);
    assert.deepStrictEqual(Object.keys(card), Object.keys(exported.profile), `${card.id} loaded profile keys`);
  }
});

function loadIdentityUiModules() {
  const context = {
    console,
    window: {
      GameModules: {
        playerIdentityActions: {},
        rpgFieldUi: {},
        saveActions: {},
        realWorld2026: { label: '2026 现代都市现实世界' },
      },
    },
  };
  vm.createContext(context);
  ['publish/save-actions.js', 'publish/rpg-field-ui.js', 'publish/player-identity-actions.js'].forEach((file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  });
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

test('player profile from predefined card copies editable traits', () => {
  const modules = loadPredefinedRoleCardsModule({});
  const profile = modules.predefinedRoleCards.playerProfileFromCard({
    id: 'player',
    name: '刘悠',
    appearance: '短发戴眼镜',
    preferences: '喜欢阅读',
    personality: '沉稳内敛',
  }, {});

  assert.strictEqual(profile.appearance, '短发戴眼镜');
  assert.strictEqual(profile.preferences, '喜欢阅读');
  assert.strictEqual(profile.personality, '沉稳内敛');
});

test('profile trait input updates profile and selected predefined card', () => {
  const modules = loadRoleCardEditorModules();
  const card = { id: 'player', name: '刘悠', isPlayer: true, appearance: '旧外貌' };
  const store = {
    playerProfile: { name: '刘悠', appearance: '旧外貌' },
    roleCardSetup: { usePredefinedPlayerCard: true, selectedPlayerId: 'player', cards: [card] },
  };
  Object.assign(store, modules.predefinedRoleCardActions);

  store.setPlayerProfileTrait('appearance', '戴金属框眼镜');

  assert.strictEqual(store.playerProfile.appearance, '戴金属框眼镜');
  assert.strictEqual(card.appearance, '戴金属框眼镜');
});

test('new profile normalization preserves user traits', () => {
  const modules = loadPlayerSetupActionsModule();
  const store = {
    playerProfile: {
      appearance: '  用户外貌  ',
      preferences: '  用户喜好  ',
      personality: '  用户性格  ',
    },
  };
  Object.assign(store, modules.playerSetupActions);

  const base = store.normalizePlayerSetupBase('刘悠', '1998-11-19');
  const enriched = store.normalizeEnrichedPlayerProfile(base, { personality: 'AI改写值' });

  assert.strictEqual(enriched.appearance, '用户外貌');
  assert.strictEqual(enriched.preferences, '用户喜好');
  assert.strictEqual(enriched.personality, '用户性格');
});

test('default profile parses player trait defaults', () => {
  const modules = loadPlayerSetupDefaultsModule();
  const store = {
    normalizeRelationshipEntries: (entries) => entries || [],
  };
  Object.assign(store, modules.playerSetupActions);
  const markdown = fs.readFileSync('publish/config/default-existing-profile.md', 'utf8');

  const profile = store.parseDefaultProfileMd(markdown);

  assert.strictEqual(profile.appearance, '黑直短发，戴金属框眼镜，眉宇间带着一丝疲惫，常穿深色格子衬衫，身高178cm，体型偏瘦。');
  assert.strictEqual(profile.preferences, '偏爱休闲简约风格，常穿T恤、牛仔裤和运动鞋，对颜色没有特殊偏好，随身携带笔记本电脑和手机。');
  assert.strictEqual(profile.personality, '责任感强，对妹妹们有保护欲，性格沉稳内敛，不善表达情感但行动体贴，压力下会独自沉默。');
});

test('new account applies player trait defaults only once', async () => {
  const modules = loadPlayerSetupDefaultsModule();
  const defaults = { appearance: '默认外貌', preferences: '默认喜好', personality: '默认性格' };
  const store = {
    profileSetupBusy: false,
    playerProfileTraitDefaultsApplied: false,
    playerProfile: {},
    roleCardSetup: {},
    defaultExistingAccountProfile: async () => defaults,
    normalizeRelationshipEntries: (entries) => entries || [],
  };
  Object.assign(store, modules.playerSetupActions);
  store.defaultExistingAccountProfile = async () => defaults;

  await store.chooseNewAccountSetup();
  assert.strictEqual(store.playerProfile.appearance, '默认外貌');
  assert.strictEqual(store.playerProfile.preferences, '默认喜好');
  assert.strictEqual(store.playerProfile.personality, '默认性格');
  assert.strictEqual(store.playerProfileTraitDefaultsApplied, true);

  store.playerProfile.appearance = '';
  await store.chooseNewAccountSetup();
  assert.strictEqual(store.playerProfile.appearance, '');
});

test('game declares and new game resets player trait default initialization', () => {
  const gameSource = fs.readFileSync('publish/game.js', 'utf8');
  const homeSource = fs.readFileSync('publish/home-actions.js', 'utf8');

  assert.ok(gameSource.includes('playerProfileTraitDefaultsApplied: false'));
  assert.ok(homeSource.includes('this.playerProfileTraitDefaultsApplied = false'));
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
  assert.strictEqual(store.rpgStates['player-self'].values.current_location, undefined);
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

test('new player character base keeps user supplied traits', () => {
  const modules = loadPlayerIdentityActionsModule();
  const store = {
    playerProfile: {
      name: '刘悠',
      appearance: '短发戴眼镜',
      preferences: '喜欢阅读',
      personality: '沉稳内敛',
      notes: '家庭备注',
    },
  };
  Object.assign(store, modules.playerIdentityActions);

  const card = store.playerCharacterBase();

  assert.strictEqual(card.appearance, '短发戴眼镜');
  assert.strictEqual(card.preferences, '喜欢阅读');
  assert.strictEqual(card.personality, '沉稳内敛');
});

test('identity current location does not fall back to rpg state value', () => {
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

  assert.strictEqual(field.value, '未记录');
  assert.strictEqual(field.raw, '');
});

test('identity section contains one current location sourced from profile', () => {
  const modules = loadIdentityUiModules();
  const state = {
    id: 'player-self',
    name: '刘悠',
    worldTag: '2026 现代都市现实世界',
    profile: {
      id: 'player-self',
      name: '刘悠',
      work: '2026 现代都市现实世界',
      roleCard: true,
      currentLocation: '角色档案地址',
    },
    values: {
      world_tag: '2026 现代都市现实世界',
      current_location: { name: 'RPG状态地址' },
    },
  };
  const store = {
    identityTargetId: 'player-self',
    rpgStates: { 'player-self': state },
    roleCardReasonGetter: () => () => '',
  };
  Object.assign(store, modules.saveActions, modules.rpgFieldUi, modules.playerIdentityActions);

  const sections = store.profileSections(state, store.identityTargetFields());
  const identity = sections.find((section) => section.title === '身份信息');
  const locations = identity.fields.filter((item) => item.label === '当前位置');

  assert.strictEqual(locations.length, 1);
  assert.strictEqual(locations[0].value, '角色档案地址');
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
      adopt: (state, host) => {
        host.rpgStates = { ...(host.rpgStates || {}), [state.id]: state };
        return state;
      },
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
  assert.strictEqual(states[0].profile.name, '刘悠');
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
  assert.strictEqual(state.values.current_location, undefined);
});

test('default account activation preserves full exported predefined role card shape', async () => {
  const exported = {
    id: 'player-self',
    name: '刘悠',
    worldTag: '2026 现代都市现实世界',
    profile: {
      id: 'player-self',
      name: '刘悠',
      roleCard: true,
      isPlayer: true,
      work: '2026 现代都市现实世界',
      currentLocation: '中华人民共和国·四川省·成都市武侯区·锦苑小区3栋·2单元601号',
      certificates: [{ name: '中华人民共和国/计算机科学与技术/硕士', reason: '测试证书' }],
      titles: [{ name: '成都程序员社区/开源贡献/年度贡献者', reason: '测试称号' }],
    },
    values: {
      world_tag: '2026 现代都市现实世界',
      level: 3,
      custom_latest_field: { nested: true },
    },
    metrics: { emotions: { calm: { value: 8 } } },
    schema: { worldTag: '2026 现代都市现实世界', sections: [{ title: '身份信息', fields: [{ key: 'custom_latest_field' }] }] },
    updatedAt: '2026-07-28T02:54:24.392Z',
  };
  const modules = loadPredefinedRoleCardsModule({ '04-刘悠-player-self': exported });
  let saved = null;
  Object.assign(modules, {
    platform: {
      storage: {
        capabilities: { isReady: () => true },
        backend: { currentSlot: () => 'slot-1' },
      },
    },
    storage: { open: async () => {} },
    characterStateStore: {
      get: () => null,
      save: async (state) => { saved = JSON.parse(JSON.stringify(state)); },
    },
    rpgState: {
      ensureSchema: async (worldTag) => ({ worldTag, sections: [{ title: '身份信息', fields: [{ key: 'world_tag' }] }] }),
      createCharacterState: () => { throw new Error('full exported predefined card must not be recreated from schema'); },
      upgradeCharacterState: () => { throw new Error('full exported predefined card must not be schema-upgraded'); },
    },
    rpgLexicon: { syncState: async () => { throw new Error('full exported predefined card must not be lexicon-rebased'); } },
    currentLocationField: {
      mapNodeName: (value) => String(value || '').split('·').pop(),
    },
    realWorld2026: { label: '2026 现代都市现实世界' },
  });
  const cards = await modules.predefinedRoleCards.loadAll();
  const store = {
    selectedSlot: 'slot-1',
    roleCardSetup: {
      usePredefinedPlayerCard: true,
      cards,
      selectedPlayerId: 'player-self',
      selectedCardIds: ['player-self'],
    },
    rpgStates: {},
  };

  const states = await modules.predefinedRoleCards.saveSelectedRoleCardStates(store);

  assert.strictEqual(states.length, 1);
  assert.deepStrictEqual(Object.keys(states[0]), Object.keys(exported));
  assert.deepStrictEqual(Object.keys(states[0].profile), Object.keys(exported.profile));
  assert.deepStrictEqual(Object.keys(states[0].values), Object.keys(exported.values));
  assert.strictEqual(JSON.stringify(states[0].values.custom_latest_field), JSON.stringify({ nested: true }));
  assert.strictEqual(JSON.stringify(states[0].profile.certificates), JSON.stringify(exported.profile.certificates));
  assert.strictEqual(JSON.stringify(states[0].profile.titles), JSON.stringify(exported.profile.titles));
  assert.strictEqual(JSON.stringify(saved), JSON.stringify(states[0]));
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

test('activation form exposes appearance preferences and personality inputs', () => {
  const html = fs.readFileSync('publish/index.html', 'utf8');
  for (const key of ['appearance', 'preferences', 'personality']) {
    assert.ok(html.includes(`playerProfile.${key}`));
    assert.ok(html.includes(`setPlayerProfileTrait('${key}', $event.target.value)`));
  }
});

test('game initializes editable player profile traits', () => {
  const source = fs.readFileSync('publish/game.js', 'utf8');
  const profileDefaults = source.match(/playerProfile:\s*\{([^}]+)\}/)?.[1] || '';

  assert.ok(profileDefaults.includes("appearance: ''"));
  assert.ok(profileDefaults.includes("preferences: ''"));
  assert.ok(profileDefaults.includes("personality: ''"));
});

test('identity dossier rerenders when section fields change', () => {
  const html = fs.readFileSync('publish/index.html', 'utf8');
  const effect = 'x-effect="dossier = $store.game.identityInfoPresentation(section.fields)"';
  assert.strictEqual(html.split(effect).length - 1, 2);
});
