const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRoleCardJsonApp(gameModules = {}) {
  const context = vm.createContext({
    console,
    window: { GameModules: gameModules },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/role-card-json-app/role-card-json-app.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/role-card-json-app/role-card-json-app.js' });
  return context.window.GameModules.roleCardJsonApp;
}

function sampleState(overrides = {}) {
  return {
    id: 'rel-1',
    name: '刘思瑶',
    worldTag: '2026 现代都市现实世界',
    profile: { id: 'rel-1', name: '刘思瑶', roleCard: true, work: '2026 现代都市现实世界' },
    values: { level: 1, items: [{ name: '手机' }] },
    metrics: { emotions: { 开心: 50 } },
    memory: { shortTerm: { recent: ['刚刚上线'] } },
    updatedAt: '2026-06-29T10:00:00.000Z',
    schema: { sections: [] },
    ...overrides,
  };
}

test('buildPayload exports all current slot character states as copyable json payload', () => {
  const app = loadRoleCardJsonApp();
  const payload = app.buildPayload({
    slot: 'slot-3',
    states: [sampleState(), sampleState({ id: 'npc-2', name: '路人甲', profile: { name: '路人甲', roleCard: true } })],
    exportedAt: '2026-06-29T12:00:00.000Z',
  });

  assert.strictEqual(payload.slot, 'slot-3');
  assert.strictEqual(payload.exportedAt, '2026-06-29T12:00:00.000Z');
  assert.strictEqual(payload.count, 2);
  assert.deepStrictEqual(payload.characters.map((item) => item.name), ['刘思瑶', '路人甲']);
  assert.deepStrictEqual(plain(payload.characters[0].values.items), [{ name: '手机' }]);
  assert.deepStrictEqual(plain(payload.characters[0].metrics.emotions), { 开心: 50 });
  assert.deepStrictEqual(plain(payload.characters[0].memory.shortTerm.recent), ['刚刚上线']);
});

test('formatPayload returns pretty json text for textarea copying', () => {
  const app = loadRoleCardJsonApp();
  const text = app.formatPayload({ slot: 'slot-1', exportedAt: '2026-06-29T12:00:00.000Z', count: 0, characters: [] });
  assert.strictEqual(text, '{\n  "slot": "slot-1",\n  "exportedAt": "2026-06-29T12:00:00.000Z",\n  "count": 0,\n  "characters": []\n}');
});

test('actions refreshRoleCardJsonText reads sqliteSave listCharacterStates and updates txt fields', async () => {
  const app = loadRoleCardJsonApp({
    sqliteSave: {
      activeSlot: 'slot-7',
      listCharacterStates: () => [sampleState()],
    },
  });
  const store = {
    selectedSlot: 'slot-7',
    roleCardJsonText: '',
    roleCardJsonMeta: { slot: '', count: 0, exportedAt: '' },
    roleCardJsonError: '',
  };
  const previousDate = global.Date;
  const fixedNow = '2026-06-29T12:00:00.000Z';
  class FixedDate extends previousDate {
    constructor(...args) { super(...(args.length ? args : [fixedNow])); }
    static now() { return new previousDate(fixedNow).getTime(); }
  }
  try {
    global.Date = FixedDate;
    await app.actions.refreshRoleCardJsonText.call(store);
  } finally {
    global.Date = previousDate;
  }

  assert.strictEqual(store.roleCardJsonError, '');
  assert.strictEqual(store.roleCardJsonMeta.slot, 'slot-7');
  assert.strictEqual(store.roleCardJsonMeta.count, 1);
  assert.ok(!Number.isNaN(Date.parse(store.roleCardJsonMeta.exportedAt)));
  assert.ok(store.roleCardJsonText.includes('"name": "刘思瑶"'));
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
