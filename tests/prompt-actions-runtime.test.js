const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = { tokenStatsState: { version: 0 } };
const context = vm.createContext({
  window: {
    GameModules: {
      characterMemory: { estimateTokens: (text) => Math.ceil(String(text || '').length / 2) },
      promptTemplates: {
        items: [],
        list: () => [{ id: 'template-a', title: '模板A', category: '固定模板', file: 'a.md', summary: '模板说明' }],
        defaultState: () => ({ open: false, query: '', category: '', selectedId: '', selectedText: '', loading: false, error: '' }),
        find: () => null,
        snapshot: () => '',
        load: async () => '',
      },
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
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', 'prompt-actions.js'), 'utf8'), context);

const tokenStats = context.window.GameModules.tokenStats;
const promptActions = context.window.GameModules.promptActions;
const runtimeId = tokenStats.record('real-stage1-context', '完整提示词', {
  title: 'Stage1 资料查询',
  category: '剧情推演',
  summary: '正文前资料路由。',
  model: 'deepseek-v4-flash',
});
tokenStats.recordResponse(runtimeId, '{"ok":true}', [], {
  usage: {
    prompt_tokens: 100,
    completion_tokens: 20,
    total_tokens: 120,
    prompt_cache_hit_tokens: 80,
    prompt_cache_miss_tokens: 20,
  },
  durationMs: 1300,
  completedAt: Date.now(),
});

const game = {
  promptState: context.window.GameModules.promptTemplates.defaultState(),
  ...promptActions,
};
const items = game.promptList();
const runtimeItem = items.find((item) => item.runtimeRecordId === runtimeId);

assert.ok(runtimeItem, '提示词管理应显示非绘图类运行时 AI 请求');
assert.strictEqual(items[0].runtimeRecordId, runtimeId, '运行时 AI 请求应排在固定模板前面，方便查看本轮耗时与 token');
assert.strictEqual(runtimeItem.title, 'Stage1 资料查询');
assert.ok(game.promptItemMetaText(runtimeItem).includes('剧情推演'));
assert.ok(game.promptItemMetaText(runtimeItem).includes('正文前资料路由。'));
assert.ok(game.promptItemMetaText(runtimeItem).includes('实耗 120 token'));
assert.ok(game.promptItemMetaText(runtimeItem).includes('缓存命中80/100 token（80%）'));
assert.ok(game.promptItemMetaText(runtimeItem).includes('耗时1.3s'));

console.log('PASS prompt app lists runtime AI requests with token/cache/duration metadata');
