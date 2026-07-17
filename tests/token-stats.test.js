const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = { tokenStatsState: { version: 0 } };
const context = vm.createContext({
  window: {
    GameModules: {
      characterMemory: { estimateTokens: (text) => Math.ceil(String(text || '').length / 2) },
      promptTemplates: { items: [], list: () => [] },
    },
    Alpine: {
      store(name) {
        return name === 'game' ? store : null;
      },
    },
  },
});
context.window.window = context.window;

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', 'token-stats.js'), 'utf8'), context);

const tokenStats = context.window.GameModules.tokenStats;

assert.ok(tokenStats.rowCostText({ tokens: 1200, credits: 2 }).includes('请求中，估算 1200 token'));
assert.ok(tokenStats.rowCostText({ tokens: 1200, credits: 2, completedAt: 1 }).includes('未返回用量，估算 1200 token'));
assert.ok(tokenStats.rowCostText({
  tokens: 1200,
  credits: 2,
  actualTotalTokens: 1000,
  promptCacheHitTokens: 600,
  promptCacheMissTokens: 400,
  completedAt: 1,
}).includes('缓存命中600/1000 token（60%）'));

const beforeRecordVersion = store.tokenStatsState.version;
const recordId = tokenStats.record('unit-test', 'hello', { model: 'deepseek-v4-flash' });
assert.strictEqual(store.tokenStatsState.version, beforeRecordVersion + 1);
assert.ok(tokenStats.rowCostText(tokenStats.item(recordId)).includes('请求中'));

const beforeResponseVersion = store.tokenStatsState.version;
tokenStats.recordResponse(recordId, '{"ok":true}', [], {
  usage: {
    prompt_tokens: 10,
    completion_tokens: 2,
    total_tokens: 12,
    prompt_cache_hit_tokens: 7,
    prompt_cache_miss_tokens: 3,
  },
  completedAt: 1,
});
assert.strictEqual(store.tokenStatsState.version, beforeResponseVersion + 1);
assert.ok(tokenStats.rowCostText(tokenStats.item(recordId)).includes('实耗 12 token'));
assert.ok(tokenStats.rowCostText(tokenStats.item(recordId)).includes('缓存命中7/10 token（70%）'));

console.log('PASS token stats row text distinguishes pending, missing usage, and cache hits');
