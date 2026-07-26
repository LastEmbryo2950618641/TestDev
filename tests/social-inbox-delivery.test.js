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
load('publish/wechat-outreach-context.js', context);
load('publish/social-inbox.js', context);
load('publish/wechat-friend-request.js', context);

const inbox = context.window.GameModules.socialInbox;
assert.ok(typeof inbox.buildDeliveryText === 'function', 'buildDeliveryText required');
assert.ok(typeof inbox.deliverWechatItems === 'function', 'deliverWechatItems required');

const text = inbox.buildDeliveryText({
  actorName: '陈默',
  want: '赶方案缺数据',
  needPlayerWhy: '问你要上周表格',
  relationToPlayer: '普通同事',
});
assert.match(text, /表格|方案|数据/u);

const appended = [];
const store = {
  socialInbox: [{
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
  }, {
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
    urgency: 0.5,
  }],
  socialInboxPreparedIds: ['inbox-wx-1', 'inbox-call-1'],
  wechatFriendRequests: [],
  wechatUsers: [{ id: 'npc-a', characterId: 'npc-a', name: '陈默', group: false }],
  wechatMessagesByContact: {},
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
          agenda: { short: '赶方案', needPlayer: true, needPlayerWhy: '问表格', urgency: 0.7, cooldownUntil: '' },
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
  appendWechatMessage(id, msg) {
    appended.push({ id, msg });
    const list = [...(this.wechatMessagesByContact[id] || []), msg];
    this.wechatMessagesByContact = { ...this.wechatMessagesByContact, [id]: list };
  },
  updateWechatLatest() {},
  wechatMessageKey(c) { return c?.id; },
  phoneDate() { return new Date('2026-07-26T15:00:00+08:00'); },
  phoneDateText() { return '2026-07-26'; },
  phoneTimeText() { return '15:00'; },
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
  assert.ok(result && typeof result === 'object', 'clearPrepared should return summary object');
  assert.ok((result.wechatDeliveries || []).length >= 1, 'wechat inbox item must be delivered');
  assert.ok((result.friendRequests || []).some((x) => x.fromName === '钱进'), 'call item still promotes friend request');
  assert.ok(appended.some((row) => row.msg?.side === 'other' && /表格|方案|数据/u.test(row.msg.text || '')));
  assert.ok(!appended.some((row) => row.msg?.name === '钱进'), 'non-wechat channel must not get incoming message');

  const drive = store.rpgStates['npc-a'].profile.socialDrive;
  assert.ok(drive.lastContactAt, 'delivery should touch lastContactAt');
  assert.strictEqual(drive.lastContactChannel, 'wechat');

  const ctx = inbox.formatContext([{
    id: 'x', actorName: '陈默', channel: 'wechat', hasWechatContact: true, mayRequestWechat: false,
    relationToPlayer: '同事', affection: 40, familiarity: 50, want: '事', needPlayerWhy: '理', urgency: 0.5, status: 'pending',
  }]);
  assert.match(ctx, /未读微信|系统.*写入|来信/u);
  assert.match(ctx, /call\/scene|电话/u);

  const stage1 = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage1-guided-query.md'), 'utf8');
  const stage2 = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage2-scene-anchor.md'), 'utf8');
  assert.match(stage1, /日常驱动与事件Stage1要点|Social Inbox|社交主动/u);
  assert.match(stage2, /日常驱动与事件|Social Inbox|社交主动/u);
  const boundarySrc = fs.readFileSync(path.join(root, 'publish/social-event-boundary.js'), 'utf8');
  assert.match(boundarySrc, /Social Inbox/);
  assert.match(boundarySrc, /大地图事件/);

  const actionsSrc = fs.readFileSync(path.join(root, 'publish/real-world-actions.js'), 'utf8');
  assert.match(actionsSrc, /wechatDeliveries|微信来信/u);

  console.log('PASS social-inbox-delivery');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
