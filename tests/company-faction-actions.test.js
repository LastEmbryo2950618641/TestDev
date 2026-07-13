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
        companySystem: {
          defaultCompany: (name) => ({
            id: '',
            name,
            type: '公司',
            industry: '未知行业',
            scale: '未知规模',
            location: '未知地点',
            openings: [],
            organization: [],
          }),
        },
        factionSystem: {
          countryFaction: () => ({ id: 'country-china', name: '中国', type: '国家' }),
        },
        factionOrgForest: {
          DOMAIN_LABELS: { corp: '经济组织' },
          domainRootId: () => 'country-china-corp',
        },
        orgTerritory: {
          normalizeFaction: (faction) => faction,
          resolveOrgIdByName: () => 'company-acme',
          upsertCharacterMembership: (state, row) => {
            state.values.memberships = [...(state.values.memberships || []), row];
            return row;
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

function createStore(actions) {
  return {
    ...actions,
    playerProfile: { name: '测试玩家' },
    companyState: { companies: [] },
    factionState: {
      factions: [
        { id: 'country-china', name: '中国', type: '国家', parentId: '' },
        { id: 'country-china-corp', name: '经济组织', type: '组织域', parentId: 'country-china' },
      ],
    },
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
  const store = createStore(actions);
  const company = store.upsertCompanyFromBossJob({
    id: 'job-1',
    company: '星河工作室',
    title: '编剧',
    payType: '创作者',
    industry: '影视',
    scale: '20人',
    address: '上海',
  });

  assert.strictEqual(company.type, '文创机构');
  assert.strictEqual(company.openings[0].name, '编剧');
  assert.strictEqual(company.openings[0].desc, '由Boss招聘记录同步。');
  const faction = store.factionState.factions.find((item) => item.name === '星河工作室');
  assert.ok(faction, 'Boss company should be mirrored into factions');
  assert.strictEqual(faction.parentId, 'country-china-corp');
  assert.strictEqual(faction.parentName, '经济组织');

  company.organization = [{ name: '内容部', jobs: [{ title: '编剧', people: ['林青'] }] }];
  store.ensureCompanyFaction(company, '组织同步测试');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(faction.structure)),
    [{ name: '内容部', level: '部门级别', roles: [{ title: '编剧', count: 1, characters: ['林青'] }] }],
  );

  const identityState = { profile: { memberships: [] }, values: { memberships: [] } };
  store.playerIdentityState = () => identityState;
  store.phoneDate = () => new Date('2026-07-14T10:00:00.000Z');
  store.addPlayerForcePosition({ force: '星河工作室', position: '应聘编剧' });
  await Promise.resolve();

  assert.strictEqual(identityState.profile.memberships[0].source, 'Boss招聘同步');
  assert.strictEqual(identityState.values.memberships[0].reason, '由现实职场事项确认。');
  assert.strictEqual(savedStates.length, 1);
  assert.strictEqual(savedStates[0], identityState);

  console.log('PASS company faction runtime preserves recruitment, organization, and identity synchronization');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
