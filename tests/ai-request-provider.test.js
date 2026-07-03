const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadScript(context, relPath) {
  const file = path.join(__dirname, '..', relPath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

function createContext(overrides = {}) {
  const store = overrides.store || {
    settingsState: {
      textProvider: 'deepseek',
      textModelId: 'deepseek-v4-flash',
      deepseekApiKey: 'sk-test',
      deepseekBaseUrl: 'https://api.deepseek.com',
      deepseekModel: 'deepseek-v4-flash',
    },
    modelId: 'deepseek-v4-flash',
  };
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    window: {
      GameModules: {
        config: {
          defaultModelId: 'nalang-turbo-0826',
          aiRequest: { maxConcurrent: 4, logLifecycle: false, logRawResponse: false },
          textProviders: {
            defaultProvider: 'dzmm',
            dzmm: { defaultModel: 'nalang-turbo-0826' },
            deepseek: { baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-v4-flash' },
          },
        },
        jsonUtils: {
          mergeStreamText(buffer, chunk) {
            return `${buffer || ''}${chunk || ''}`;
          },
        },
        tokenStats: {
          record() { return null; },
          recordResponse() {},
        },
      },
      Alpine: {
        store(name) {
          if (name !== 'game') return null;
          return store;
        },
      },
    },
  });
  context.window.window = context.window;
  context.window.Alpine = context.window.Alpine;
  return context;
}

test('aiRequest.complete delegates to current provider and returns merged buffer', async () => {
  const seen = [];
  const context = createContext();
  loadScript(context, 'publish/ai-provider.js');
  context.window.GameModules.aiProvider.register('deepseek', {
    async complete(options) {
      seen.push(JSON.parse(JSON.stringify({
        model: options.model,
        messages: options.messages,
        maxTokens: options.maxTokens,
      })));
      await options.onChunk?.('第一段', false, {});
      await options.onChunk?.('第二段', true, {});
      await options.onDone?.({});
      return '第一段第二段';
    },
  });
  loadScript(context, 'publish/ai-request.js');
  const text = await context.window.GameModules.aiRequest.complete({
    source: 'unit-test',
    prompt: '你好',
    maxTokens: 400,
    timeoutMs: 2000,
  });
  assert.strictEqual(text, '第一段第二段');
  assert.deepStrictEqual(seen, [{
    model: 'deepseek-v4-flash',
    messages: [{ role: 'user', content: '你好' }],
    maxTokens: 400,
  }]);
});

test('aiRequest.complete throws capability error when provider is missing complete', async () => {
  const context = createContext();
  loadScript(context, 'publish/ai-provider.js');
  context.window.GameModules.aiProvider.register('deepseek', {});
  loadScript(context, 'publish/ai-request.js');
  await assert.rejects(
    () => context.window.GameModules.aiRequest.complete({ source: 'unit-test', prompt: '你好' }),
    /provider .* unavailable|文本AI接口不可用|complete/i,
  );
});

(async () => {
  for (const item of tests) {
    await item.fn();
    console.log(`PASS ${item.name}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
