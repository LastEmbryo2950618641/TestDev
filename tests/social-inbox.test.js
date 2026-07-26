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
load('publish/social-inbox.js', context);

const inbox = context.window.GameModules.socialInbox;
assert.ok(inbox, 'socialInbox module must exist');

// budget by elapsed（固定 random，避免短跨度 8% 抖动）
assert.strictEqual(inbox.budgetFromElapsed(10 * 60, () => 0.99), 0);
assert.ok(inbox.budgetFromElapsed(2 * 3600, () => 0.5) <= 1);
assert.ok(inbox.budgetFromElapsed(8 * 3600, () => 0.5) <= 2);
assert.ok(inbox.budgetFromElapsed(30 * 3600, () => 0.5) <= 3);
assert.ok(inbox.budgetFromElapsed(80 * 3600, () => 0.5) <= 4);

// configurable tiers override defaults
const customTiers = [
  { maxSeconds: 60, expected: 2, hardCap: 2, label: '短' },
  { maxSeconds: null, expected: 0, hardCap: 0, label: '长' },
];
assert.strictEqual(inbox.budgetFromElapsed(30, () => 0.99, customTiers), 2);
assert.strictEqual(inbox.budgetFromElapsed(120, () => 0.99, customTiers), 0);
const normalized = inbox.normalizeBudgetTiers([{ expected: 1.2, hardCap: 1 }]);
assert.ok(normalized[0].hardCap >= Math.ceil(normalized[0].expected));
assert.strictEqual(normalized[normalized.length - 1].maxSeconds, null);

// stranger gated
assert.strictEqual(inbox.isRelationEligible('陌生'), false);
assert.strictEqual(inbox.isRelationEligible('路人'), false);
assert.strictEqual(inbox.isRelationEligible(''), false);
assert.strictEqual(inbox.isRelationEligible('普通同事'), true);
assert.strictEqual(inbox.isRelationEligible('本人'), false);

// channel resolve: no wechat → call/scene + mayRequestWechat
const noWx = inbox.resolveChannel({
  reach: ['wechat', 'call'],
  hasWechatContact: false,
  urgency: 0.5,
});
assert.notStrictEqual(noWx.channel, 'wechat');
assert.strictEqual(noWx.mayRequestWechat, true);

const withWx = inbox.resolveChannel({
  reach: ['wechat'],
  hasWechatContact: true,
  urgency: 0.5,
});
assert.strictEqual(withWx.channel, 'wechat');
assert.strictEqual(withWx.mayRequestWechat, false);

// settle picks eligible actors only
const store = {
  socialInbox: [],
  phoneFixedTime: Date.parse('2026-07-26T12:00:00+08:00'),
  wechatContacts() {
    return [{ id: 'wx-1', characterId: 'npc-a', name: '陈默', group: false }];
  },
  rpgStates: {
    'player-self': { id: 'player-self', name: '玩家', profile: { socialDrive: { relationToPlayer: '本人' } }, metrics: {} },
    'npc-a': {
      id: 'npc-a',
      name: '陈默',
      profile: {
        socialDrive: {
          relationToPlayer: '普通同事',
          familiarity: 55,
          lastContactAt: '2026-07-20T10:00:00+08:00',
          lastContactChannel: 'none',
          reach: ['wechat', 'call'],
          agenda: {
            short: '赶方案缺数据',
            deadline: '',
            needPlayer: true,
            needPlayerWhy: '问表格',
            urgency: 0.7,
            cooldownUntil: '',
          },
        },
      },
      metrics: { playerFeelings: { 好感: 42 } },
    },
    'npc-stranger': {
      id: 'npc-stranger',
      name: '路人甲',
      profile: {
        socialDrive: {
          relationToPlayer: '陌生',
          familiarity: 5,
          reach: ['scene'],
          agenda: { short: '路过', needPlayer: true, needPlayerWhy: '搭话', urgency: 0.9, cooldownUntil: '' },
        },
      },
      metrics: { playerFeelings: { 好感: 80 } },
    },
  },
};

const introList = [
  {
    id: 'intro-b',
    name: '林夏',
    worldTag: '2026 现代都市现实世界',
    social: {
      relationToPlayer: '大学同学',
      affection: 60,
      familiarity: 40,
      lastContactAt: '',
      lastContactChannel: 'none',
      reach: ['call'],
    },
    agenda: {
      short: '周末聚餐差一人',
      needPlayer: true,
      needPlayerWhy: '想叫你一起',
      urgency: 0.5,
      cooldownUntil: '',
    },
    links: { wechatContactId: '', roleCardId: '' },
  },
];

context.window.GameModules.characterIntroStore = {
  list: () => introList,
};

const created = inbox.settle(store, 20 * 3600, {
  random: () => 0.01,
});
assert.ok(created.length >= 1, 'long span should create inbox items');
assert.ok(created.every((item) => item.actorId !== 'npc-stranger'), 'stranger must not enter inbox');
assert.ok(created.every((item) => item.actorId !== 'player-self'), 'player must not enter inbox');
assert.ok(store.socialInbox.length >= created.length);

const chen = created.find((item) => item.actorId === 'npc-a');
if (chen) {
  assert.strictEqual(chen.hasWechatContact, true);
  assert.strictEqual(chen.channel, 'wechat');
  assert.strictEqual(chen.mayRequestWechat, false);
}

const lin = created.find((item) => item.actorId === 'intro-b' || item.actorName === '林夏');
if (lin) {
  assert.notStrictEqual(lin.channel, 'wechat');
  assert.strictEqual(lin.mayRequestWechat, true);
}

// prepare context
const actions = context.window.GameModules.realWorldSocialInboxActions;
assert.ok(actions?.prepareSocialInboxContext, 'store actions must expose prepare');
Object.assign(store, actions);
store.socialInboxPreparedIds = [];
const text = store.prepareSocialInboxContext();
assert.match(text, /Social Inbox|社交主动/u);
assert.match(text, /好友申请|禁止直接把对方加为/u);

// short span often empty
const store2 = { ...store, socialInbox: [], rpgStates: store.rpgStates };
const short = inbox.settle(store2, 5 * 60, { random: () => 0.99 });
assert.strictEqual(short.length, 0);

// wiring checks
const actionsSrc = fs.readFileSync(path.join(root, 'publish/real-world-actions.js'), 'utf8');
assert.match(actionsSrc, /settleSocialInbox/u, 'applyRealWorldResult must settle social inbox');

const ctxSrc = fs.readFileSync(path.join(root, 'publish/real-world-agent-context.js'), 'utf8');
assert.match(ctxSrc, /prepareSocialInboxContext|社交主动/u, 'agent context must inject social inbox');

const remSrc = fs.readFileSync(path.join(root, 'publish/remerge-game-store.js'), 'utf8');
assert.match(remSrc, /realWorldSocialInboxActions|social-inbox/u);

console.log('PASS social-inbox');
