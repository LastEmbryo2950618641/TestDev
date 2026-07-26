const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(rel, context) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
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
  Promise,
  console,
});

load('publish/character-social-drive.js', context);
load('publish/character-intro-card.js', context);
load('publish/wechat-outreach-context.js', context);
load('publish/social-inbox.js', context);
load('publish/wechat-friend-request.js', context);

const inbox = context.window.GameModules.socialInbox;
assert.ok(typeof inbox.applyOutreachWriteback === 'function');
assert.ok(typeof inbox.cooldownUntilIso === 'function');

const cooldown = inbox.cooldownUntilIso('2026-07-26T12:00:00.000Z', 12);
assert.match(cooldown, /^2026-07-2[67]/);

const savedIntros = [];
const savedStates = [];
context.window.GameModules.characterIntroStore = {
  list: () => [{
    id: 'intro-e',
    name: '钱进',
    worldTag: '2026 现代都市现实世界',
    identity: { role: '同事', age: '', gender: '', job: '', baseLocation: '' },
    persona: { appearance: '', personality: '', background: '同事', preferences: [], attraction: [], voice: '' },
    social: {
      relationToPlayer: '同事',
      affection: 30,
      familiarity: 40,
      lastContactAt: '',
      lastContactChannel: 'none',
      reach: ['call'],
    },
    agenda: {
      short: '问报表',
      needPlayer: true,
      needPlayerWhy: '加微信发文件',
      urgency: 0.6,
      cooldownUntil: '',
      deadline: '',
    },
    routine: { tags: [] },
    memory: { facts: [] },
    links: { scheduleId: 'intro-e', wechatContactId: '', roleCardId: '' },
    meta: { source: 'scene', solidifyStatus: 'none', createdAt: '', updatedAt: '' },
    role: '同事',
    intro: '同事',
  }],
  get(name) {
    return this.list().find((c) => c.name === name) || null;
  },
  save(card) {
    savedIntros.push(card);
    return Promise.resolve(card);
  },
};

context.window.GameModules.characterStateStore = {
  get() { return null; },
  save(state) { savedStates.push(state); return Promise.resolve(state); },
};

const store = {
  socialInbox: [{
    id: 'inbox-call-1',
    actorId: 'intro-e',
    actorName: '钱进',
    channel: 'call',
    want: '问报表',
    needPlayerWhy: '加微信发文件',
    relationToPlayer: '同事',
    hasWechatContact: false,
    mayRequestWechat: true,
    status: 'prepared',
    urgency: 0.6,
  }, {
    id: 'inbox-wx-1',
    actorId: 'npc-a',
    actorName: '陈默',
    channel: 'wechat',
    want: '赶方案缺数据',
    needPlayerWhy: '问你要上周表格',
    relationToPlayer: '普通同事',
    hasWechatContact: true,
    mayRequestWechat: false,
    status: 'prepared',
    urgency: 0.7,
  }],
  socialInboxPreparedIds: ['inbox-call-1', 'inbox-wx-1'],
  wechatFriendRequests: [],
  wechatUsers: [{ id: 'wx-chen', characterId: 'npc-a', name: '陈默', group: false }],
  wechatMessagesByContact: {},
  phoneFixedTime: Date.parse('2026-07-26T12:00:00.000Z'),
  realWorldSettlementLogId: 'real-settle-ai',
  rpgStates: {
    'npc-a': {
      id: 'npc-a',
      name: '陈默',
      profile: {
        socialDrive: {
          relationToPlayer: '普通同事',
          familiarity: 55,
          lastContactAt: '',
          lastContactChannel: 'none',
          reach: ['wechat'],
          agenda: {
            short: '赶方案缺数据',
            deadline: '',
            needPlayer: true,
            needPlayerWhy: '问你要上周表格',
            urgency: 0.7,
            cooldownUntil: '',
          },
        },
      },
      metrics: { playerFeelings: { 好感: 42 } },
    },
  },
  wechatContacts() { return this.wechatUsers; },
  findWechatIncomingContact(value) {
    const key = String(value || '').trim();
    return this.wechatUsers.find((c) => c.id === key || c.characterId === key || c.name === key) || null;
  },
  appendWechatMessage() {},
  updateWechatLatest() {},
  wechatMessageKey(c) { return c?.id; },
  phoneDate() { return new Date(this.phoneFixedTime); },
  async save() {},
  requestWechatFriend(raw) {
    return context.window.GameModules.wechatFriendRequestActions.requestWechatFriend.call(this, raw);
  },
  promoteSocialInboxWechatRequests() {
    return context.window.GameModules.wechatFriendRequestActions.promoteSocialInboxWechatRequests.call(this);
  },
};

Object.assign(store, context.window.GameModules.realWorldSocialInboxActions);

async function run() {
  const result = await store.clearPreparedSocialInbox();
  assert.ok((result.writebacks || []).length >= 2, 'writeback for call + wechat items');

  const drive = store.rpgStates['npc-a'].profile.socialDrive;
  assert.ok(drive.lastContactAt);
  assert.strictEqual(drive.lastContactChannel, 'wechat');
  assert.strictEqual(drive.agenda.needPlayer, true, 'wechat delivery keeps needPlayer until chat resolves');
  assert.ok(Number(drive.agenda.urgency) >= 0.35);
  assert.ok(!drive.agenda.cooldownUntil, 'wechat delivery defers cooldown');

  const introSaved = savedIntros.find((c) => c.name === '钱进') || savedIntros[savedIntros.length - 1];
  assert.ok(introSaved, 'intro card should be saved');
  assert.ok(introSaved.social?.lastContactAt || introSaved.agenda);
  assert.strictEqual(introSaved.agenda?.needPlayer, false);
  assert.ok(introSaved.agenda?.cooldownUntil);
  assert.ok(['call', 'scene'].includes(introSaved.social?.lastContactChannel));

  // accept friend request also writebacks reach + lastContact
  Object.assign(store, context.window.GameModules.wechatFriendRequestActions);
  store.wechatFriendRequests = [{
    id: 'wfr-1',
    fromCharacterId: 'intro-e',
    fromName: '钱进',
    relation: '同事',
    reason: '加微信发文件',
    status: 'pending',
    source: 'social-inbox',
  }];
  store.normalizeWechatContact = function normalizeWechatContact(user = {}) {
    const name = String(user.name || '').trim();
    const id = String(user.id || user.characterId || `wx-${name}`);
    return { id, characterId: id, name, relation: user.relation || '', group: false, mark: name.slice(0, 1), latest: '', unread: 0, source: 'friend-request' };
  };
  store.addWechatUser = async function addWechatUser(user, options) {
    const c = this.normalizeWechatContact(user);
    this.wechatUsers = [...this.wechatUsers, c];
    this._addOpts = options;
    return c;
  };

  await store.acceptWechatFriendRequest('wfr-1');
  const after = savedIntros.filter((c) => c.name === '钱进').pop();
  assert.ok(after?.links?.wechatContactId, 'accept must write wechatContactId');
  assert.ok((after.social?.reach || []).includes('wechat'));

  const actionsSrc = fs.readFileSync(path.join(root, 'publish/real-world-actions.js'), 'utf8');
  assert.match(actionsSrc, /writebacks|议程回写|冷却/u);

  console.log('PASS social-inbox-writeback');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
