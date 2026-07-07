const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadPredefinedRoleCards(modules = {}) {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        ...modules,
      },
    },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish', 'predefined-role-cards.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/predefined-role-cards.js' });
  return context.window.GameModules.predefinedRoleCards;
}

test('predefined role cards refresh social fields can clear stale source memberships and factions', () => {
  const cards = loadPredefinedRoleCards({
    characterProfile: {
      factionRoles: () => [],
      memberships: () => [],
    },
  });
  const profile = {
    faction: '旧势力',
    factionRole: '旧身份',
    rank: '公民',
    factions: [{ faction: '旧势力', role: '旧身份', reason: '源卡旧值' }],
    memberships: [{ orgName: '中华人民共和国', title: '公民', reason: '源卡旧值' }],
  };
  cards.refreshSocialFields(profile, null);
  cards.refreshDerivedIdentityFields(profile);
  assert.deepStrictEqual(profile.factions, []);
  assert.deepStrictEqual(profile.memberships, []);
  assert.strictEqual(profile.faction, '');
  assert.strictEqual(profile.factionRole, '');
  assert.strictEqual(profile.rank, '');
});

test('predefined role cards loadAll refreshes preview identity fields from current inference logic', async () => {
  const cards = loadPredefinedRoleCards({
    predefinedRoleCardData: {
      demo: {
        id: 'demo-card',
        name: '测试角色',
        faction: '旧势力',
        factionRole: '旧身份',
        rank: '公民',
        factions: [{ faction: '旧势力', role: '旧身份', reason: '源卡旧值' }],
        memberships: [{ orgName: '中华人民共和国', title: '公民', reason: '源卡旧值' }],
      },
    },
    predefinedRoleCardActions: {
      cloneRoleCardForEditing: (card) => deepClone(card),
    },
    characterProfile: {
      factionRoles: () => [{ faction: '刘家', role: '家庭成员', reason: '当前推导' }],
      memberships: () => [{ orgName: '成都星河云栈科技有限公司', title: '程序工程师', reason: '当前推导' }],
    },
  });
  cards.keys = ['demo'];
  const [profile] = await cards.loadAll();
  assert.ok(profile);
  assert.strictEqual(profile.faction, '刘家');
  assert.strictEqual(profile.factionRole, '家庭成员');
  assert.strictEqual(profile.rank, '程序工程师');
  assert.strictEqual(profile.memberships[0].orgName, '成都星河云栈科技有限公司');
  assert.strictEqual(profile.memberships[0].title, '程序工程师');
});

test('character profile part1 social backfill no longer trusts preset faction records as canonical truth', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'publish', 'character-profile.js'), 'utf8');
  assert.ok(script.includes('this.factionRoles(out, base, store)'));
  assert.ok(!script.includes('preset?.factions?.length'));
});

test('runtime code does not read social or faction truth directly from predefined role card source blobs', () => {
  const characterProfile = fs.readFileSync(path.join(__dirname, '..', 'publish', 'character-profile.js'), 'utf8');
  const predefinedCards = fs.readFileSync(path.join(__dirname, '..', 'publish', 'predefined-role-cards.js'), 'utf8');
  const rpgFieldUi = fs.readFileSync(path.join(__dirname, '..', 'publish', 'rpg-field-ui.js'), 'utf8');
  const forbidden = [
    'sourceCard?.memberships',
    'sourceCard?.factions',
    'sourceCard?.rank',
    'sourceCard?.faction',
    'sourceCard?.factionRole',
    'sourceCard?.country',
    'sourceCard?.nationality',
    'preset?.memberships?.length',
    'preset?.factions?.length',
  ];
  forbidden.forEach((pattern) => {
    assert.ok(!characterProfile.includes(pattern), `character-profile.js should not include ${pattern}`);
    assert.ok(!predefinedCards.includes(pattern), `predefined-role-cards.js should not include ${pattern}`);
    assert.ok(!rpgFieldUi.includes(pattern), `rpg-field-ui.js should not include ${pattern}`);
  });
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
