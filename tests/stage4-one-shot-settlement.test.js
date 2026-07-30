const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadScript(context, relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

async function run() {
  const context = vm.createContext({
    console,
    performance: { now: () => 0 },
    window: {
      GameModules: {
        jsonUtils: {
          extractJson(text = '') { return String(text || '').trim(); },
          repairJson(text = '') { return String(text || ''); },
          parseLoose(text = '') { return JSON.parse(String(text || '{}')); },
        },
        aiRequest: { outputTailLooksTruncated: () => false },
        ai: { normalizeChoices(choices, fallback = []) { return Array.isArray(choices) && choices.length ? choices : fallback; } },
        promptTemplates: { render: async (_id, vars) => JSON.stringify(vars) },
      },
    },
  });
  context.window.window = context.window;

  loadScript(context, 'publish/real-world-agent-loop.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  let calls = 0;

  loop.settlementTypeQueue = () => ['情绪', '感觉'];
  loop.buildSettlementTypeWindowMessages = async ({ requestedTypes }) => JSON.stringify({ requestedTypes });
  loop.completeConfiguredStep = async () => {
    calls += 1;
    return '{}';
  };
  loop.parseSettlementJson = () => ({
    format: 'json',
    completeTypes: ['情绪'],
    incompleteTypes: ['感觉'],
    patchesByType: { 情绪: { genericUpdates: [] } },
  });
  loop.parseSettlementKv = () => ({ format: 'kv', completeTypes: [], incompleteTypes: ['感觉'], patchesByType: {} });

  await loop.completeConfiguredSettlementKvWindow({
    store: {},
    action: '测试行动',
    base: '测试基础',
    loaded: [],
    materialSession: null,
    narration: '测试正文',
    trace: [],
    participants: [],
    logId: null,
    config,
  });

  assert.strictEqual(calls, 1, 'Stage4 should not retry incomplete settlement keys in one-shot mode');

  calls = 0;
  loop.settlementTypeQueue = () => ['情绪', '感觉'];
  loop.completeConfiguredStep = async () => {
    calls += 1;
    return '太短';
  };
  loop.parseSettlementJson = () => null;
  loop.parseSettlementKv = () => ({
    format: 'kv',
    completeTypes: [],
    incompleteTypes: ['情绪', '感觉'],
    patchesByType: {},
  });

  await loop.completeConfiguredSettlementKvWindow({
    store: {},
    action: '测试行动',
    base: '测试基础',
    loaded: [],
    materialSession: null,
    narration: '测试正文',
    trace: [],
    participants: [],
    logId: null,
    config,
  });

  assert.strictEqual(calls, 1, 'Stage4 should not retry short settlement output in one-shot mode');
  console.log('PASS stage4 one-shot settlement');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
