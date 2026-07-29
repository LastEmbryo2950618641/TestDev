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
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    URL,
    Headers,
    AbortController,
    fetch: overrides.fetch || (async () => { throw new Error('fetch not mocked'); }),
    window: {
      GameModules: {
        config: {
          defaultModelId: 'nalang-turbo-0826',
          textProviders: {
            defaultProvider: 'dzmm',
            dzmm: { defaultModel: 'nalang-turbo-0826' },
            deepseek: {
              baseUrl: 'https://api.deepseek.com',
              defaultModel: 'deepseek-v4-flash',
            },
          },
        },
      },
      Alpine: {
        store(name) {
          if (name !== 'game') return null;
          return overrides.store || {
            settingsState: {
              textProvider: 'deepseek',
              deepseekApiKey: 'sk-test',
              deepseekBaseUrl: 'https://api.deepseek.com',
              deepseekModel: 'deepseek-v4-flash',
              textModelId: 'deepseek-v4-flash',
            },
            modelId: 'deepseek-v4-flash',
          };
        },
      },
      dzmm: overrides.dzmm,
    },
  });
  context.window.window = context.window;
  context.window.Alpine = context.window.Alpine;
  return context;
}

test('provider registry resolves current provider from settings state', () => {
  const context = createContext();
  loadScript(context, 'publish/ai-provider.js');
  const provider = context.window.GameModules.aiProvider;
  assert.strictEqual(provider.currentProviderId(), 'deepseek');
  assert.strictEqual(provider.providerConfig('deepseek').baseUrl, 'https://api.deepseek.com');
});

test('provider direct complete records token stats unless suppressed', async () => {
  const calls = [];
  const context = createContext();
  context.window.GameModules.tokenStats = {
    record(source, text, meta) {
      calls.push(['record', source, text, meta.title]);
      return 'token-1';
    },
    recordProgress(id, meta) {
      calls.push(['progress', id, meta.status]);
    },
    recordResponse(id, text) {
      calls.push(['response', id, text]);
    },
    recordError(id, err) {
      calls.push(['error', id, err?.message || String(err)]);
    },
  };
  loadScript(context, 'publish/ai-provider.js');
  const registry = context.window.GameModules.aiProvider;
  registry.register('deepseek', {
    async complete(options) {
      await options.onChunk?.('OK', true, { buffer: 'OK', usage: { total_tokens: 2 } });
      await options.onDone?.({ usage: { total_tokens: 2 } });
      return 'OK';
    },
  });
  const provider = registry.get('deepseek');
  assert.strictEqual(await provider.complete({ source: 'direct-test', prompt: 'hello' }), 'OK');
  assert.deepStrictEqual(calls.map((item) => item[0]), ['record', 'progress', 'response']);
  calls.length = 0;
  assert.strictEqual(await provider.complete({ source: 'direct-test', prompt: 'hello', suppressTokenStats: true }), 'OK');
  assert.deepStrictEqual(calls, []);
});

test('deepseek listTextModels normalizes model payload', async () => {
  const fetchCalls = [];
  const context = createContext({
    fetch: async (url, options) => {
      fetchCalls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'deepseek-v4-flash' },
            { id: 'deepseek-v4-pro' },
          ],
        }),
      };
    },
  });
  loadScript(context, 'publish/ai-provider.js');
  loadScript(context, 'publish/ai-provider-deepseek.js');
  const provider = context.window.GameModules.aiProvider.get('deepseek');
  const result = await provider.listTextModels();
  assert.strictEqual(fetchCalls.length, 1);
  assert.strictEqual(fetchCalls[0].url, 'https://api.deepseek.com/models');
  assert.strictEqual(result.defaultModel, 'deepseek-v4-flash');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(result.models.map((item) => item.internalName))),
    ['deepseek-v4-flash', 'deepseek-v4-pro'],
  );
});


test('deepseek keeps selected flash model when deep thinking is enabled', async () => {
  const context = createContext();
  let payload = null;
  context.fetch = async (_url, request) => {
    payload = JSON.parse(request.body);
    return {
      ok: true,
      async json() {
        return {
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          choices: [{ message: { content: 'ok' } }],
        };
      },
    };
  };
  loadScript(context, 'publish/ai-provider.js');
  loadScript(context, 'publish/ai-provider-deepseek.js');
  const provider = context.window.GameModules.aiProvider.get('deepseek');
  const text = await provider.complete({
    model: 'deepseek-v4-flash',
    messages: [{ role: 'user', content: 'hello' }],
    deepThinking: true,
  });
  assert.strictEqual(text, 'ok');
  assert.strictEqual(payload.model, 'deepseek-v4-flash');
  assert.strictEqual(payload.reasoning_effort, 'high');
});test('deepseek complete maps chat completion response to text buffer', async () => {
  const seen = [];
  const context = createContext({
    fetch: async (url, options) => {
      seen.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: '这是 DeepSeek 返回。',
              },
            },
          ],
        }),
      };
    },
  });
  loadScript(context, 'publish/ai-provider.js');
  loadScript(context, 'publish/ai-provider-deepseek.js');
  const provider = context.window.GameModules.aiProvider.get('deepseek');
  const chunks = [];
  const text = await provider.complete({
    model: 'deepseek-v4-flash',
    messages: [{ role: 'user', content: '你好' }],
    maxTokens: 512,
    onChunk(chunk, done) {
      chunks.push({ chunk, done });
    },
  });
  assert.strictEqual(text, '这是 DeepSeek 返回。');
  assert.strictEqual(chunks.length, 1);
  assert.deepStrictEqual(chunks[0], { chunk: '这是 DeepSeek 返回。', done: true });
  const payload = JSON.parse(seen[0].options.body);
  assert.strictEqual(payload.model, 'deepseek-v4-flash');
  assert.strictEqual(payload.max_tokens, 512);
  assert.deepStrictEqual(payload.messages, [{ role: 'user', content: '你好' }]);
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

