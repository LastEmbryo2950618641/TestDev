const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

function createLoopContext() {
  const requests = [];
  const context = vm.createContext({
    console,
    performance: { now: () => 0 },
    setTimeout,
    window: {},
  });
  context.window.window = context.window;
  context.window.requestAnimationFrame = (fn) => fn();
  context.window.GameModules = {
    aiProvider: { currentProviderId: () => 'deepseek' },
    aiRequest: {
      latestRequestId: 1,
      complete: async (options) => {
        requests.push(options);
        await options.onChunk?.('{}', true, { buffer: '{}', doneSeen: true });
        return '{}';
      },
    },
    realWorldAi: { latestRequestId: 1 },
    ai: { latestRequestId: 1 },
    promptSkills: {
      completionOptions(id) {
        if (id === 'inference-stage3-narration') return { jsonMode: false, outputLimitKind: 'stage3' };
        return { jsonMode: true, responseFormat: { type: 'json_object' }, outputLimitKind: 'stage1' };
      },
    },
  };
  loadScript(context, 'publish/real-world-agent-loop.js');
  return { context, loop: context.window.GameModules.realWorldAgentLoop, requests };
}

async function testJsonStagesKeepThinkingAndJsonMode() {
  const { loop, requests } = createLoopContext();
  const store = { modelId: 'deepseek-v4-flash' };
  await loop.completeConfiguredStep(store, 'prompt', 'log-1', false, {
    ...loop.realConfig(),
    promptId: 'inference-stage1-guided-query',
    reasoningPhase: 'stage1',
  });
  assert.strictEqual(requests.length, 1);
  assert.strictEqual(requests[0].deepThinking, true);
  assert.strictEqual(requests[0].jsonMode, true);
  assert.deepStrictEqual(requests[0].responseFormat, { type: 'json_object' });
}

async function testStage3StillDoesNotUseJsonMode() {
  const { loop, requests } = createLoopContext();
  const store = {
    modelId: 'deepseek-v4-flash',
    realWorldLog: [],
    patchRealWorldLogEntry() {},
    updateRealWorldStream() { return false; },
  };
  await loop.completeConfiguredStep(store, 'prompt', 'log-1', true, {
    ...loop.realConfig(),
    promptId: 'inference-stage3-narration',
    reasoningPhase: 'stage3',
  });
  assert.strictEqual(requests.length, 1);
  assert.strictEqual(requests[0].deepThinking, true);
  assert.strictEqual(requests[0].jsonMode, false);
  assert.strictEqual(requests[0].responseFormat, undefined);
}

function testPromptSkillsDefaultPolicy() {
  const context = vm.createContext({
    window: {
      GameModules: {
        promptTemplates: {
          items: [
            { id: 'inference-stage1-guided-query', title: 'stage1' },
            { id: 'inference-stage3-narration', title: 'stage3' },
          ],
        },
      },
    },
  });
  context.window.window = context.window;
  loadScript(context, 'publish/prompt-skills.js');
  const skills = context.window.GameModules.promptSkills;
  const stage1 = skills.completionOptions('inference-stage1-guided-query');
  assert.strictEqual(stage1.jsonMode, true);
  assert.strictEqual(JSON.stringify(stage1.responseFormat), JSON.stringify({ type: 'json_object' }));
  assert.strictEqual(stage1.deepThinking, true);
  const stage1NoThinking = skills.completionOptions('inference-stage1-guided-query', { deepThinking: false });
  assert.strictEqual(stage1NoThinking.jsonMode, true);
  assert.strictEqual(stage1NoThinking.deepThinking, false);
  const stage3 = skills.completionOptions('inference-stage3-narration');
  assert.strictEqual(stage3.jsonMode, false);
  assert.strictEqual(stage3.responseFormat, undefined);
  assert.strictEqual(stage3.deepThinking, false);
}

async function run() {
  await testJsonStagesKeepThinkingAndJsonMode();
  await testStage3StillDoesNotUseJsonMode();
  testPromptSkillsDefaultPolicy();
  console.log('PASS real-world AI request json/deep-thinking policy');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
