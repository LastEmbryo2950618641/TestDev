const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function load(context, relativePath) {
  vm.runInContext(read(relativePath), context, { filename: relativePath });
}

const intros = new Map();
const context = vm.createContext({
  window: { GameModules: {} },
  console,
  Date,
  Math,
  String,
  Array,
  Object,
  Boolean,
  Number,
  JSON,
  Set,
  Map,
  Promise,
});

load(context, 'publish/character-social-drive.js');
load(context, 'publish/character-state-store.js');
load(context, 'publish/character-intro-card.js');
load(context, 'publish/character-id-ensure.js');
load(context, 'publish/character-query.js');

const GM = context.window.GameModules;
GM.realWorld2026 = { label: '2026 现代都市现实世界' };
GM.rpgState = { seed: (text) => [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) };
GM.predefinedRoleCards = {
  async createState(card, store, id) {
    const state = {
      id,
      name: card.name,
      worldTag: card.work,
      profile: {
        id,
        name: card.name,
        work: card.work,
        role: card.role,
        detail: card.detail,
        presenceKind: card.presenceKind,
        roleCardStub: true,
      },
      values: {},
      meta: { roleCardStub: true },
    };
    store.rpgStates[id] = state;
    return state;
  },
};

GM.sqliteSave = {
  getCharacterIntro(name, worldTag = '') {
    const key = worldTag + '::' + name;
    return intros.get(key) || [...intros.values()].find((c) => c.name === name) || null;
  },
  listCharacterIntros() {
    return [...intros.values()];
  },
  async saveCharacterIntro(card) {
    const world = card.worldTag || card.work || '';
    intros.set(world + '::' + card.name, { ...card });
    return intros.get(world + '::' + card.name);
  },
  getCharacterIntroById(id = '') {
    return [...intros.values()].find((c) => c.id === id) || null;
  },
};

load(context, 'publish/platform/storage/character-intro-source.js');
load(context, 'publish/character-intro-store.js');

const host = { rpgStates: {}, selectedWork: '2026 现代都市现实世界' };
GM.characterStateStore.bindLiveHost(host);

const withId = GM.characterIntroCard.normalize({
  id: 'rel-ai-shared1',
  name: '陈默',
  role: '同事',
  intro: '产品组',
}, null, 'scene');
assert.strictEqual(withId.id, 'rel-ai-shared1', 'explicit id must be used as intro id');
assert.strictEqual(withId.links.roleCardId, 'rel-ai-shared1', 'links.roleCardId must match shared id');
assert.strictEqual(withId.links.scheduleId, 'rel-ai-shared1');

(async () => {
  const layers = {
    forcedParticipants: [{ name: '测试新人', id: '待建卡' }],
    priorityCandidates: [],
    dramaCandidates: [],
    forbiddenParticipants: [],
  };
  const batch = await GM.characterIdEnsure.ensureBatch(host, layers);
  assert.strictEqual(batch.count, 0);
  const id = layers.forcedParticipants[0].id;
  assert.strictEqual(id, '待建卡');
  assert.strictEqual(host.rpgStates[id], undefined, 'Stage1 no longer creates role stub');

  const intro = GM.characterIntroStore.getById?.(id)
    || GM.characterIntroStore.list().find((c) => c.id === id);
  assert.ok(!intro, 'Stage1 no longer creates intro card');

  const byIdText = GM.characterQuery.searchCharacter(host, { name: '测试新人', id });
  assert.ok(/未找到角色资料/u.test(byIdText), 'before Stage5 there is no intro or role card yet');

  console.log('PASS unified-character-id');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
