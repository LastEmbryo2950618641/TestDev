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
    setInterval,
    clearInterval,
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

test('aiRequest.complete reports token record id before provider starts', async () => {
  const events = [];
  const context = createContext();
  context.window.GameModules.tokenStats = {
    record() { events.push('record'); return 'token-live-1'; },
    recordResponse() { events.push('response'); },
    recordProgress() {},
  };
  loadScript(context, 'publish/ai-provider.js');
  context.window.GameModules.aiProvider.register('deepseek', {
    async complete(options) {
      events.push(`provider:${options.tokenRecordId || 'none'}`);
      await options.onChunk?.('ok', true, {});
      return 'ok';
    },
  });
  loadScript(context, 'publish/ai-request.js');
  const seen = [];
  const text = await context.window.GameModules.aiRequest.complete({
    source: 'unit-test-live-token',
    prompt: 'hello',
    timeoutMs: 2000,
    onTokenRecord(recordId) { seen.push(recordId); events.push(`callback:${recordId}`); },
  });
  assert.strictEqual(text, 'ok');
  assert.deepStrictEqual(seen, ['token-live-1']);
  assert.deepStrictEqual(events.slice(0, 3), ['record', 'callback:token-live-1', 'provider:token-live-1']);
});

test('aiRequest.complete still invokes token record callback when tokenStats is unavailable', async () => {
  const context = createContext();
  delete context.window.GameModules.tokenStats;
  loadScript(context, 'publish/ai-provider.js');
  context.window.GameModules.aiProvider.register('deepseek', {
    async complete(options) {
      await options.onChunk?.('ok', true, {});
      return 'ok';
    },
  });
  loadScript(context, 'publish/ai-request.js');
  const seen = [];
  const text = await context.window.GameModules.aiRequest.complete({
    source: 'unit-test-no-token-module',
    prompt: 'hello',
    timeoutMs: 2000,
    onTokenRecord(recordId) { seen.push(recordId); },
  });
  assert.strictEqual(text, 'ok');
  assert.deepStrictEqual(seen, [undefined]);
});

test('deepseek streaming requests include usage and update cache stats', async () => {
  const tokenResponses = [];
  const context = createContext();
  context.TextDecoder = TextDecoder;
  context.TextEncoder = TextEncoder;
  context.window.GameModules.tokenStats = {
    record() { return 'token-1'; },
    recordResponse(...args) { tokenResponses.push(args); },
  };
  let requestBody = null;
  context.fetch = async (_url, request) => {
    requestBody = JSON.parse(request.body);
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"content":"A"}}]}\n\n',
      'data: {"usage":{"prompt_tokens":100,"completion_tokens":5,"total_tokens":105,"prompt_cache_hit_tokens":60,"prompt_cache_miss_tokens":40},"choices":[]}\n\n',
      'data: [DONE]\n\n',
    ].map((chunk) => encoder.encode(chunk));
    return {
      ok: true,
      body: {
        getReader() {
          let index = 0;
          return {
            async read() {
              if (index >= chunks.length) return { done: true };
              return { done: false, value: chunks[index++] };
            },
          };
        },
      },
    };
  };
  loadScript(context, 'publish/ai-provider.js');
  loadScript(context, 'publish/ai-provider-deepseek.js');
  loadScript(context, 'publish/ai-request.js');

  const text = await context.window.GameModules.aiRequest.complete({
    source: 'unit-test',
    prompt: 'hello',
    stream: true,
    timeoutMs: 2000,
  });

  assert.strictEqual(text, 'A');
  assert.strictEqual(requestBody.stream, true);
  assert.deepStrictEqual(requestBody.stream_options, { include_usage: true });
  assert.strictEqual(tokenResponses.length, 1);
  assert.strictEqual(tokenResponses[0][0], 'token-1');
  assert.strictEqual(tokenResponses[0][3].usage.prompt_tokens, 100);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(tokenResponses[0][3].deepseekCache)), {
    promptCacheHitTokens: 60,
    promptCacheMissTokens: 40,
  });
});

test('deepseek streaming JSON requests keep response format and include usage', async () => {
  const context = createContext();
  context.TextDecoder = TextDecoder;
  context.TextEncoder = TextEncoder;
  let requestBody = null;
  context.fetch = async (_url, request) => {
    requestBody = JSON.parse(request.body);
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"content":"{\\"ok\\":true}"}}]}\n\n',
      'data: {"usage":{"prompt_tokens":10,"completion_tokens":3,"total_tokens":13,"prompt_cache_hit_tokens":4,"prompt_cache_miss_tokens":6},"choices":[]}\n\n',
      'data: [DONE]\n\n',
    ].map((chunk) => encoder.encode(chunk));
    return {
      ok: true,
      body: {
        getReader() {
          let index = 0;
          return {
            async read() {
              if (index >= chunks.length) return { done: true };
              return { done: false, value: chunks[index++] };
            },
          };
        },
      },
    };
  };
  loadScript(context, 'publish/ai-provider.js');
  loadScript(context, 'publish/ai-provider-deepseek.js');

  const provider = context.window.GameModules.aiProvider.get('deepseek');
  const seen = [];
  const text = await provider.complete({
    model: 'deepseek-v4-flash',
    messages: [{ role: 'user', content: 'return json' }],
    stream: true,
    jsonMode: true,
    responseFormat: { type: 'json_object' },
    onChunk(_chunk, done, info) {
      if (done) seen.push(info);
    },
  });

  assert.strictEqual(text, '{"ok":true}');
  assert.strictEqual(requestBody.stream, true);
  assert.deepStrictEqual(requestBody.response_format, { type: 'json_object' });
  assert.deepStrictEqual(requestBody.stream_options, { include_usage: true });
  assert.strictEqual(seen[0].usage.prompt_tokens, 10);
  assert.strictEqual(seen[0].deepseekCache.promptCacheHitTokens, 4);
});

test('dzmm provider omits unsupported false flags from JSON requests', async () => {
  const context = createContext();
  let payload = null;
  context.window.dzmm = {
    completions(options, onChunk) {
      payload = options;
      onChunk('ok', true);
    },
  };
  loadScript(context, 'publish/ai-provider.js');
  loadScript(context, 'publish/ai-provider-dzmm.js');
  const text = await context.window.GameModules.aiProvider.get('dzmm').complete({
    model: 'nalang-turbo-0826',
    messages: [{ role: 'user', content: 'hello' }],
    deepThinking: false,
    maxTokens: undefined,
  });
  assert.strictEqual(text, 'ok');
  assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'deepThinking'));
  assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'maxTokens'));
});

test('dzmm provider keeps enabled deep thinking flag', async () => {
  const context = createContext();
  let payload = null;
  context.window.dzmm = {
    completions(options, onChunk) {
      payload = options;
      onChunk('ok', true);
    },
  };
  loadScript(context, 'publish/ai-provider.js');
  loadScript(context, 'publish/ai-provider-dzmm.js');
  await context.window.GameModules.aiProvider.get('dzmm').complete({
    model: 'nalang-turbo-0826',
    messages: [{ role: 'user', content: 'hello' }],
    deepThinking: true,
    maxTokens: 512,
  });
  assert.strictEqual(payload.deepThinking, true);
  assert.strictEqual(payload.maxTokens, 512);
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
