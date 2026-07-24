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

function createContext() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        realWorld2026: { label: '2026 现代都市现实世界' },
        characterQuery: {
          normalizeWorldTag(value = '') {
            const text = String(value || '').trim();
            if (!text) return '';
            if (this.isRealWorldTag(text)) return '2026 现代都市现实世界';
            return text;
          },
          isRealWorldTag(value = '') {
            const text = String(value || '').trim();
            return ['现实世界', '现代都市现实世界', '2026 现代都市现实世界'].includes(text);
          },
        },
        factionOrgForest: {
          DOMAIN_LABELS: { corp: '经济组织' },
          domainRootId(sovereignId, domain) {
            return `${sovereignId}-domain-${domain}`;
          },
        },
        orgTerritory: {
          defaultOverviewPanels() {
            return { ideology: {}, economy: { entries: {} }, politics: { entries: {} }, military: { entries: {} }, diplomacy: { entries: {} } };
          },
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/faction-system.js');
  return context;
}

test('inferTopCountry never invents a country from profile', () => {
  const context = createContext();
  const system = context.window.GameModules.factionSystem;
  assert.strictEqual(system.inferTopCountry({ work: '2026 现代都市现实世界', refinedRole: '记者' }), null);
  assert.strictEqual(system.inferTopCountry({ work: 'Fate/stay night', refinedRole: '魔术师学徒' }), null);
});

test('countryFaction and companyFaction never seed stubs', () => {
  const context = createContext();
  const system = context.window.GameModules.factionSystem;
  assert.strictEqual(system.countryFaction({ work: '2026 现代都市现实世界' }), null);
  assert.strictEqual(system.companyFaction({ workplace: '星河云栈' }), null);
});

test('defaultState starts with empty factions for all profiles', () => {
  const context = createContext();
  const system = context.window.GameModules.factionSystem;
  for (const profile of [
    { work: '2026 现代都市现实世界', refinedRole: '自由职业者' },
    { work: '原创异世界', refinedRole: '旅行者' },
  ]) {
    const state = system.defaultState(profile);
    assert.strictEqual(Array.isArray(state.factions), true);
    assert.strictEqual(state.factions.length, 0);
    assert.strictEqual(state.selectedId, '');
  }
});

test('ensureDomainRoots never invents domain-root stubs', () => {
  const context = createContext();
  loadScript(context, 'publish/faction-org-forest.js');
  const forest = context.window.GameModules.factionOrgForest;
  const sovereign = { id: 'country-china', name: '中华人民共和国', type: '国家', parentId: '' };
  const result = forest.ensureDomainRoots([sovereign], sovereign);
  assert.strictEqual(result.created.length, 0);
  assert.strictEqual(result.factions.length, 1);
  assert.strictEqual(result.factions[0].id, 'country-china');
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
