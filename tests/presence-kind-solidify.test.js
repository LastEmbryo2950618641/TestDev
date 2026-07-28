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

const impactPeople = store.solidifyPeopleFromAnchorReport({
  sceneImpactObjects: { people: ['刘思琪'], locations: ['门口'], items: [], systems: [], summary: '只影响门口。' },
});
assert.strictEqual(JSON.stringify(impactPeople), JSON.stringify([{ name: '刘思琪', role: 'current-scene' }]));
assert.strictEqual(JSON.stringify(store.solidifyPeopleFromAnchorReport({ values: { '当前场景影响对象': '刘思琪在家中备战中考' } })), JSON.stringify([]));

console.log('PASS presence-kind-solidify');
