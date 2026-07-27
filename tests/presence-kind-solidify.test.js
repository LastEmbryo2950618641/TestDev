const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(relativePath, context) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

const context = vm.createContext({
  window: { GameModules: {} },
  Date,
  Math,
  String,
  Array,
  Object,
  Boolean,
  Number,
  JSON,
  console,
});

load('publish/character-social-drive.js', context);
load('publish/character-intro-card.js', context);
load('publish/character-intro-update-operations.js', context);
load('publish/solidify-actions.js', context);

const store = Object.assign({
  solidifyState: { candidates: [], selectedKey: '', open: false },
  playerName: '刘悠',
  rpgStates: {},
}, context.window.GameModules.solidifyActions);

assert.ok(store.solidifyLooksLikePersonName('路人甲'));
assert.ok(store.solidifyLooksLikePersonName('川大传媒学院女学生'));
assert.ok(store.solidifyLooksLikePersonName('外卖骑手小王'));
assert.ok(!store.solidifyLooksLikePersonName('路人'));
assert.ok(!store.solidifyLooksLikePersonName('被褥'));

const introOnly = store.solidifyDisplayCard({
  name: '路人甲',
  presenceKind: 'individual',
  role: '路人',
  intro: '路过的行人',
  worldTag: '2026 现代都市现实世界',
});
assert.strictEqual(introOnly.displayType, 'intro');
assert.strictEqual(store.solidifyPresenceKindLabel(introOnly), '具体的一个人');

const group = store.solidifyDisplayCard({
  name: '川大传媒学院女学生',
  presenceKind: 'group',
  role: '学生群体',
  intro: '集体行动',
  worldTag: '2026 现代都市现实世界',
});
assert.strictEqual(group.displayType, 'intro');
assert.strictEqual(store.solidifyPresenceKindLabel(group), '一类人（团体原型）');

const stubState = {
  id: 'rel-ai-stub1',
  name: '陈默',
  profile: { name: '陈默', role: '新登场人物', detail: 'Stage1 批量建卡：陈默', appearance: '', personality: '', roleCardStub: true },
};
context.window.GameModules.characterIntroCard.roleCardState = () => stubState;
const stubCard = store.solidifyDisplayCard({ name: '陈默', worldTag: 'w', intro: '空壳' });
assert.strictEqual(stubCard.displayType, 'intro', 'Stage1 stub must still show as intro for solidify');

(async () => {
  let promotedIntro = context.window.GameModules.characterIntroCard.normalize({
    id: 'rel-ai-promote',
    name: '林晴',
    worldTag: '现实世界',
    presenceKind: 'individual',
    identity: { role: '妹妹', age: '17', gender: '女', job: '成都市第一中学高三学生', baseLocation: '成都市第一中学' },
    persona: { appearance: '黑色长发', personality: '认真', background: '正在备战高考', preferences: ['文学'], attraction: [], voice: '轻柔' },
    social: { relationToPlayer: '妹妹', relationDetail: '共同生活的亲妹妹', affection: 72, familiarity: 88, reach: ['当面'] },
    agenda: { short: '准备高考', deadline: '2027-06', needPlayer: true, needPlayerWhy: '需要辅导数学', urgency: 0.7 },
  }, store, 'scene');
  const savedRoleStates = [];
  context.window.GameModules.characterIntroStore = {
    getById: (id) => id === promotedIntro.id ? promotedIntro : null,
    get: (name) => name === promotedIntro.name ? promotedIntro : null,
    list: () => [promotedIntro],
    normalize: (card, targetStore, source) => context.window.GameModules.characterIntroCard.normalize(card, targetStore, source),
    save(card) {
      promotedIntro = card;
      return card;
    },
  };
  context.window.GameModules.characterStateStore = {
    get: (id) => store.rpgStates[id] || null,
    async save(state) {
      store.rpgStates[state.id] = state;
      savedRoleStates.push(state);
      return state;
    },
  };
  store.startRoleCardLoadingBatch = () => {};
  store.ensureRpgForCharacter = async (source) => {
    store.rpgStates[source.id] = {
      id: source.id,
      name: source.name,
      worldTag: source.work,
      profile: { name: source.name, work: source.work, role: source.role, detail: source.detail },
      metrics: { playerFeelings: {} },
    };
  };

  await store.solidifySelectedIntroCard({ ...promotedIntro, displayType: 'intro', roleState: null });

  const promotedRole = store.rpgStates['rel-ai-promote'];
  assert.strictEqual(promotedRole.metrics.playerFeelings['好感'], 72);
  assert.strictEqual(promotedRole.profile.socialDrive.familiarity, 88);
  assert.strictEqual(promotedRole.profile.socialDrive.relationToPlayer, '妹妹');
  assert.strictEqual(promotedRole.profile.socialDrive.relationDetail, '共同生活的亲妹妹');
  assert.strictEqual(promotedRole.profile.socialDrive.agenda.short, '准备高考');
  assert.strictEqual(promotedIntro.links.roleCardId, 'rel-ai-promote');
  assert.strictEqual(promotedIntro.meta.solidifyStatus, 'solidified');
  assert.ok(savedRoleStates.length >= 2, 'promotion should save after intro-to-role synchronization');

  console.log('PASS presence-kind-solidify');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
