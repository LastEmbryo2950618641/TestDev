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
  console,
  Date,
  Math,
  String,
  Array,
  Object,
  Boolean,
  Number,
  JSON,
  Promise,
  Set,
  Map,
});
context.window.window = context.window;

// Stub heavy deps referenced at runtime only; loop module assigns itself on load.
load('publish/real-world-agent-loop.js', context);
const loop = context.window.GameModules.realWorldAgentLoop;
assert.ok(typeof loop.appendWechatDialogueContext === 'function');
assert.ok(typeof loop.shouldSkipMaterialDueToWechatContext === 'function');

const store = {
  realWorldAgentKvByMode: {},
};

loop.appendWechatDialogueContext(store, {
  contactName: '陈默',
  contactId: 'npc-a',
  playerText: '表格发我了吗',
  replyText: '刚发你微信了',
  timeLabel: '2026-07-27 12:00',
  kind: 'exchange',
});

const bucket = store.realWorldAgentKvByMode.real;
assert.ok(bucket?.messages?.length >= 1);
assert.match(bucket.messages[0].content, /【微信对话/u);
assert.match(bucket.messages[0].content, /陈默/u);
assert.match(bucket.messages[0].content, /表格发我了吗/u);

const summary = loop.summarizeWechatInAgentContext(store, 'real');
assert.strictEqual(summary.hasWechat, true);
assert.ok(summary.ids.includes('npc-a') || summary.names.includes('陈默'));
assert.match(summary.hint, /勿再请求|禁止再请求/u);

assert.strictEqual(loop.shouldSkipMaterialDueToWechatContext(store, {
  skill: 'wechat.query',
  method: 'getThread',
  params: { contactId: 'npc-a' },
}), true);
assert.strictEqual(loop.shouldSkipMaterialDueToWechatContext(store, {
  skill: 'memory.query',
  method: 'searchCharacterMemory',
  params: { characterId: 'npc-a', keyword: '表格' },
}), true);
assert.strictEqual(loop.shouldSkipMaterialDueToWechatContext(store, {
  skill: 'character.query',
  method: 'searchCharacterProfile',
  params: { name: '陈默' },
}), false);
assert.strictEqual(loop.shouldSkipMaterialDueToWechatContext(store, {
  skill: 'wechat.query',
  method: 'getThread',
  params: { contactId: 'other-id' },
}), false);

// Live session path
const liveStore = {
  realWorldAgentKvByMode: {},
  realWorldAgentActiveKvByMode: {
    real: { messages: [{ role: 'user', content: '先前推演' }], requestCount: 1 },
  },
};
loop.appendWechatDialogueContext(liveStore, {
  contactName: '林夏',
  contactId: 'intro-b',
  replyText: '加你好友方便约饭',
  timeLabel: '2026-07-27 13:00',
  kind: 'incoming',
});
assert.ok(liveStore.realWorldAgentActiveKvByMode.real.messages.some((m) => /【微信对话/u.test(m.content)));
assert.ok(liveStore.realWorldAgentKvByMode.real.messages.some((m) => /林夏/u.test(m.content)));

const stage1 = fs.readFileSync(path.join(root, 'publish/real-world-agent-context.js'), 'utf8');
assert.match(stage1, /summarizeWechatInAgentContext/u);

const chat = fs.readFileSync(path.join(root, 'publish/app/wechat/chat-orchestration.js'), 'utf8');
assert.match(chat, /appendWechatDialogueContext/u);
assert.match(chat, /runWechatBehaviorShortInference/u);
assert.match(chat, /mirrorExternalContextToRealWorldLog/u);

loop.appendCharacterBehaviorContext(store, {
  contactName: '陈默',
  contactId: 'npc-a',
  narration: '陈默发完消息后把手机扣在桌上，继续改那份季度方案，偶尔瞥一眼未读角标。',
  currentLocation: '公司工位',
  currentAction: '改季度方案',
  availability: '场外',
  timeLabel: '2026-07-27 12:01',
});
assert.ok(store.realWorldAgentKvByMode.real.messages.some((m) => /【人物行为/u.test(m.content)));

async function main() {
  const logged = [];
  context.window.GameModules.realWorldLogStore = {
    async append(entry) { logged.push(entry); },
    count() { return logged.length; },
  };
  const last = store.realWorldAgentKvByMode.real.messages[store.realWorldAgentKvByMode.real.messages.length - 1];
  await loop.mirrorExternalContextToRealWorldLog(store, {
    content: last.content,
    kind: 'behavior',
    contactName: '陈默',
    contactId: 'npc-a',
    timeLabel: '2026-07-27 12:01',
  });
  assert.strictEqual(logged.length, 1);
  assert.strictEqual(logged[0].contextKind, 'behavior');
  assert.match(logged[0].narration, /【人物行为/u);
  console.log('PASS wechat-agent-context-append');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
