const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const actionPath = path.join(root, 'publish/org-territory-actions.js');
const familyActionPath = path.join(root, 'publish/app/org-territory/family-actions.js');
const requiredMethods = [
  'applyLegacyStructure',
  'applySettlementUpdates',
  'ensureAdminOrgStub',
  'ensureFamilyOrg',
  'linkFamilyToCommunity',
  'syncCompanyEconomicEntry',
  'syncEmploymentOnOrgDissolved',
  'syncPlayerWealthAsset',
];

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const systemIndex = scripts.indexOf('org-territory-system.js');
  const familyActionsIndex = scripts.indexOf('app/org-territory/family-actions.js');
  const actionsIndex = scripts.indexOf('org-territory-actions.js');
  const factionActionsIndex = scripts.indexOf('faction-actions.js');
  const earlyWealthIndex = scripts.indexOf('player-wealth-actions.js');
  assert.ok(systemIndex >= 0 && systemIndex < familyActionsIndex, `${relativePath} must load orgTerritory before familyActions`);
  assert.strictEqual(familyActionsIndex + 1, actionsIndex, `${relativePath} must load familyActions immediately before the compatibility facade`);
  assert.ok(earlyWealthIndex < actionsIndex, `${relativePath} must not activate orgTerritoryActions before faction initialization is available`);
  assert.strictEqual(actionsIndex + 1, factionActionsIndex, `${relativePath} must load orgTerritoryActions immediately before factionActions`);
}

for (const relativePath of [
  'publish/boot/script-manifest.js',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js',
]) {
  const manifestContext = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), manifestContext, { filename: relativePath });
  const runtimeScripts = Object.values(manifestContext.window.GameScriptManifest.chunks).flat();
  const systemIndex = runtimeScripts.indexOf('org-territory-system.js');
  const familyActionsIndex = runtimeScripts.indexOf('app/org-territory/family-actions.js');
  const facadeIndex = runtimeScripts.indexOf('org-territory-actions.js');
  assert.ok(systemIndex >= 0 && systemIndex < familyActionsIndex, `${relativePath} must load orgTerritory before familyActions`);
  assert.ok(familyActionsIndex < facadeIndex, `${relativePath} must load familyActions before the compatibility facade`);
}

const source = fs.readFileSync(actionPath, 'utf8');
assert.doesNotMatch(source, /window\.GameModules\.sqliteSave/u, 'org territory actions must use shared stores');
assert.ok(fs.existsSync(familyActionPath), 'family actions must live under publish/app/org-territory');

const context = vm.createContext({ window: { GameModules: {} } });
vm.runInContext(fs.readFileSync(familyActionPath, 'utf8'), context, { filename: 'app/org-territory/family-actions.js' });
vm.runInContext(source, context, { filename: 'org-territory-actions.js' });
const actions = context.window.GameModules.orgTerritoryActions;
const familyActions = context.window.GameModules.app?.orgTerritory?.familyActions;
for (const method of ['ensureFamilyOrg', 'syncFamilyTerritoryAnchor', 'ensureAdminOrgStub', 'linkFamilyToCommunity']) {
  assert.strictEqual(typeof familyActions?.[method], 'function', `familyActions.${method} must be available at runtime`);
}
for (const method of requiredMethods) assert.strictEqual(typeof actions[method], 'function', `${method} must be available at runtime`);

for (const relativePath of [
  'publish/company-faction-actions.js',
  'publish/faction-actions.js',
  'publish/item-skill-actions.js',
  'publish/org-territory-system.js',
  'publish/player-wealth-actions.js',
  'publish/real-world-actions.js',
  'publish/real-world-faction-actions.js',
  'publish/real-world-map-geopolitical.js',
  'publish/taobao-buy-actions.js',
]) {
  const consumer = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const names = [...consumer.matchAll(/orgTerritoryActions\?\.([A-Za-z_$][\w$]*)/gu)].map((match) => match[1]);
  for (const name of names) assert.strictEqual(typeof actions[name], 'function', `${relativePath} calls missing orgTerritoryActions.${name}`);
}

const systemConsumer = fs.readFileSync(path.join(root, 'publish/org-territory-system.js'), 'utf8');
assert.doesNotMatch(systemConsumer, /orgTerritoryActions\?\.ensureFamilyOrg/u, 'org territory system must call familyActions.ensureFamilyOrg directly');
const geopoliticalConsumer = fs.readFileSync(path.join(root, 'publish/real-world-map-geopolitical.js'), 'utf8');
assert.doesNotMatch(geopoliticalConsumer, /orgTerritoryActions/u, 'geopolitical map must call the focused family actions module directly');

const integrationContext = vm.createContext({
  console,
  Date,
  window: {
    GameModules: {
      factionSystem: {
        inferTopCountry: () => ({ id: 'country-china' }),
      },
    },
  },
});
for (const relativePath of [
  'publish/org-territory-system.js',
  'publish/app/org-territory/family-actions.js',
  'publish/org-territory-actions.js',
  'publish/real-world-map-geopolitical.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), integrationContext, { filename: relativePath });
}

const modules = integrationContext.window.GameModules;
let nestedEnsureCalls = 0;
modules.realWorldMap = {
  inferHomeName: () => '幸福花园',
  upsertNode(map, data) {
    let node = map.nodes.find((item) => item.name === data.name);
    if (!node) {
      node = { id: `node-${map.nodes.length + 1}`, name: data.name, parentId: data.parentId || '' };
      map.nodes.push(node);
    }
    return node;
  },
  ensure() {
    nestedEnsureCalls += 1;
    throw new Error('geopolitical initialization must reuse the active map');
  },
};

const store = {
  playerProfile: { name: '测试玩家', refinedCity: '广东省深圳市南山区幸福花园' },
  factionState: {
    factions: [{
      id: 'country-china',
      name: '中华人民共和国',
      type: '国家',
      parentId: '',
      overviewPanels: {},
    }],
  },
  initFactionSystem() {},
  phoneDate: () => new Date('2026-07-14T00:00:00.000Z'),
};
const activeMap = { nodes: [{ id: 'home-node', name: '幸福花园', parentId: '' }] };
modules.realWorldMapGeopolitical.ensure(store, activeMap, store.playerProfile);
const family = store.factionState.factions.find((faction) => faction.id === 'family-player-home');
const community = store.factionState.factions.find((faction) => faction.kind === 'community');
assert.strictEqual(nestedEnsureCalls, 0, 'geopolitical initialization must not recursively ensure the active map');
assert.ok(family && community, 'geopolitical initialization must create family and community organizations');
assert.strictEqual(family.parentId, community.id, 'family organization must attach to the generated community');
assert.ok(family.territoryAnchors.includes('home-node'), 'family organization must retain the active home map anchor');

const territory = modules.orgTerritory;
assert.strictEqual(
  territory.locationsCompatible('四川省成都市武侯区玉林街道', '当前位置未知'),
  true,
  'unknown location placeholders must not create consistency conflicts',
);
const complianceMap = {
  nodes: [
    { id: 'province', name: '四川省', revealed: false },
    { id: 'home', name: '四川省成都市武侯区玉林街道幸福花园', revealed: true },
  ],
};
modules.realWorldMap.ensure = () => complianceMap;
const originalTerritoryHotText = territory.territoryHotText;
territory.territoryHotText = () => '四川省成都市武侯区玉林街道幸福花园｜控势：中华人民共和国';
const compliance = territory.validatePrincipleCompliance(store);
territory.territoryHotText = originalTerritoryHotText;
assert.ok(
  !compliance.notes.some((note) => note.startsWith('C6')),
  'an unrevealed parent name contained inside a visible full address must not be reported as a Territory Hot leak',
);

console.log('PASS organization territory actions load before all live consumers');
