const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadFactionOrgActions() {
  const context = vm.createContext({
    console,
    window: {
      GameModules: {
        orgTerritory: {
          normalizeOverviewPanels: (panels) => panels,
          defaultOverviewPanels: () => ({
            ideology: {},
            economy: { entries: {} },
            politics: { entries: {} },
            military: { entries: {} },
            diplomacy: { entries: {} },
          }),
          stateBadge: () => '',
        },
      },
    },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/faction-org-actions.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/faction-org-actions.js' });
  return context.window.GameModules.factionOrgActions;
}

test('country ideology panel stays fogged when only legitimacy placeholder exists', () => {
  const actions = loadFactionOrgActions();
  const faction = {
    id: 'country-china',
    name: '中华人民共和国',
    classification: 'country',
    solid: {
      overviewPanels: {
        ideology: {
          legitimacy: { value: 0, unit: '/100' },
        },
        economy: { entries: {} },
        politics: { entries: {} },
        military: { entries: {} },
        diplomacy: { entries: {} },
      },
    },
  };
  const store = {
    ...actions,
    selectedFaction: () => faction,
  };
  const ideologyCard = store.buildFactionCapabilityCards(faction).find((card) => card.dim === 'ideology');
  assert.ok(ideologyCard);
  assert.strictEqual(ideologyCard.rankLabel, '迷雾未展开');
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
