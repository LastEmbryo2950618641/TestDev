const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const calls = [];
const knownJobs = [
  { name: '记者', worldTag: '现实世界', summary: '调查新闻', sourceReason: '剧情解锁' },
  { name: '医生', worldTag: '现实世界', summary: '医疗救治', sourceReason: '资料解锁' },
];
const context = {
  window: {
    GameModules: {
      metadataStore: { get: () => knownJobs },
      rpgProfessionState: { ensurePrerequisites() {} },
      progression: {
        learned(name, type, level, linkedStats, description) {
          return { name, type, level, linkedStats, description };
        },
      },
      characterStateStore: {
        async save() { calls.push('save'); },
      },
      rpgLexicon: {
        async syncState() { calls.push('sync'); },
      },
    },
  },
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'publish', 'known-profession-actions.js'), 'utf8'),
  context,
);

(async () => {
  const actions = context.window.GameModules.knownProfessionActions;
  const state = {
    values: {
      intelligence: 5,
      skills: [{ name: '采访' }],
      knowledge: [{ name: '新闻学' }],
      worldValues: [],
      professions: [],
    },
  };
  const store = {
    ...actions,
    knownProfessionState: {},
    ensurePlayerRpgState: async () => state,
    playerIdentityState: () => state,
  };

  store.setKnownProfessionQuery('记者');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(store.knownProfessions().map((job) => job.name))),
    ['记者'],
  );
  store.openKnownProfessionDetail(knownJobs[0]);
  const panel = store.knownProfessionPanelView();
  assert.strictEqual(panel.detailOpen, true);
  assert.strictEqual(panel.selected.name, '记者');

  const job = {
    name: '调查记者',
    requirements: {
      intrinsicStats: ['intelligence'],
      learnedAbilities: ['采访'],
      knowledgeAreas: ['新闻学'],
      reason: '需要完成采访训练',
    },
  };
  assert.strictEqual(
    store.professionRequirementText(job),
    '身内能力：智力\n世界专属能力：无\n技能：采访\n知识储备：新闻学\n原因：需要完成采访训练',
  );
  assert.strictEqual(await store.addProfessionToPlayer(job), true);
  assert.strictEqual(state.values.professions[0].name, '调查记者');
  assert.deepStrictEqual(calls, ['save', 'sync']);
  assert.strictEqual(store.knownProfessionState.message, '已获得职业：调查记者 lv.1');

  console.log('PASS known profession facade preserves views, requirements, and save order');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
