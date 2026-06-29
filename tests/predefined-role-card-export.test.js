const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const exporter = require('../tools/predefined-role-card-exporter');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function sampleState(id, name, age = 15, overrides = {}) {
  return {
    id,
    name,
    worldTag: '2026 现代都市现实世界',
    profile: {
      id,
      name,
      gender: name === '刘悠' ? '男' : '女',
      age,
      birthday: name === '刘悠' ? '1998-11-19' : '2011-01-01',
      work: '2026 现代都市现实世界',
      role: name === '刘悠' ? '程序工程师' : `${age}岁三胞胎妹妹`,
      job: name === '刘悠' ? '程序工程师' : '学生',
      detail: `${name}是${age}岁三胞胎家庭成员。`,
      relationships: '刘悠家庭',
      items: [{ name: '智能手机', type: '装备' }],
      wearing: [{ slot: '上衣', name: '衬衫' }],
      initialMetrics: { emotions: [{ key: '高兴', value: 50 }], playerFeelings: [{ key: '信任', value: 80 }] },
      roleCardFieldReasons: { 姓名: `${name}来自存档。` },
      rpgFieldReasons: { age: `${age}岁来自存档。` },
      roleCard: true,
      roleCardSource: 'ai',
      roleCardUpdatedAt: '2026-05-01T12:34:56.000Z',
      ...overrides.profile,
    },
    metrics: { emotions: { 高兴: 50 }, playerFeelings: { 信任: 80 } },
    values: {
      age,
      items: [{ name: '钥匙', type: '物品' }],
      wearing: [{ slot: '鞋子', name: '运动鞋' }],
      factions: [{ name: '刘悠家庭 / 家庭成员', faction: '刘悠家庭', role: '家庭成员' }],
      force_positions: [],
      bodyStatus: { summary: '稳定' },
      intimacy: { sexualExperienceCount: 9, sexualHistory: { note: '保留非次数字段' } },
      nested: { sexualExperienceCount: 5, 性经验次数: 3 },
      ...overrides.values,
    },
    ...overrides.state,
  };
}

test('buildExportBundle extracts four target cards and renders js registrations', () => {
  const states = [
    sampleState('player-self', '刘悠', 27),
    sampleState('rel-1', '刘思瑶'),
    sampleState('rel-2', '刘思琪'),
    sampleState('rel-3', '刘思怡'),
  ];
  const bundle = exporter.buildExportBundle(states);
  assert.deepStrictEqual(bundle.map((item) => item.slug), ['liu-you', 'liu-siyao', 'liu-siqi', 'liu-siyi']);
  assert.ok(bundle[3].js.includes("window.GameModules.predefinedRoleCardData['liu-siyi']"));
});

test('triplet cards are adult-converted, birthday-adjusted, and sexual experience counts are zeroed', () => {
  const card = exporter.buildCardFromState(sampleState('rel-1', '刘思瑶', 15));
  assert.strictEqual(card.age, 18);
  assert.strictEqual(card.values.age, 18);
  assert.strictEqual(card.birthday, '2008-01-01');
  assert.strictEqual(card.values.birthday, '2008-01-01');
  assert.ok(card.role.includes('18岁'));
  assert.ok(card.detail.includes('18岁'));
  assert.strictEqual(card.values.intimacy.sexualExperienceCount, 0);
  assert.strictEqual(card.values.nested.sexualExperienceCount, 0);
  assert.strictEqual(card.values.nested.性经验次数, 0);
  assert.strictEqual(card.values.intimacy.sexualHistory.note, '保留非次数字段');
});

test('player card keeps stored age, preserves updatedAt, and is marked as player', () => {
  const card = exporter.buildCardFromState(sampleState('player-self', '刘悠', 27));
  assert.strictEqual(card.age, 27);
  assert.strictEqual(card.id, 'player-self');
  assert.strictEqual(card.isPlayer, true);
  assert.strictEqual(card.roleCardSource, 'predefined');
  assert.strictEqual(card.roleCardUpdatedAt, '2026-05-01T12:34:56.000Z');
});

test('writeExportBundle writes json and js files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'predefined-cards-'));
  const bundle = exporter.buildExportBundle([
    sampleState('player-self', '刘悠', 27),
    sampleState('rel-1', '刘思瑶'),
    sampleState('rel-2', '刘思琪'),
    sampleState('rel-3', '刘思怡'),
  ]);
  const files = exporter.writeExportBundle(bundle, dir).map((file) => path.basename(file)).sort();
  assert.deepStrictEqual(files, [
    'liu-siqi.js', 'liu-siqi.json',
    'liu-siyao.js', 'liu-siyao.json',
    'liu-siyi.js', 'liu-siyi.json',
    'liu-you.js', 'liu-you.json',
  ].sort());
});

test('extractCharacterStates handles object-shaped characterStates', () => {
  const states = exporter.extractCharacterStates({
    characterStates: {
      alpha: sampleState('a', '刘悠', 27),
      beta: sampleState('b', '刘思瑶'),
    },
  });
  assert.strictEqual(states.length, 2);
  assert.deepStrictEqual(states.map((item) => item.name).sort(), ['刘思瑶', '刘悠']);
});

test('parseArgs supports slot dry-run and output options', () => {
  const cli = require('../tools/export-predefined-role-cards');
  const args = cli.parseArgs(['--slot', 'slot-3', '--out', 'publish/predefined-role-cards', '--dry-run']);
  assert.strictEqual(args.slot, 'slot-3');
  assert.strictEqual(args.out, 'publish/predefined-role-cards');
  assert.strictEqual(args.dryRun, true);
});

test('statesFromRaw reads fallback json characterStates', async () => {
  const cli = require('../tools/export-predefined-role-cards');
  const raw = JSON.stringify({ characterStates: { a: sampleState('player-self', '刘悠', 27) } });
  const states = await cli.statesFromRaw(raw);
  assert.strictEqual(states.length, 1);
  assert.strictEqual(states[0].profile.name, '刘悠');
});

test('charators raw exports Liu You as player and three adult triplet role cards', async () => {
  const cli = require('../tools/export-predefined-role-cards');
  const raw = fs.readFileSync(path.join(__dirname, '..', 'tools/charators.txt'), 'utf8');
  const states = await cli.statesFromRaw(raw);
  const bundle = exporter.buildExportBundle(states);
  const cards = Object.fromEntries(bundle.map((item) => [item.name, item.card]));

  assert.strictEqual(cards['刘悠'].id, 'player-self');
  assert.strictEqual(cards['刘悠'].isPlayer, true);
  ['刘思瑶', '刘思琪', '刘思怡'].forEach((name) => {
    assert.strictEqual(cards[name].age, 18);
    assert.strictEqual(cards[name].values.age, 18);
    if (cards[name].birthday) assert.match(String(cards[name].birthday), /^2008-/);
    assert.strictEqual(cards[name].values.intimacy?.sexualExperienceCount || 0, 0);
  });
});

test('main exports bundle from publish slot raw source', async () => {
  const cli = require('../tools/export-predefined-role-cards');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'predefined-slot-main-'));
  const publishDir = path.join(root, 'publish');
  const saveDir = path.join(publishDir, 'save');
  const outDir = path.join(root, 'out');
  fs.mkdirSync(saveDir, { recursive: true });
  fs.writeFileSync(path.join(saveDir, 'control-rpg-sqlite-slot-9.raw'), JSON.stringify({
    characterStates: {
      you: sampleState('player-self', '刘悠', 27),
      siyao: sampleState('rel-1', '刘思瑶'),
      siqi: sampleState('rel-2', '刘思琪'),
      siyi: sampleState('rel-3', '刘思怡'),
    },
  }));

  await cli.main(['--slot', 'slot-9', '--publish', publishDir, '--out', outDir]);

  assert.ok(fs.existsSync(path.join(outDir, 'liu-you.json')));
  assert.ok(fs.existsSync(path.join(outDir, 'liu-siyao.js')));
});

function loadPredefinedRuntimeContext() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        predefinedRoleCardData: {
          'liu-you': { id: 'player-self', name: '刘悠', isPlayer: true, role: '玩家' },
          'liu-siyao': { id: 'rel-1', name: '刘思瑶', role: '三胞胎妹妹之一' },
          'liu-siqi': { id: 'rel-2', name: '刘思琪', role: '三胞胎妹妹之二' },
          'liu-siyi': { id: 'rel-3', name: '刘思怡', role: '三胞胎妹妹之三' },
        },
        sqliteSave: { db: null },
        predefinedRoleCardActions: { cloneRoleCardForEditing: (card) => JSON.parse(JSON.stringify(card)) },
      },
    },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/predefined-role-cards.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/predefined-role-cards.js' });
  return context.window.GameModules;
}

function loadPredefinedRuntime() {
  return loadPredefinedRuntimeContext().predefinedRoleCards;
}

test('predefined runtime loads Liu You and three triplet relationship cards by default', async () => {
  const cardsApi = loadPredefinedRuntime();
  assert.deepStrictEqual(Array.from(cardsApi.keys), ['liu-you', 'liu-siyao', 'liu-siqi', 'liu-siyi']);
  const cards = await cardsApi.loadAll();
  assert.deepStrictEqual(Array.from(cards.map((card) => card.name)), ['刘悠', '刘思瑶', '刘思琪', '刘思怡']);
});

test('initPredefinedRoleCards defaults to Liu You player and three triplet relations', async () => {
  const modules = loadPredefinedRuntimeContext();
  const actions = modules.predefinedRoleCardActions;
  const store = {
    roleCardSetup: {
      cards: [],
      loaded: false,
      selectedPlayerName: '',
      selectedRelationNames: [],
      relationRoles: {},
      gender: '',
      selectedRelationCardName: '',
      usePredefinedPlayerCard: false,
    },
    phoneSetupDone: false,
    ...actions,
  };

  await store.initPredefinedRoleCards();

  assert.strictEqual(store.roleCardSetup.selectedPlayerName, '刘悠');
  assert.deepStrictEqual(Array.from(store.roleCardSetup.selectedRelationNames), ['刘思瑶', '刘思琪', '刘思怡']);
});

test('non-predefined completion keeps original AI-backed setup path', async () => {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-actions.js'), 'utf8'), context, { filename: 'publish/player-setup-actions.js' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-defaults.js'), 'utf8'), context, { filename: 'publish/player-setup-defaults.js' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-guard.js'), 'utf8'), context, { filename: 'publish/player-setup-guard.js' });
  const store = {
    ...context.window.GameModules.playerSetupActions,
    profileSetupBusy: false,
    phoneSetupDone: false,
    phoneActivationChoice: 'new',
    playerName: '',
    playerProfile: { name: '刘悠', birthday: '1998-11-19', relationshipEntries: [], relationships: '' },
    roleCardSetup: { usePredefinedPlayerCard: false },
    normalizePlayerSetupBase(name, birthday) { calls.push('normalizePlayerSetupBase'); return { name, birthday, initializedAt: '2026-06-28T00:00:00.000Z' }; },
    enrichPlayerProfile: async () => { calls.push('enrichPlayerProfile'); return { refinedRole: '工程师' }; },
    normalizeEnrichedPlayerProfile: (base, enriched) => { calls.push('normalizeEnrichedPlayerProfile'); return { ...base, ...enriched }; },
    syncRelationshipTextFromEntries: () => { calls.push('syncRelationshipTextFromEntries'); },
    syncPlayerProfileLexicon: async () => { calls.push('syncPlayerProfileLexicon'); },
    ensurePlayerRpgState: async (refresh) => { calls.push(`ensurePlayerRpgState:${refresh}`); },
    syncRelationshipWechatUsers: async (options) => { calls.push(`syncRelationshipWechatUsers:${options.save}`); },
    syncKnownProfessionsFromProfile: async () => { calls.push('syncKnownProfessionsFromProfile'); },
    save: async () => { calls.push('save'); },
  };
  context.window.GameModules.predefinedRoleCards = {
    saveSelectedRoleCardStates: async () => { calls.push('saveSelectedRoleCardStates'); },
  };

  await store.completePlayerSetup({ source: 'test' });

  assert.deepStrictEqual(calls, [
    'syncRelationshipTextFromEntries',
    'normalizePlayerSetupBase',
    'enrichPlayerProfile',
    'normalizeEnrichedPlayerProfile',
    'syncPlayerProfileLexicon',
    'ensurePlayerRpgState:true',
    'syncRelationshipWechatUsers:false',
    'syncKnownProfessionsFromProfile',
    'save',
  ]);
  assert.strictEqual(store.phoneSetupDone, true);
});

test('defaults alone exposes helper but does not install completePlayerSetup wrapper', async () => {
  const context = vm.createContext({
    console,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-defaults.js'), 'utf8'), context, { filename: 'publish/player-setup-defaults.js' });
  const actions = context.window.GameModules.playerSetupActions;

  assert.strictEqual(typeof actions.completePredefinedPlayerSetup, 'function');
  assert.strictEqual(typeof actions.completePlayerSetup, 'undefined');
});

test('guard fallback completes non-predefined setup without original completePlayerSetup', async () => {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-defaults.js'), 'utf8'), context, { filename: 'publish/player-setup-defaults.js' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-guard.js'), 'utf8'), context, { filename: 'publish/player-setup-guard.js' });
  const store = {
    ...context.window.GameModules.playerSetupActions,
    profileSetupBusy: false,
    phoneActivationChoice: 'new',
    playerName: '',
    playerProfile: { name: '刘悠', birthday: '1998-11-19', city: '上海', dailyRole: '工程师' },
    roleCardSetup: { usePredefinedPlayerCard: false },
    playerAgeFromBirthday: () => 27,
    syncPlayerProfileLexicon: async () => { calls.push('syncPlayerProfileLexicon'); },
    ensurePlayerRpgState: async (refresh) => { calls.push(`ensurePlayerRpgState:${refresh}`); },
    save: async () => { calls.push('save'); },
  };
  context.window.GameModules.predefinedRoleCards = {
    saveSelectedRoleCardStates: async () => { calls.push('saveSelectedRoleCardStates'); },
  };

  await store.completePlayerSetup({ source: 'fallback-test' });

  assert.deepStrictEqual(calls, ['syncPlayerProfileLexicon', 'ensurePlayerRpgState:true', 'save']);
  assert.strictEqual(store.phoneSetupDone, true);
  assert.strictEqual(store.phoneActivationChoice, '');
});

test('existing account completion directly saves selected predefined role-card states without AI ensure', async () => {
  const calls = [];
  const context = vm.createContext({
    console,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-actions.js'), 'utf8'), context, { filename: 'publish/player-setup-actions.js' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-defaults.js'), 'utf8'), context, { filename: 'publish/player-setup-defaults.js' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/player-setup-guard.js'), 'utf8'), context, { filename: 'publish/player-setup-guard.js' });
  const store = {
    ...context.window.GameModules.playerSetupActions,
    profileSetupBusy: false,
    phoneActivationChoice: 'existing',
    playerName: '',
    playerProfile: { name: '刘悠', birthday: '1998-11-19' },
    roleCardSetup: { usePredefinedPlayerCard: true },
    playerAgeFromBirthday: () => 27,
    syncPlayerProfileLexicon: async () => {},
    enrichPlayerProfile: async () => { calls.push('enrichPlayerProfile'); throw new Error('AI should not be requested'); },
    ensurePlayerRpgState: async (refresh) => { calls.push(`ensurePlayerRpgState:${refresh}`); throw new Error('ensurePlayerRpgState should not be requested'); },
    save: async () => { calls.push('save'); },
  };
  context.window.GameModules.predefinedRoleCards = {
    saveSelectedRoleCardStates: async (receivedStore) => {
      calls.push(receivedStore === store ? 'saveSelectedRoleCardStates:this' : 'saveSelectedRoleCardStates:other');
      return [{ id: 'player-self' }, { id: 'rel-1' }, { id: 'rel-2' }, { id: 'rel-3' }];
    },
  };
  await store.completePlayerSetup();
  assert.deepStrictEqual(calls, ['saveSelectedRoleCardStates:this', 'save']);
  assert.strictEqual(calls.includes('enrichPlayerProfile'), false);
  assert.strictEqual(store.phoneSetupDone, true);
});

test('predefined saver persists edited setup cards directly', async () => {
  const saved = [];
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        predefinedRoleCardData: {
          'liu-you': { id: 'player-self', name: '刘悠', isPlayer: true, role: '原始玩家' },
          'liu-siyao': { id: 'rel-1', name: '刘思瑶', role: '原始关系' },
          'liu-siqi': { id: 'rel-2', name: '刘思琪', role: '原始关系' },
          'liu-siyi': { id: 'rel-3', name: '刘思怡', role: '原始关系' },
        },
        sqliteSave: {
          db: true,
          getCharacterState: () => null,
          saveCharacterState: async (state) => { saved.push(JSON.parse(JSON.stringify(state))); },
        },
        characterProfile: {
          hasRequiredInitialMetrics: () => false,
          ensureInitialMetricSources: async () => { throw new Error('AI metric repair should not be requested'); },
        },
        rpgState: {
          ensureSchema: async (worldTag) => ({ worldTag, sections: [] }),
          createCharacterState: (profile, schema) => ({ id: profile.id, name: profile.name, worldTag: schema.worldTag, values: {}, metrics: {}, profile }),
          upgradeCharacterState: () => {},
        },
        rpgProfileMetrics: { rebase: () => {} },
        rpgLexicon: { syncState: async () => {} },
      },
    },
  });
  context.window.window = context.window;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/predefined-role-cards.js'), 'utf8'), context, { filename: 'publish/predefined-role-cards.js' });
  const store = {
    roleCardSetup: {
      usePredefinedPlayerCard: true,
      selectedPlayerName: '刘悠',
      selectedRelationNames: ['刘思瑶', '刘思琪', '刘思怡'],
      cards: [
        { id: 'player-self', name: '刘悠', isPlayer: true, role: '编辑后的玩家', work: '现实世界' },
        { id: 'rel-1', name: '刘思瑶', role: '编辑后的关系1', work: '现实世界' },
        { id: 'rel-2', name: '刘思琪', role: '编辑后的关系2', work: '现实世界' },
        { id: 'rel-3', name: '刘思怡', role: '编辑后的关系3', work: '现实世界' },
      ],
    },
    rpgStates: {},
  };

  await context.window.GameModules.predefinedRoleCards.saveSelectedRoleCardStates(store);

  assert.deepStrictEqual(saved.map((state) => state.profile.role), ['编辑后的玩家', '编辑后的关系1', '编辑后的关系2', '编辑后的关系3']);
  assert.deepStrictEqual(Object.keys(store.rpgStates).sort(), ['player-self', 'rel-1', 'rel-2', 'rel-3'].sort());
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
