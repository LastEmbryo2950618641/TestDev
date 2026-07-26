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
  setTimeout,
});

load('publish/character-id-ensure.js', context);
load('publish/wechat-actions.js', context);

const actions = context.window.GameModules.wechatActions;
assert.ok(actions, 'wechatActions must exist');
assert.ok(typeof actions.normalizeWechatContact === 'function');
assert.ok(typeof actions.isWechatContactCharacterId === 'function');
assert.ok(typeof actions.migrateWechatContactIdentity === 'function');

assert.strictEqual(actions.isWechatContactCharacterId('player-self'), true);
assert.strictEqual(actions.isWechatContactCharacterId('rel-ai-abc123'), true);
assert.strictEqual(actions.isWechatContactCharacterId('npc-a'), true);
assert.strictEqual(actions.isWechatContactCharacterId('wx-chen'), false);
assert.strictEqual(actions.isWechatContactCharacterId('intro-b'), false);
assert.strictEqual(actions.isWechatContactCharacterId('group-main'), false);
assert.strictEqual(actions.isWechatContactCharacterId(''), false);

assert.strictEqual(actions.normalizeWechatContact({ name: '陈默', relation: '同事' }), null);
assert.strictEqual(actions.normalizeWechatContact({ name: '陈默', id: 'wx-chen' }), null);
assert.strictEqual(actions.normalizeWechatContact({ name: '陈默', characterId: 'wx-chen' }), null);

const ok = actions.normalizeWechatContact({
  name: '陈默',
  relation: '同事',
  characterId: 'npc-a',
  source: 'manual',
});
assert.ok(ok);
assert.strictEqual(ok.id, 'npc-a');
assert.strictEqual(ok.characterId, 'npc-a');
assert.strictEqual(ok.name, '陈默');

const fromId = actions.normalizeWechatContact({ name: '林夏', id: 'rel-ai-linxia' });
assert.strictEqual(fromId.id, 'rel-ai-linxia');
assert.strictEqual(fromId.characterId, 'rel-ai-linxia');

const diverge = actions.normalizeWechatContact({
  name: '陈默',
  id: 'wx-chen',
  characterId: 'npc-a',
});
assert.ok(diverge);
assert.strictEqual(diverge.id, 'npc-a');
assert.strictEqual(diverge.characterId, 'npc-a');

async function runAdd() {
  const store = {
    wechatUsers: [],
    async save() {},
    normalizeWechatContact: actions.normalizeWechatContact,
    isWechatContactCharacterId: actions.isWechatContactCharacterId,
    async ensureWechatUserProfile() { return null; },
  };
  Object.assign(store, {
    addWechatUser: actions.addWechatUser,
    addWechatUsers: actions.addWechatUsers,
  });

  const rejected = await store.addWechatUser({ name: '路人', relation: '陌生人' });
  assert.strictEqual(rejected, null);
  assert.strictEqual(store.wechatUsers.length, 0);

  const added = await store.addWechatUser({ name: '陈默', characterId: 'npc-a', relation: '同事' }, { generateProfile: false });
  assert.ok(added);
  assert.strictEqual(added.id, 'npc-a');
  assert.strictEqual(added.characterId, 'npc-a');
  assert.strictEqual(store.wechatUsers[0].id, 'npc-a');
}

async function runMigrate() {
  const store = {
    wechatUsers: [
      { id: 'wx-chen', characterId: 'npc-a', name: '陈默', group: false, unread: 2 },
      { id: 'group-main', name: '群', group: true },
      { id: 'wx-orphan', characterId: 'wx-orphan', name: '无卡', group: false },
    ],
    wechatMessagesByContact: {
      'wx-chen': [{ side: 'self', text: 'hi' }, { side: 'other', text: 'yo' }],
      'npc-a': [{ side: 'other', text: 'old' }],
      'wx-orphan': [{ side: 'self', text: 'bye' }],
      'group-main': [{ side: 'system', text: 'ok' }],
    },
    wechatAlbumPhotos: {
      'wx-chen': [{ url: 'a.jpg' }],
      'npc-a': [{ url: 'b.jpg' }],
    },
    wechatAlbumPrompts: {
      'wx-chen': [{ id: 'p1' }],
    },
    wechatSelectedContact: 'wx-chen',
    rpgStates: {},
  };

  const result = actions.migrateWechatContactIdentity.call(store);
  assert.ok(result?.changed);

  const chen = store.wechatUsers.find((c) => c.name === '陈默');
  assert.ok(chen);
  assert.strictEqual(chen.id, 'npc-a');
  assert.strictEqual(chen.characterId, 'npc-a');
  assert.ok(store.wechatUsers.every((c) => c.group || c.id === c.characterId));
  assert.ok(!store.wechatUsers.some((c) => String(c.id).startsWith('wx-')));

  const msgs = store.wechatMessagesByContact['npc-a'] || [];
  assert.ok(msgs.some((m) => m.text === 'hi'));
  assert.ok(msgs.some((m) => m.text === 'yo'));
  assert.ok(msgs.some((m) => m.text === 'old'));
  assert.ok(!store.wechatMessagesByContact['wx-chen']);

  assert.strictEqual(store.wechatSelectedContact, 'npc-a');
  assert.ok((store.wechatAlbumPhotos['npc-a'] || []).some((p) => p.url === 'a.jpg'));
  assert.ok((store.wechatAlbumPhotos['npc-a'] || []).some((p) => p.url === 'b.jpg'));
  assert.ok(!store.wechatAlbumPhotos['wx-chen']);
  assert.ok(store.wechatAlbumPrompts['npc-a']);
  assert.ok(!store.wechatAlbumPrompts['wx-chen']);

  assert.ok(store.wechatUsers.some((c) => c.id === 'group-main' && c.group));
  assert.deepStrictEqual(store.wechatMessagesByContact['group-main'], [{ side: 'system', text: 'ok' }]);
}

Promise.all([runAdd(), runMigrate()]).then(() => {
  console.log('PASS wechat-contact-id-unify');
}).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
