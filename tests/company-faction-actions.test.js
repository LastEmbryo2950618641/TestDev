const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const relativeScriptPath = 'company-faction-actions.js';

function loadActions(overrides = {}) {
  const savedStates = [];
  const context = vm.createContext({
    console,
    Date,
    Set,
    window: {
      GameModules: {
        factionSystem: {
          countryFaction: () => null,
        },
        factionOrgForest: {
          DOMAIN_LABELS: { corp: '经济组织' },
          domainRootId: () => 'country-china-corp',
        },
        orgTerritory: {
          normalizeFaction: (faction) => faction,
          resolveOrgIdByName: () => 'company-acme',
          upsertCharacterMembership: (state, row) => {
            state.profile.memberships = [...(state.profile.memberships || []), row];
            return row;
          },
        },
        rpgState: {
          syncSocialFields(state, source = 'profile') {
            const input = source === 'values' ? state.values : state.profile;
            const clone = (value) => (Array.isArray(value) ? value.map((item) => ({ ...item })) : []);
            state.profile.factions = clone(input.factions);
            state.profile.memberships = clone(input.memberships);
            delete state.values.factions;
            delete state.values.memberships;
            return true;
          },
        },
        app: {
          orgTerritory: {
            economyActions: {
              syncCompanyEconomicEntry: () => {},
            },
          },
        },
        characterStateStore: {
          save: async (state) => savedStates.push(state),
        },
        ...overrides,
      },
    },
  });

  const source = fs.readFileSync(path.join(root, 'publish', relativeScriptPath), 'utf8');
  vm.runInContext(source, context, { filename: `publish/${relativeScriptPath}` });
  return { actions: context.window.GameModules.companyFactionActions, savedStates };
}

function createStore(actions, factions = []) {
  return {
    ...actions,
    playerProfile: { name: '测试玩家' },
    companyState: { unitProfilesByFactionId: {}, employment: { activeCompanyId: '' }, currentCompanyId: '' },
    factionState: { factions },
    factionIdByName: () => 'company-acme',
    normalizeFactionStructure: (faction) => faction,
    normalizeFactionRoles: (roles) => roles,
    completeFactionReasons: (_faction, reasons) => reasons || {},
  };
}

async function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'publish', 'boot', 'scripts.json'), 'utf8'));
  assert.ok(manifest.includes(relativeScriptPath), 'company faction actions must load at runtime');

  const { actions, savedStates } = loadActions();

  const emptyStore = createStore(actions);
  const company = emptyStore.upsertCompanyFromBossJob({
    id: 'job-1',
    company: '星河工作室',
    title: '编剧',
    payType: '创作者',
    industry: '影视',
    scale: '20人',
    address: '上海',
  });
  assert.strictEqual(company.type, '文创机构');
  assert.strictEqual(emptyStore.factionState.factions.length, 0, 'Boss company must not auto-create factions');

  const store = createStore(actions, [
    { id: 'country-china', name: '中国', type: '国家', parentId: '' },
    { id: 'country-china-corp', name: '经济组织', type: '组织域', parentId: 'country-china' },
    { id: 'company-acme', name: '星河工作室', type: '公司', parentId: 'country-china-corp', structure: [] },
  ]);
  company.organization = [{ name: '内容部', jobs: [{ title: '编剧', people: ['林青'] }] }];
  const faction = store.ensureCompanyFaction(company, '组织同步测试');
  assert.ok(faction, 'existing AI faction should sync');
  assert.strictEqual(faction.parentId, 'country-china-corp');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(faction.structure)),
    [{ name: '内容部', level: '部门级别', roles: [{ title: '编剧', count: 1, characters: ['林青'] }] }],
  );

  const syncedStore = createStore(actions, [
    { id: 'company-acme', name: '星河工作室', type: '公司', parentId: 'country-china-corp', structure: [] },
  ]);
  syncedStore.companyState.unitProfilesByFactionId['company-acme'] = { factionId: 'company-acme', unitName: '旧资料' };
  syncedStore.upsertCompanyFromBossJob({ id: 'job-2', company: '星河工作室', title: '编剧', payType: '创作者' });
  assert.strictEqual(syncedStore.companyState.currentCompanyId, 'company-acme');
  assert.strictEqual(syncedStore.companyState.unitProfilesByFactionId['company-acme'], undefined, 'existing unit profile should be cleared for AI regeneration');

  const identityState = { profile: { memberships: [] }, values: {} };
  store.playerIdentityState = () => identityState;
  store.phoneDate = () => new Date('2026-07-29T10:00:00.000Z');
  store.addPlayerForcePosition({ force: '星河工作室', position: '应聘编剧' });
  await Promise.resolve();

  assert.strictEqual(identityState.profile.memberships[0].source, 'Boss招聘同步');
  assert.strictEqual(identityState.profile.memberships[0].reason, '由现实职场事项确认。');
  assert.strictEqual(identityState.values.memberships, undefined);
  assert.strictEqual(savedStates.length, 1);
  assert.strictEqual(savedStates[0], identityState);

  console.log('PASS company faction runtime keeps faction as single organization source');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
