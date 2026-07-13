const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const relativeScriptPath = 'real-world-actions.js';

function loadActions({ failAi = false } = {}) {
  const calls = [];
  const persisted = [];
  const context = vm.createContext({
    console: { error: (...args) => calls.push(['error', ...args]) },
    Date,
    Math,
    Number,
    Object,
    Set,
    String,
    window: {
      GameModules: {
        ai: { choiceText: (choice) => choice.text || '', clampElapsed: (value) => value },
        realWorldAi: {
          generate: async () => {
            calls.push(['generate']);
            if (failAi) throw Object.assign(new Error('AI failed'), { code: 'TEST_FAILURE' });
            return { narration: '推演完成', choices: ['继续'], elapsedSeconds: 60 };
          },
        },
        realWorldLogStore: {
          append: async (entry) => {
            calls.push(['append', entry.type]);
            persisted.push({ ...entry });
            return entry;
          },
          get: (id) => persisted.find((entry) => entry.id === id) || null,
          count: () => persisted.length,
          remove: async (id) => {
            calls.push(['remove', id]);
            const index = persisted.findIndex((entry) => entry.id === id);
            if (index >= 0) persisted.splice(index, 1);
          },
        },
        factionArchive: { recordRealWorld: () => calls.push(['archive']) },
      },
    },
  });
  const source = fs.readFileSync(path.join(root, 'publish', relativeScriptPath), 'utf8');
  vm.runInContext(source, context, { filename: `publish/${relativeScriptPath}` });
  return { actions: context.window.GameModules.realWorldActions, calls, persisted };
}

function createRuntime(actions, calls) {
  return {
    ...actions,
    modelId: 'test-model',
    realWorldInput: '',
    realWorldBusy: false,
    realWorldLog: [],
    realWorldLogTotal: 0,
    realWorldLogPage: 1,
    realWorldLogPageSize: 12,
    isRealCurrentWorld: () => true,
    validateRealWorldFreedom: () => true,
    realWorldActionWithMatter: (text) => text,
    activeRealWorldMatter: () => null,
    phoneDate: () => new Date('2026-07-14T12:00:00.000Z'),
    phoneDateText: () => '2026年7月14日',
    phoneTimeText: () => '12:00:00',
    normalizeRealWorldLog: (entries) => entries,
    realWorldLogMaxPage: () => 1,
    refreshRealWorldLogPage: () => {},
    scrollRealWorldLogBottom: () => {},
    prepareEventsForRealWorldAction: () => calls.push(['prepare']),
    applyRealWorldResult: async (_id, result) => calls.push(['apply', result.narration]),
    recordPlayerRealWorldMemory: async () => calls.push(['memory']),
    save: async () => calls.push(['save']),
  };
}

async function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'publish', 'boot', 'scripts.json'), 'utf8'));
  assert.ok(manifest.includes(relativeScriptPath), 'real-world actions must load at runtime');

  const success = loadActions();
  const successRuntime = createRuntime(success.actions, success.calls);
  await successRuntime.submitRealWorldAction({ text: '观察车站' });
  assert.strictEqual(successRuntime.realWorldBusy, false);
  assert.deepStrictEqual(
    success.calls.filter((call) => ['append', 'prepare', 'generate', 'apply', 'archive', 'memory', 'save'].includes(call[0])).map((call) => call[0]),
    ['append', 'append', 'prepare', 'generate', 'apply', 'archive', 'memory', 'save'],
  );
  assert.strictEqual(success.persisted[0].text, '观察车站');
  assert.strictEqual(success.persisted[1].narration, '现实世界正在推演…');

  const failure = loadActions({ failAi: true });
  const failureRuntime = createRuntime(failure.actions, failure.calls);
  await failureRuntime.submitRealWorldAction('尝试失败行动');
  assert.strictEqual(failureRuntime.realWorldBusy, false);
  assert.strictEqual(failure.calls.some((call) => call[0] === 'remove'), true);
  const failedEntry = failureRuntime.realWorldLog.find((entry) => entry.type === 'ai');
  assert.strictEqual(failedEntry.narration, 'AI请求失败，请重试');
  assert.strictEqual(failedEntry.transientError, true);
  assert.strictEqual(failedEntry.promptPack, null);

  console.log('PASS real-world action runtime preserves submit order, failure cleanup, and log-store boundaries');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
