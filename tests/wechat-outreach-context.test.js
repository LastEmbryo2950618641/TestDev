const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(rel, context) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}

function createContext() {
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
  context.window.window = context.window;
  return context;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('intentChain normalizes cause-process-result-whyPlayer', () => {
  const context = createContext();
  load('publish/wechat-outreach-context.js', context);
  const mod = context.window.GameModules.wechatOutreachContext;
  const chain = mod.normalizeIntentChain({
    cause: '方案缺上周表格',
    process: '自己先翻本地备份没找到',
    result: '今晚就要交初稿，还差数据',
    whyPlayer: '只有你手里有完整表',
  });
  assert.strictEqual(chain.cause, '方案缺上周表格');
  assert.ok(chain.process);
  assert.ok(chain.result);
  assert.ok(chain.whyPlayer);
  const fromInbox = mod.intentChainFromInboxItem({
    want: '赶方案缺数据',
    needPlayerWhy: '问你要上周表格',
  });
  assert.match(fromInbox.whyPlayer || fromInbox.cause, /表格|方案/u);
});

test('outreach prompt block injects intent, record text, and time-span consequences', () => {
  const context = createContext();
  load('publish/wechat-outreach-context.js', context);
  const mod = context.window.GameModules.wechatOutreachContext;
  const store = {
    realWorldLog: [{
      id: 'real-1-ai',
      type: 'ai',
      narration: '陈默在工位上反复翻找上周表格，最后掏出手机准备找你要。',
    }],
    phoneDate: () => new Date('2026-07-27T18:00:00+08:00'),
  };
  const block = mod.buildOutreachPromptBlock(store, {
    sourceRecordId: 'real-1-ai',
    intentChain: {
      cause: '方案缺表',
      process: '自己找过备份',
      result: '仍缺数据',
      whyPlayer: '需要你发表',
    },
    openedAt: '2026-07-25T10:00:00.000Z',
    source: 'incoming',
  });
  assert.match(block, /起因|过程|结果|找主角/u);
  assert.match(block, /翻找上周表格/u);
  assert.match(block, /时间跨度|事后发展|人物反应|意图/u);
});

test('deliverWechatItems attaches sourceRecordId and intentChain', () => {
  const context = createContext();
  load('publish/character-social-drive.js', context);
  load('publish/wechat-outreach-context.js', context);
  load('publish/social-inbox.js', context);
  const inbox = context.window.GameModules.socialInbox;
  const appended = [];
  const store = {
    realWorldSettlementLogId: 'real-settle-ai',
    phoneDate: () => new Date('2026-07-26T15:00:00+08:00'),
    wechatUsers: [{ id: 'wx-chen', characterId: 'npc-a', name: '陈默', group: false }],
    findWechatIncomingContact(v) {
      return this.wechatUsers.find((c) => c.id === v || c.characterId === v || c.name === v) || null;
    },
    appendWechatMessage(id, msg) { appended.push({ id, msg }); },
  };
  const delivered = inbox.deliverWechatItems(store, [{
    id: 'inbox-1',
    actorId: 'npc-a',
    actorName: '陈默',
    channel: 'wechat',
    hasWechatContact: true,
    want: '赶方案缺数据',
    needPlayerWhy: '问你要上周表格',
  }]);
  assert.strictEqual(delivered.length, 1);
  assert.strictEqual(appended[0].msg.sourceRecordId, 'real-settle-ai');
  assert.ok(appended[0].msg.intentChain?.whyPlayer || appended[0].msg.intentChain?.cause);
  assert.ok(appended[0].msg.openedAt || appended[0].msg.at);
});

test('friend request stores sourceRecordId+intentChain; accept keeps agenda and triggers reply', async () => {
  const context = createContext();
  load('publish/character-social-drive.js', context);
  load('publish/wechat-outreach-context.js', context);
  load('publish/social-inbox.js', context);
  load('publish/wechat-friend-request.js', context);
  const replyCalls = [];
  const store = {
    wechatFriendRequests: [],
    wechatUsers: [],
    realWorldSettlementLogId: 'real-fr-ai',
    rpgStates: {
      'intro-b': {
        id: 'intro-b',
        profile: {
          socialDrive: {
            agenda: { short: '约周末', needPlayer: true, needPlayerWhy: '方便约聚餐', urgency: 0.6, cooldownUntil: '' },
          },
        },
      },
    },
    async save() {},
    normalizeWechatContact(user = {}) {
      const name = String(user.name || '').trim();
      const id = String(user.id || user.characterId || `wx-${name}`).slice(0, 40);
      return { id, characterId: String(user.characterId || id), name, relation: '微信联系人', mark: name.slice(0, 1), latest: '', unread: 0, group: false };
    },
    async addWechatUser(user = {}) {
      const contact = this.normalizeWechatContact(user);
      this.wechatUsers = [...this.wechatUsers, contact];
      return contact;
    },
    async replyWechatContact(contact, playerText) {
      replyCalls.push({ contactId: contact.id, playerText });
    },
  };
  Object.assign(store, context.window.GameModules.wechatFriendRequestActions);
  const req = store.requestWechatFriend({
    fromCharacterId: 'intro-b',
    fromName: '林夏',
    reason: '方便约周末聚餐',
    source: 'social-inbox',
    intentChain: {
      cause: '周末想约同学吃饭',
      process: '先打电话问过意向',
      result: '对方说加微信方便定',
      whyPlayer: '需要你确认时间',
    },
    sourceRecordId: 'real-fr-ai',
  });
  assert.strictEqual(req.sourceRecordId, 'real-fr-ai');
  assert.strictEqual(req.intentChain.whyPlayer, '需要你确认时间');

  await store.acceptWechatFriendRequest(req.id);
  const drive = store.rpgStates['intro-b'].profile.socialDrive;
  assert.strictEqual(drive.agenda.needPlayer, true, 'accept must not clear needPlayer before chat resolves');
  assert.ok(replyCalls.length >= 1, 'accept must trigger wechat reply pipeline');
  assert.match(replyCalls[0].playerText, /通过|好友申请/u);
  const contact = store.wechatUsers.find((c) => c.name === '林夏');
  assert.ok(contact.outreachOpen?.sourceRecordId || contact.outreachOpen?.intentChain);
});

test('closeOutreach marks thread done so later replies skip block', () => {
  const context = createContext();
  load('publish/wechat-outreach-context.js', context);
  const mod = context.window.GameModules.wechatOutreachContext;
  const store = {
    wechatUsers: [{
      id: 'wx-chen',
      characterId: 'npc-a',
      name: '陈默',
      outreachOpen: {
        status: 'open',
        sourceRecordId: 'real-1',
        intentChain: { cause: 'a', process: 'b', result: 'c', whyPlayer: 'd' },
        openedAt: '2026-07-25T10:00:00.000Z',
        source: 'incoming',
      },
    }],
    wechatMessagesByContact: {
      'wx-chen': [{ side: 'other', text: '在吗', sourceRecordId: 'real-1', intentChain: { cause: 'a', process: 'b', result: 'c', whyPlayer: 'd' } }],
    },
  };
  const contact = store.wechatUsers[0];
  assert.ok(mod.findOpenOutreach(store, contact));
  assert.strictEqual(mod.closeOutreach(store, contact), true);
  assert.strictEqual(store.wechatUsers[0].outreachOpen.status, 'done');
  assert.strictEqual(mod.findOpenOutreach(store, store.wechatUsers[0]), null);
});

test('deliverWechatItems skips when sourceRecordId missing', () => {
  const context = createContext();
  load('publish/character-social-drive.js', context);
  load('publish/wechat-outreach-context.js', context);
  load('publish/social-inbox.js', context);
  const inbox = context.window.GameModules.socialInbox;
  const appended = [];
  const store = {
    realWorldSettlementLogId: '',
    phoneDate: () => new Date('2026-07-26T15:00:00+08:00'),
    wechatUsers: [{ id: 'wx-chen', characterId: 'npc-a', name: '陈默', group: false }],
    findWechatIncomingContact(v) {
      return this.wechatUsers.find((c) => c.id === v || c.characterId === v || c.name === v) || null;
    },
    appendWechatMessage(id, msg) { appended.push({ id, msg }); },
  };
  const delivered = inbox.deliverWechatItems(store, [{
    id: 'inbox-1',
    actorId: 'npc-a',
    actorName: '陈默',
    channel: 'wechat',
    hasWechatContact: true,
    want: '赶方案',
    needPlayerWhy: '要表格',
  }]);
  assert.strictEqual(delivered.length, 0);
  assert.strictEqual(appended.length, 0);
});

test('normalizeWechatActions only reads explicit intentChain object', () => {
  const context = createContext();
  context.window.GameModules.jsonUtils = { parseLoose(text) { return JSON.parse(String(text)); } };
  context.window.GameModules.updateRegistry = {
    ensureNormalizedUpdates(raw) { return []; },
    migrateLegacyFactionUpdates(raw) { return raw; },
  };
  context.window.GameModules.ai = {
    clampElapsed: (v, d) => Number(v) || d,
    normalizeMetricUpdates: () => ({}),
    normalizeLexiconUpdates: () => [],
    normalizeCharacter: (item) => item,
  };
  context.window.GameModules.realWorldVitals = { normalize: () => [] };
  context.window.GameModules.eventSystem = { normalizeType: (t) => t, isWritableType: () => true };
  load('publish/wechat-outreach-context.js', context);
  load('publish/real-world-ai.js', context);
  const actions = context.window.GameModules.realWorldAi.normalizeWechatActions([{
    action: 'sendIncomingNow',
    contactId: 'npc-a',
    text: '在吗',
    reason: '找你要表',
    result: 'should-not-become-intent-result',
    intentChain: {
      cause: '缺表',
      process: '找过',
      result: '仍缺',
      whyPlayer: '只有你有',
    },
  }, {
    action: 'sendIncomingNow',
    contactId: 'npc-b',
    text: '嗨',
    reason: '打招呼',
    result: 'polluted',
  }]);
  assert.strictEqual(actions[0].intentChain.result, '仍缺');
  assert.notStrictEqual(actions[1].intentChain.result, 'polluted');
});

test('realWorldAi.parse passes events through', () => {
  const context = createContext();
  context.window.GameModules.jsonUtils = {
    parseLoose(text) { return JSON.parse(String(text)); },
  };
  context.window.GameModules.updateRegistry = {
    ensureNormalizedUpdates(raw) { return Array.isArray(raw.genericUpdates) ? raw.genericUpdates : []; },
    migrateLegacyFactionUpdates(raw) { return raw; },
  };
  context.window.GameModules.ai = {
    clampElapsed: (v, d) => Number(v) || d,
    normalizeMetricUpdates: () => ({}),
    normalizeLexiconUpdates: () => [],
    normalizeCharacter: (item) => (typeof item === 'string' ? { name: item } : item),
  };
  context.window.GameModules.realWorldVitals = { normalize: () => [] };
  context.window.GameModules.eventSystem = {
    normalizeType(t) { return String(t || 'random'); },
    isWritableType() { return true; },
  };
  load('publish/real-world-ai.js', context);
  const parsed = context.window.GameModules.realWorldAi.parse(JSON.stringify({
    narration: '你在公园散步。',
    events: [{ type: 'periodic', title: '国庆节', startDate: '2026-10-01', endDate: '2026-10-07', content: '假期' }],
  }), {}, '散步');
  assert.ok(Array.isArray(parsed.events), 'parse must expose events');
  assert.strictEqual(parsed.events.length, 1);
  assert.strictEqual(parsed.events[0].title, '国庆节');
});

(async () => {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`PASS ${name}`);
  }
  console.log('PASS wechat-outreach-context');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
