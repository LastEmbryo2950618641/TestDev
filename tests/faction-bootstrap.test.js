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

test('inferTopCountry defaults to China only for real-world profiles without country clues', () => {
  const context = createContext();
  const system = context.window.GameModules.factionSystem;
  const top = system.inferTopCountry({ work: '2026 现代都市现实世界', refinedRole: '记者' });
  assert.ok(top);
  assert.strictEqual(top.name, '中华人民共和国');
});

test('inferTopCountry keeps non-real-world profiles unresolved when no country clues exist', () => {
  const context = createContext();
  const system = context.window.GameModules.factionSystem;
  const top = system.inferTopCountry({ work: 'Fate/stay night', refinedRole: '魔术师学徒' });
  assert.strictEqual(top, null);
});

test('defaultState does not fabricate a company when workplace context is missing', () => {
  const context = createContext();
  const system = context.window.GameModules.factionSystem;
  const state = system.defaultState({ work: '2026 现代都市现实世界', refinedRole: '自由职业者' });
  assert.strictEqual(state.factions.length, 1);
  assert.strictEqual(state.factions[0].id, 'country-china');
  assert.strictEqual(state.selectedId, 'country-china');
});

test('defaultState keeps non-real-world unknown affiliation empty until later inference', () => {
  const context = createContext();
  const system = context.window.GameModules.factionSystem;
  const state = system.defaultState({ work: '原创异世界', refinedRole: '旅行者' });
  assert.strictEqual(Array.isArray(state.factions), true);
  assert.strictEqual(state.factions.length, 0);
  assert.strictEqual(state.selectedId, '');
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
