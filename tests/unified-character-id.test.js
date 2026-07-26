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
    const key = `${worldTag}::${name}`;
    return intros.get(key) || [...intros.values()].find((c) => c.name === name) || null;
  },
  listCharacterIntros() {
    return [...intros.values()];
  },
  async saveCharacterIntro(card) {
    const world = card.worldTag || card.work || '';
    intros.set(`${world}::${card.name}`, { ...card });
    return intros.get(`${world}::${card.name}`);
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
  assert.ok(batch.count >= 1);
  const id = layers.forcedParticipants[0].id;
  assert.ok(String(id).startsWith('rel-ai-'));

  const stub = host.rpgStates[id];
  assert.ok(stub?.profile?.roleCardStub, 'stub exists under shared id');

  const intro = GM.characterIntroStore.getById?.(id)
    || GM.characterIntroStore.list().find((c) => c.id === id);
  assert.ok(intro, 'intro card must exist under same id');
  assert.strictEqual(intro.id, id, 'intro.id === role stub id');
  assert.strictEqual(intro.name, '测试新人');
  assert.strictEqual(intro.links.roleCardId, id);

  // query by id: stub must NOT look like full role card
  const byIdText = GM.characterQuery.searchCharacter(host, { name: id, id });
  assert.ok(!/资料类型：完整角色卡/u.test(byIdText), 'stub must not present as complete role card');
  assert.ok(/资料类型：介绍卡|介绍卡ID/u.test(byIdText), 'stub query falls through to intro');
  assert.ok(byIdText.includes(id) || byIdText.includes('测试新人'));

  // mark complete → query returns role card
  stub.profile.roleCardStub = false;
  stub.profile.solidifyComplete = true;
  stub.profile.appearance = '短发';
  stub.profile.personality = '稳';
  stub.meta.roleCardStub = false;
  const completeText = GM.characterQuery.searchCharacter(host, { id, name: id });
  assert.ok(/资料类型：完整角色卡/u.test(completeText), 'complete role card preferred');

  console.log('PASS unified-character-id');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
