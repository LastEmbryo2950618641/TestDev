const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const relativeScriptPath = 'real-world-stream-actions.js';

function loadActions() {
  const context = vm.createContext({
    console,
    JSON,
    RegExp,
    String,
    window: {
      GameModules: {
        realWorldAgentLoop: { finalSeparator: '<!--REAL_WORLD_JSON-->' },
        realWorldAi: { formatNarration: (value) => String(value).trim() },
        realWorldLogStore: { get: () => null },
      },
    },
  });
  const source = fs.readFileSync(path.join(root, 'publish', relativeScriptPath), 'utf8');
  vm.runInContext(source, context, { filename: `publish/${relativeScriptPath}` });
  return context.window.GameModules.realWorldStreamActions;
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'publish', 'boot', 'scripts.json'), 'utf8'));
  assert.ok(manifest.includes(relativeScriptPath), 'real-world stream actions must load at runtime');

  const actions = loadActions();
  const raw = '雨落在玻璃窗上。<!--REAL_WORLD_JSON-->{"type":"scene","reason":"等待列车"}';
  assert.strictEqual(actions.realWorldStreamNarration(raw), '雨落在玻璃窗上。');
  assert.strictEqual(actions.pickRealWorldStreamField('{"thinking":"观察\\n环境","narration":"继续前行"}', 'thinking'), '观察\n环境');

  const traceStore = {
    ...actions,
    realWorldTraceType: (type) => (type === 'scene' ? '场景推演' : type),
  };
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(traceStore.realWorldStreamTrace('raw', (key) => ({ type: 'scene', reason: '等待列车' })[key] || ''))),
    ['步骤进行中｜场景推演', '原因：等待列车'],
  );
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(traceStore.realWorldStreamTrace('raw'))),
    ['步骤进行中｜正在推演', '正在接收现实 AI 的推演内容。'],
  );

  const patches = [];
  const store = {
    ...traceStore,
    realWorldThinkMode: true,
    realWorldLog: [{ id: 'log-1', thinking: '', narration: '', streamTrace: [], streaming: false }],
    patchRealWorldLogEntry: (id, patch, options) => {
      patches.push({ id, patch, options });
      return true;
    },
  };
  assert.strictEqual(
    store.updateRealWorldStream('log-1', '{"thinking":"推理中","narration":"正文","type":"scene","reason":"线索出现"}', { live: true }),
    true,
  );
  assert.strictEqual(patches.length, 1);
  assert.strictEqual(patches[0].id, 'log-1');
  assert.strictEqual(patches[0].patch.thinking, '推理中');
  assert.strictEqual(patches[0].patch.narration, '正文');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(patches[0].options)), { live: true });

  console.log('PASS real-world stream runtime preserves narration, trace, and live patch behavior');
}

run();
