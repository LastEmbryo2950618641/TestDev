const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const actionPath = path.join(root, 'publish/org-territory-actions.js');
const androidActionPath = path.join(root, 'mobile/android-webview-shell/app/src/main/assets/publish/org-territory-actions.js');
const familyActionPath = path.join(root, 'publish/app/org-territory/family-actions.js');
const recordHelperPath = path.join(root, 'publish/app/org-territory/record-helpers.js');
const economyActionPath = path.join(root, 'publish/app/org-territory/economy-actions.js');
const updateRulesPath = path.join(root, 'publish/domain/org-territory/update-rules.js');
const settlementActionPath = path.join(root, 'publish/app/org-territory/settlement-actions.js');
assert.ok(!fs.existsSync(actionPath), 'legacy org territory action facade must be removed after all consumers migrate');
assert.ok(!fs.existsSync(androidActionPath), 'Android assets must not retain the removed org territory action facade');

for (const relativePath of [
  'publish/boot/scripts.json',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/scripts.json',
]) {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  const systemIndex = scripts.indexOf('org-territory-system.js');
  const updateRulesIndex = scripts.indexOf('domain/org-territory/update-rules.js');
  const recordHelpersIndex = scripts.indexOf('app/org-territory/record-helpers.js');
  const familyActionsIndex = scripts.indexOf('app/org-territory/family-actions.js');
  const economyActionsIndex = scripts.indexOf('app/org-territory/economy-actions.js');
  const settlementActionsIndex = scripts.indexOf('app/org-territory/settlement-actions.js');
  const factionActionsIndex = scripts.indexOf('faction-actions.js');
  assert.ok(systemIndex >= 0 && systemIndex < updateRulesIndex, `${relativePath} must load orgTerritory before updateRules`);
  assert.strictEqual(updateRulesIndex + 1, recordHelpersIndex, `${relativePath} must load updateRules immediately before recordHelpers`);
  assert.strictEqual(recordHelpersIndex + 1, familyActionsIndex, `${relativePath} must load recordHelpers immediately before familyActions`);
  assert.strictEqual(familyActionsIndex + 1, economyActionsIndex, `${relativePath} must load familyActions immediately before economyActions`);
  assert.strictEqual(economyActionsIndex + 1, settlementActionsIndex, `${relativePath} must load economyActions immediately before settlementActions`);
  assert.strictEqual(settlementActionsIndex + 1, factionActionsIndex, `${relativePath} must load settlementActions immediately before factionActions`);
  assert.ok(!scripts.includes('org-territory-actions.js'), `${relativePath} must not load the removed compatibility facade`);
}

for (const relativePath of [
  'publish/boot/script-manifest.js',
  'mobile/android-webview-shell/app/src/main/assets/publish/boot/script-manifest.js',
]) {
  const manifestContext = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), manifestContext, { filename: relativePath });
  const runtimeScripts = Object.values(manifestContext.window.GameScriptManifest.chunks).flat();
  const systemIndex = runtimeScripts.indexOf('org-territory-system.js');
  const updateRulesIndex = runtimeScripts.indexOf('domain/org-territory/update-rules.js');
  const recordHelpersIndex = runtimeScripts.indexOf('app/org-territory/record-helpers.js');
  const familyActionsIndex = runtimeScripts.indexOf('app/org-territory/family-actions.js');
  const economyActionsIndex = runtimeScripts.indexOf('app/org-territory/economy-actions.js');
  const settlementActionsIndex = runtimeScripts.indexOf('app/org-territory/settlement-actions.js');
  const factionActionsIndex = runtimeScripts.indexOf('faction-actions.js');
  assert.ok(systemIndex >= 0 && systemIndex < updateRulesIndex, `${relativePath} must load orgTerritory before updateRules`);
  assert.ok(updateRulesIndex < recordHelpersIndex, `${relativePath} must load updateRules before recordHelpers`);
  assert.ok(recordHelpersIndex < familyActionsIndex, `${relativePath} must load recordHelpers before familyActions`);
  assert.ok(familyActionsIndex < economyActionsIndex, `${relativePath} must load familyActions before economyActions`);
  assert.ok(economyActionsIndex < settlementActionsIndex, `${relativePath} must load economyActions before settlementActions`);
  assert.ok(settlementActionsIndex < factionActionsIndex, `${relativePath} must load settlementActions before factionActions`);
  assert.ok(!runtimeScripts.includes('org-territory-actions.js'), `${relativePath} must not load the removed compatibility facade`);
}

assert.ok(fs.existsSync(familyActionPath), 'family actions must live under publish/app/org-territory');
assert.ok(fs.existsSync(recordHelperPath), 'record helpers must live under publish/app/org-territory');
assert.ok(fs.existsSync(economyActionPath), 'economy actions must live under publish/app/org-territory');
assert.ok(fs.existsSync(updateRulesPath), 'update rules must live under publish/domain/org-territory');
assert.ok(fs.existsSync(settlementActionPath), 'settlement actions must live under publish/app/org-territory');
for (const modulePath of [familyActionPath, recordHelperPath, economyActionPath, updateRulesPath, settlementActionPath]) {
  assert.doesNotMatch(fs.readFileSync(modulePath, 'utf8'), /window\.GameModules\.sqliteSave/u, `${modulePath} must use shared stores`);
}

const context = vm.createContext({ window: { GameModules: {} } });
vm.runInContext(fs.readFileSync(updateRulesPath, 'utf8'), context, { filename: 'domain/org-territory/update-rules.js' });
vm.runInContext(fs.readFileSync(recordHelperPath, 'utf8'), context, { filename: 'app/org-territory/record-helpers.js' });
vm.runInContext(fs.readFileSync(familyActionPath, 'utf8'), context, { filename: 'app/org-territory/family-actions.js' });
vm.runInContext(fs.readFileSync(economyActionPath, 'utf8'), context, { filename: 'app/org-territory/economy-actions.js' });
vm.runInContext(fs.readFileSync(settlementActionPath, 'utf8'), context, { filename: 'app/org-territory/settlement-actions.js' });
const familyActions = context.window.GameModules.app?.orgTerritory?.familyActions;
for (const method of ['ensureFamilyOrg', 'syncFamilyTerritoryAnchor', 'ensureAdminOrgStub', 'linkFamilyToCommunity']) {
  assert.strictEqual(typeof familyActions?.[method], 'function', `familyActions.${method} must be available at runtime`);
}
const recordHelpers = context.window.GameModules.app?.orgTerritory?.recordHelpers;
for (const method of ['appendOrgTerritorySystemRecord', 'ensureFactionSolid', 'overviewEntryKey', 'upsertOverviewEntry']) {
  assert.strictEqual(typeof recordHelpers?.[method], 'function', `recordHelpers.${method} must be available at runtime`);
}
const economyActions = context.window.GameModules.app?.orgTerritory?.economyActions;
for (const method of ['syncCompanyEconomicEntry', 'syncPlayerWealthAsset', 'applyOrgStatusEconomicCascade', 'syncEmploymentOnOrgDissolved']) {
  assert.strictEqual(typeof economyActions?.[method], 'function', `economyActions.${method} must be available at runtime`);
}
const updateRules = context.window.GameModules.domain?.orgTerritory?.updateRules;
assert.strictEqual(JSON.stringify(updateRules?.parseStructurePath('solid.structure.后勤.roles')), JSON.stringify({ nodeName: '后勤', tail: ['roles'] }), 'structure paths must preserve node and tail parsing');
assert.strictEqual(updateRules?.settlementRank('org-status'), 0, 'org status updates must settle first');
assert.strictEqual(updateRules?.settlementRank('territory-control'), 1, 'territory updates must settle second');
assert.strictEqual(updateRules?.settlementRank('membership'), 2, 'other updates must settle after status and territory');
const settlementActions = context.window.GameModules.app?.orgTerritory?.settlementActions;
for (const method of ['applyTerritoryControl', 'applyFactionStructureUpdate', 'applyOrgOverviewPanel', 'applyMembershipUpdate', 'applyOrgStatus', 'applySettlementUpdates', 'applyLegacyStructure']) {
  assert.strictEqual(typeof settlementActions?.[method], 'function', `settlementActions.${method} must be available at runtime`);
}
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
  assert.doesNotMatch(consumer, /orgTerritoryActions/u, `${relativePath} must not call the removed compatibility facade`);
}

const systemConsumer = fs.readFileSync(path.join(root, 'publish/org-territory-system.js'), 'utf8');
assert.doesNotMatch(systemConsumer, /orgTerritoryActions\?\.ensureFamilyOrg/u, 'org territory system must call familyActions.ensureFamilyOrg directly');
const geopoliticalConsumer = fs.readFileSync(path.join(root, 'publish/real-world-map-geopolitical.js'), 'utf8');
assert.doesNotMatch(geopoliticalConsumer, /orgTerritoryActions/u, 'geopolitical map must call the focused family actions module directly');
for (const [relativePath, method] of [
  ['publish/company-faction-actions.js', 'syncCompanyEconomicEntry'],
  ['publish/faction-actions.js', 'syncPlayerWealthAsset'],
  ['publish/item-skill-actions.js', 'syncPlayerWealthAsset'],
  ['publish/player-wealth-actions.js', 'syncPlayerWealthAsset'],
  ['publish/taobao-buy-actions.js', 'syncPlayerWealthAsset'],
  ['publish/org-territory-system.js', 'syncEmploymentOnOrgDissolved'],
]) {
  const consumer = fs.readFileSync(path.join(root, relativePath), 'utf8');
  assert.doesNotMatch(consumer, new RegExp(`orgTerritoryActions\\?\\.${method}`, 'u'), `${relativePath} must call economyActions.${method} directly`);
}
const realWorldConsumer = fs.readFileSync(path.join(root, 'publish/real-world-actions.js'), 'utf8');
assert.doesNotMatch(realWorldConsumer, /orgTerritoryActions\?\.applySettlementUpdates/u, 'real-world actions must call settlementActions.applySettlementUpdates directly');
const legacyFactionConsumer = fs.readFileSync(path.join(root, 'publish/real-world-faction-actions.js'), 'utf8');
assert.doesNotMatch(legacyFactionConsumer, /orgTerritoryActions/u, 'legacy faction updates must call settlementActions.applyLegacyStructure directly');

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
  'publish/domain/org-territory/update-rules.js',
  'publish/app/org-territory/record-helpers.js',
  'publish/app/org-territory/family-actions.js',
  'publish/app/org-territory/economy-actions.js',
  'publish/app/org-territory/settlement-actions.js',
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
modules.realWorldMap.ensure = () => activeMap;

const economy = modules.app.orgTerritory.economyActions;
economy.syncPlayerWealthAsset(store, { wealthAmount: 12345, wealthTier: '小康' });
const moneyEntry = family.solid.overviewPanels.economy.entries.money;
assert.strictEqual(moneyEntry.value, 12345, 'wealth mirror must preserve the normalized amount');
assert.strictEqual(moneyEntry.wealthMirror.tier, '小康', 'wealth mirror must preserve the normalized tier');
economy.syncCompanyEconomicEntry(store, family, { name: '测试公司', industry: '软件', scale: '小型', location: '深圳' }, '公司同步');
assert.strictEqual(family.solid.overviewPanels.economy.entries['econ-family-player-home'].source, 'company-app', 'company mirror must preserve its source');

store.companyState = {
  employment: { active: true, startAt: '2026-01-01T00:00:00.000Z' },
  employmentRecords: [{ status: '在职', startAt: '2026-01-01T00:00:00.000Z', duration: '' }],
};
store.currentCompany = () => ({ name: '测试公司' });
store.employmentDurationText = () => '6个月';
const dissolvedCompany = { id: 'company-main', name: '测试公司', status: 'dissolved' };
assert.strictEqual(economy.syncEmploymentOnOrgDissolved(store, dissolvedCompany, '组织解散'), true, 'dissolved player company must end active employment');
assert.strictEqual(store.companyState.employment.active, false, 'employment must become inactive');
assert.strictEqual(store.companyState.employmentRecords[0].status, '已离职', 'employment record must become resigned');
assert.strictEqual(store.companyState.employmentRecords[0].duration, '6个月', 'employment duration must be preserved through the store helper');

const dispatchCalls = [];
const integrationSettlementActions = modules.app.orgTerritory.settlementActions;
const originalDedupe = modules.orgTerritory.dedupeOrgTerritoryUpdates;
const originalApplyStatus = integrationSettlementActions.applyOrgStatus;
const originalApplyTerritory = integrationSettlementActions.applyTerritoryControl;
const originalApplyMembership = integrationSettlementActions.applyMembershipUpdate;
modules.orgTerritory.dedupeOrgTerritoryUpdates = (updates) => updates;
integrationSettlementActions.applyOrgStatus = () => { dispatchCalls.push('org-status'); return { text: 'status' }; };
integrationSettlementActions.applyTerritoryControl = () => { dispatchCalls.push('territory-control'); return { text: 'territory' }; };
integrationSettlementActions.applyMembershipUpdate = () => { dispatchCalls.push('membership'); return { text: 'membership' }; };
const dispatchLines = integrationSettlementActions.applySettlementUpdates(store, [
  { updateType: 'membership' },
  { updateType: 'territory-control' },
  { updateType: 'org-status' },
]);
assert.strictEqual(dispatchCalls.join(','), 'org-status,territory-control,membership', 'settlement dispatch must preserve status and territory priority');
assert.strictEqual(dispatchLines.join(','), 'status,territory,membership', 'settlement dispatch must preserve result text order');
dispatchCalls.length = 0;
store.orgTerritoryReconciliationLog = [];
integrationSettlementActions.applyMembershipUpdate = () => { dispatchCalls.push('membership'); return { text: 'membership' }; };
const originalWarn = console.warn;
const settlementWarnings = [];
console.warn = (...args) => settlementWarnings.push(args.join(' '));
try {
  integrationSettlementActions.applySettlementUpdates(store, Array.from({ length: 14 }, () => ({ updateType: 'membership' })));
} finally {
  console.warn = originalWarn;
}
assert.strictEqual(dispatchCalls.length, 12, 'settlement dispatch must preserve the per-turn update limit');
assert.strictEqual(store.orgTerritoryReconciliationLog[0].dropped, 2, 'settlement dispatch must record truncated updates');
assert.ok(settlementWarnings.some((line) => line.includes('丢弃 2 条')), 'settlement dispatch must report truncated updates');
modules.orgTerritory.dedupeOrgTerritoryUpdates = originalDedupe;
integrationSettlementActions.applyOrgStatus = originalApplyStatus;
integrationSettlementActions.applyTerritoryControl = originalApplyTerritory;
integrationSettlementActions.applyMembershipUpdate = originalApplyMembership;

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
