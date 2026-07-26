const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadModule(relativePath, context) {
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
});

loadModule('publish/character-social-drive.js', context);
loadModule('publish/character-intro-card.js', context);

const social = context.window.GameModules.characterSocialDrive;
const introCard = context.window.GameModules.characterIntroCard;

assert.ok(social, 'characterSocialDrive must exist');
assert.ok(introCard, 'characterIntroCard must exist');

const empty = social.empty();
assert.strictEqual(empty.relationToPlayer, '');
assert.strictEqual(empty.familiarity, 0);
assert.strictEqual(empty.agenda.needPlayer, false);
assert.ok(Array.isArray(empty.reach) && empty.reach.length === 0);

const normalized = social.normalize({
  relationToPlayer: '普通同事',
  relationDetail: '同组协作',
  familiarity: 120,
  lastContactAt: '2026-07-20T18:30:00+08:00',
  lastContactChannel: 'wechat',
  reach: ['wechat', 'scene', 'telepathy'],
  agenda: {
    short: '周五前交方案',
    deadline: '2026-07-25',
    needPlayer: true,
    needPlayerWhy: '问你要表格',
    urgency: 1.5,
    cooldownUntil: '',
  },
});

assert.strictEqual(normalized.relationToPlayer, '普通同事');
assert.strictEqual(normalized.familiarity, 100);
assert.strictEqual(normalized.lastContactChannel, 'wechat');
assert.strictEqual(JSON.stringify(normalized.reach), JSON.stringify(['wechat', 'scene']));
assert.strictEqual(normalized.agenda.urgency, 1);
assert.strictEqual(normalized.agenda.needPlayer, true);

const card = introCard.normalize({
  name: '陈默',
  role: '产品经理同事',
  intro: '本地互联网从业者',
  appearance: '短发深色衬衫',
  personality: '话少靠谱',
  preferences: ['少应酬', '周末宅'],
  attraction: ['说话直接'],
  relationToPlayer: '普通同事',
  affection: 42,
  familiarity: 55,
  lastContactAt: '2026-07-20T18:30:00+08:00',
  lastContactChannel: 'wechat',
  reach: ['wechat'],
  agenda: { short: '赶方案', needPlayer: true, needPlayerWhy: '借表格', urgency: 0.6 },
  routineTags: ['工作日上班'],
}, null, 'scene');

assert.ok(card.id, 'intro card must have stable id');
assert.strictEqual(card.name, '陈默');
assert.strictEqual(card.identity.role, '产品经理同事');
assert.strictEqual(card.persona.background, '本地互联网从业者');
assert.strictEqual(card.persona.appearance, '短发深色衬衫');
assert.ok(Array.isArray(card.persona.preferences));
assert.ok(Array.isArray(card.persona.attraction));
assert.strictEqual(card.social.relationToPlayer, '普通同事');
assert.strictEqual(card.social.affection, 42);
assert.strictEqual(card.social.familiarity, 55);
assert.strictEqual(card.agenda.needPlayer, true);
assert.ok(!('wearing' in card) || card.wearing === undefined, 'wearing must not be a primary intro field');
assert.ok(!('isMinor' in card), 'isMinor must be removed');
assert.strictEqual(card.meta.source, 'scene');
assert.strictEqual(card.meta.solidifyStatus, 'none');
assert.strictEqual(card.presenceKind, 'individual');

// legacy root aliases for readers
assert.strictEqual(card.role, card.identity.role);
assert.strictEqual(card.intro, card.persona.background);

const groupCard = introCard.normalize({
  name: '川大传媒学院女学生',
  role: '在校学生群体',
  intro: '集体上课与社团活动',
}, null, 'scene');
assert.strictEqual(groupCard.presenceKind, 'group');
assert.strictEqual(social.presenceKindLabel('group'), '一类人（团体原型）');
assert.strictEqual(social.inferPresenceKind({ name: '刘思琪' }), 'individual');
assert.strictEqual(social.inferPresenceKind({ name: '路人甲' }), 'individual');
assert.ok(social.looksLikeGroupLabel('女仆团女仆'));

assert.ok(introCard.isIncompleteRoleStub({
  profile: { role: '新登场人物', detail: 'Stage1 批量建卡：测试', appearance: '', personality: '' },
}));
assert.ok(!introCard.isIncompleteRoleStub({
  profile: { role: '同事', detail: '完整介绍', appearance: '短发', personality: '稳', solidifyComplete: true },
}));

const profileSnippet = fs.readFileSync(path.join(root, 'publish/character-profile.js'), 'utf8');
assert.match(profileSnippet, /character-profile-part8-social-drive|generateSocialDrive/u, 'role card pipeline must generate socialDrive as independent part');
assert.match(profileSnippet, /socialDrive/u, 'role card validate/merge must keep socialDrive');

const loading = fs.readFileSync(path.join(root, 'publish/role-card-loading-actions.js'), 'utf8');
assert.match(loading, /socialDrive/u, 'loading UI must include socialDrive step');

const promptReg = fs.readFileSync(path.join(root, 'publish/prompt-templates.js'), 'utf8');
assert.match(promptReg, /character-profile-part8-social-drive/u, 'prompt registry must list Part8');

assert.ok(
  fs.existsSync(path.join(root, 'publish/prompts/character-profile-part8-social-drive.md')),
  'Part8 prompt markdown must exist',
);

console.log('PASS character-social-drive + intro card schema');
