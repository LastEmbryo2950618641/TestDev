const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function loadScript(context, relativePath) {
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
}

const prompt = read('publish/prompts/推演引擎/stage1-guided-query.md');
assert.ok(prompt.includes('可区分称呼(ID)'));
assert.ok(prompt.includes('待建卡'));
assert.ok(prompt.includes('一次性批量') || prompt.includes('批量'));
assert.ok(prompt.includes('介绍卡'));
assert.ok(prompt.includes('rel-ai-*') || /rel-ai-/u.test(prompt));
assert.ok(prompt.includes('不会在 Stage1 真正建介绍卡'));

const context = {
  window: {
    GameModules: {
      characterIdEnsure: null,
      predefinedRoleCards: {
        async createState(card, store, id) {
          const state = {
            id,
            name: card.name,
            worldTag: card.work,
            profile: { id, name: card.name, work: card.work, role: card.role, detail: card.detail },
            values: {},
          };
          store.rpgStates[id] = state;
          return state;
        },
      },
      rpgState: { seed: (text) => [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) },
      characterStateStore: null,
      characterIntroStore: { get() { return null; } },
    },
  },
  console,
};
loadScript(context, 'publish/character-state-store.js');
loadScript(context, 'publish/character-id-ensure.js');
context.window.GameModules.characterStateStore = context.window.GameModules.characterStateStore;
context.window.GameModules.characterIdEnsure = context.window.GameModules.characterIdEnsure;

const loopContext = {
  window: context.window,
  console,
  String,
  Boolean,
  Array,
  Object,
  Error,
  JSON,
  Math,
  Date,
  Number,
  Set,
  Map,
  Promise,
};
loadScript(loopContext, 'publish/real-world-agent-loop.js');
const api = loopContext.window.GameModules.realWorldAgentLoop
  || Object.values(loopContext.window.GameModules).find((item) => item && typeof item.parseParticipantToken === 'function');

assert.ok(api, 'agent loop with parseParticipantToken should load');

const parsed = api.parseParticipantToken('刘思琪(rel-ai-247528)');
assert.strictEqual(parsed.name, '刘思琪');
assert.strictEqual(parsed.id, 'rel-ai-247528');
assert.strictEqual(api.participantDisplayName(parsed), '刘思琪(rel-ai-247528)');

const pending = api.parseParticipantToken('陌生邻居(待建卡)');
assert.strictEqual(pending.name, '陌生邻居');
assert.strictEqual(pending.id, '待建卡');

const bare = [{ name: '刘思琪' }];
api.assertParticipantIdTokens(bare, 'forced');
assert.strictEqual(bare[0].id, '待建卡');

const host = { rpgStates: {}, selectedWork: '2026 现代都市现实世界' };
context.window.GameModules.characterStateStore.bindLiveHost(host);
const layers = {
  forcedParticipants: [{ name: '测试新人', id: '待建卡' }],
  priorityCandidates: [],
  dramaCandidates: [],
  forbiddenParticipants: [],
};
(async () => {
  const batch = await context.window.GameModules.characterIdEnsure.ensureBatch(host, layers);
  assert.strictEqual(batch.count, 0);
  assert.strictEqual(layers.forcedParticipants[0].id, '待建卡');
  assert.strictEqual(Object.keys(host.rpgStates).length, 0, 'Stage1 should only assign shared ids, not create stub cards');
  console.log('PASS stage1 participant id format + no pending id allocation');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


