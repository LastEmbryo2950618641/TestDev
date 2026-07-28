const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const context = {
  console,
  Date,
  Math,
  window: { GameModules: { promptTemplates: { inline: {} } } },
};
context.window.window = context.window;
vm.createContext(context);

function load(relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

[
  'publish/prompts/推演引擎/stage11-world-news-update.js',
  'publish/news-driver-system.js',
  'publish/news-driver-actions.js',
  'publish/inference/news-driver-stage-update.js',
].forEach(load);

const gm = context.window.GameModules;
const store = {
  newsDriverState: gm.newsDriverSystem.defaultState(),
  phoneDate() { return new Date('2026-07-27T04:00:00.000Z'); },
  save() {},
};
Object.assign(store, gm.newsDriverActions);
store.initNewsDriver();
store.newsDriverState.items = gm.newsDriverSystem.rankItems([
  gm.newsDriverSystem.normalizeNewsItem({
    channelId: 'local-life',
    title: '邻里仓折扣超市今晚在锦苑小区东门试营业',
    summary: '邻里仓折扣超市在7月27日18:00于锦苑小区东门开启试营业，推出临期零食、洗护纸品和冷冻食品折扣，居民群开始分享排队位置和停车入口。',
    tags: ['邻里仓', '夜间折扣', '社区消费'],
    scope: 'local',
    heat: 95,
    rankReason: '地点、时间和折扣对象都明确，居民群转发量高，能够直接影响晚间购物行动。',
    taskPotential: 'strong',
    source: 'ai',
  }, { nowIso: '2026-07-27T04:00:00.000Z', source: 'ai' }),
]);

const prompt = gm.inferenceNewsDriverStageUpdate.buildPrompt({
  store,
  action: '刷手机看看附近有什么动静',
  narration: '你打开手机，看到小区群里有人讨论新开的折扣超市。',
});

assert.match(prompt, /# Stage12 世界新闻热榜结算/u);
assert.match(prompt, /固定频道/u);
assert.match(prompt, /邻里仓折扣超市/u);
assert.match(prompt, /刷手机看看附近有什么动静/u);
assert.doesNotMatch(prompt, /\{\{当前新闻热榜\}\}/u);
assert.strictEqual(gm.promptTemplates.inline['inference-stage-world-news-update'], undefined);
assert.ok(gm.promptTemplates.inline['inference-stage11-world-news-update']);

const updatePrompt = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage11-world-news-update.md'), 'utf8');
assert.match(updatePrompt, /每轮必须输出至少 1 条新闻动态操作/u);
assert.match(updatePrompt, /热榜是世界公共信息流驱动/u);
assert.doesNotMatch(updatePrompt, /\{ "ops": \[\], "done": true \}/u);

console.log('news-driver-stage11 tests passed');
