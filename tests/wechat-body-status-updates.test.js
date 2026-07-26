const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function load(rel, context) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}

async function main() {
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

  load('publish/real-world-agent-loop.js', context);
  load('publish/app/wechat/chat-reply-helpers.js', context);
  load('publish/app/wechat/chat-orchestration.js', context);

  const helpers = context.window.GameModules.app.wechat.chatReplyHelpers;
  const orchestration = context.window.GameModules.app.wechat.chatOrchestration;
  assert.ok(typeof helpers.normalizeWechatBodyStatusUpdates === 'function');

  const normalized = helpers.normalizeWechatBodyStatusUpdates([
    { part: '整体', status: '微微发热', reason: '聊到亲密话题后身体发热' },
    { part: '胸部', status: '敏感', description: '胸口发烫', reason: '对方言语挑逗' },
    { part: '无效部位', status: 'x', reason: 'y' },
    { part: '皮肤', status: '', reason: '无状态' },
  ]);
  assert.strictEqual(normalized.length, 2);
  assert.strictEqual(normalized[0].partKey, 'overall');
  assert.strictEqual(normalized[1].partKey, 'chest');

  const applied = [];
  context.window.GameModules.characterStateStore = {
    async save(state) { applied.push(JSON.parse(JSON.stringify(state.values.bodyStatus))); },
  };
  context.window.GameModules.initPromptRegistry = { ensureTemplateState() {} };

  const store = {
    rpgStates: {},
  };
  const state = { id: 'npc-a', profile: { name: '陈默' }, values: { bodyStatus: {} } };
  store.rpgStates['npc-a'] = state;

  const result = await orchestration.applyWechatBodyStatusUpdates.call(store, state, normalized);
  assert.strictEqual(result.length, 2);
  assert.ok(state.values.bodyStatus.overall);
  assert.ok(state.values.bodyStatus.chest);
  assert.strictEqual(applied.length, 1);

  const prompt = fs.readFileSync(path.join(root, 'publish/prompts/wechat-chat-reply.md'), 'utf8');
  assert.match(prompt, /bodyStatusUpdates/u);
  assert.match(fs.readFileSync(path.join(root, 'publish/app/wechat/chat-orchestration.js'), 'utf8'), /applyWechatBodyStatusUpdates/u);
  assert.match(fs.readFileSync(path.join(root, 'publish/ui/wechat/view-helpers.js'), 'utf8'), /wechatBodyStatusReasonItems/u);

  console.log('PASS wechat-body-status-updates');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
