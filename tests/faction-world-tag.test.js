const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadOrgTerritory() {
  const context = vm.createContext({
    console,
    window: { GameModules: {} },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/org-territory-system.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/org-territory-system.js' });
  return context.window.GameModules.orgTerritory;
}

test('normalizeFaction fills worldTag from store when missing', () => {
  const ot = loadOrgTerritory();
  const store = {
    currentWorldTag: () => 'Fate/stay night',
  };
  const next = ot.normalizeFaction({ id: 'country-china', name: '中华人民共和国', type: '国家' }, store);
  assert.strictEqual(next.worldTag, 'Fate/stay night');
});

test('normalizeFaction keeps explicit worldTag and maps 所属世界 alias', () => {
  const ot = loadOrgTerritory();
  const store = { currentWorldTag: () => '现实世界' };
  const kept = ot.normalizeFaction({ id: 'a', name: '甲', worldTag: '异世界甲' }, store);
  assert.strictEqual(kept.worldTag, '异世界甲');
  const mapped = ot.normalizeFaction({ id: 'b', name: '乙', 所属世界: '异世界乙' }, store);
  assert.strictEqual(mapped.worldTag, '异世界乙');
  assert.strictEqual(mapped.所属世界, undefined);
});

test('faction detail UI shows 所属世界 from worldTag', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'publish/index.html'), 'utf8');
  assert.ok(html.includes('所属世界：'));
  assert.ok(html.includes('selectedFaction()?.worldTag'));
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
