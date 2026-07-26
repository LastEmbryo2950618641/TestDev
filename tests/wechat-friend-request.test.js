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

const fr = context.window.GameModules.wechatFriendRequest;
assert.ok(fr, 'wechatFriendRequest module must exist');

const req = fr.normalize({
  fromCharacterId: 'intro-b',
  fromName: '林夏',
  reason: '电话里说想加微信方便约周末',
  source: 'social-inbox',
  inboxId: 'inbox-1',
  relation: '大学同学',
});
assert.ok(req.id);
assert.strictEqual(req.status, 'pending');
assert.strictEqual(req.fromName, '林夏');

async function run() {
  const store = {
    wechatFriendRequests: [],
    wechatUsers: [],
    socialInbox: [],
    socialInboxPreparedIds: [],
    async save() {},
    normalizeWechatContact(user = {}) {
      const name = String(user.name || '').trim();
      if (!name) return null;
      const id = String(user.id || user.characterId || `wx-${name}`).slice(0, 40);
      return {
        id,
        characterId: String(user.characterId || id),
        name,
        relation: String(user.relation || '微信联系人').slice(0, 40),
        mark: name.slice(0, 1),
        latest: '',
        unread: 0,
        source: user.source || 'friend-request',
        group: false,
      };
    },
    async addWechatUser(user = {}, options = {}) {
      const contact = this.normalizeWechatContact(user);
      this.wechatUsers = [...(this.wechatUsers || []), contact];
      this._lastAddOptions = options;
      return contact;
    },
  };

  Object.assign(store, context.window.GameModules.wechatFriendRequestActions);
  Object.assign(store, context.window.GameModules.realWorldSocialInboxActions);

  const created = store.requestWechatFriend({
    fromCharacterId: 'intro-b',
    fromName: '林夏',
    reason: '方便约周末聚餐',
    source: 'social-inbox',
    inboxId: 'inbox-1',
    relation: '大学同学',
  });
  assert.strictEqual(store.wechatFriendRequests.length, 1);
  assert.strictEqual(store.wechatFriendRequestPendingCount(), 1);

  store.requestWechatFriend({ fromCharacterId: 'intro-b', fromName: '林夏', reason: '再申请一次' });
  assert.strictEqual(store.wechatFriendRequests.length, 1);

  store.wechatUsers = [{ id: 'wx-chen', characterId: 'npc-a', name: '陈默', group: false }];
  const skipped = store.requestWechatFriend({ fromCharacterId: 'npc-a', fromName: '陈默', reason: '已是好友' });
  assert.strictEqual(skipped, null);

  await store.acceptWechatFriendRequest(created.id);
  assert.strictEqual(store.wechatFriendRequests.find((x) => x.id === created.id).status, 'accepted');
  assert.ok(store.wechatUsers.some((c) => c.name === '林夏'));
  assert.strictEqual(store._lastAddOptions.generateProfile, false);
  assert.strictEqual(store.wechatFriendRequestPendingCount(), 0);

  const rejected = store.requestWechatFriend({ fromCharacterId: 'npc-c', fromName: '周可', reason: '路过认识' });
  await store.rejectWechatFriendRequest(rejected.id);
  assert.strictEqual(store.wechatFriendRequests.find((x) => x.id === rejected.id).status, 'rejected');
  assert.ok(!store.wechatUsers.some((c) => c.name === '周可'));

  store.socialInbox = [{
    id: 'inbox-3',
    actorId: 'intro-e',
    actorName: '钱进',
    channel: 'call',
    want: '问报表',
    needPlayerWhy: '加微信发文件',
    relationToPlayer: '同事',
    hasWechatContact: false,
    mayRequestWechat: true,
    status: 'prepared',
  }];
  store.socialInboxPreparedIds = ['inbox-3'];
  const cleared = await store.clearPreparedSocialInbox();
  const promoted = cleared?.friendRequests || cleared;
  assert.ok(Array.isArray(promoted) && promoted.some((x) => x.fromName === '钱进'));
  assert.ok(
    store.wechatFriendRequests.some((x) => x.fromName === '钱进' && x.status === 'pending'),
    'prepared inbox with mayRequestWechat must create pending friend request',
  );

  const ai = fs.readFileSync(path.join(root, 'publish/real-world-ai.js'), 'utf8');
  assert.match(ai, /requestWechatFriend/u);

  const html = fs.readFileSync(path.join(root, 'publish/index.html'), 'utf8');
  assert.match(html, /新的朋友/u);
  assert.match(html, /friendRequests|wechatFriendRequest/u);

  const incoming = fs.readFileSync(path.join(root, 'publish/app/wechat/incoming-orchestration.js'), 'utf8');
  assert.match(incoming, /requestWechatFriend/u);

  console.log('PASS wechat-friend-request');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
