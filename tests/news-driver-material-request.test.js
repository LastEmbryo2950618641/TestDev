const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const context = {
  console,
  Date,
  Math,
  window: { GameModules: {} },
};
context.window.window = context.window;
vm.createContext(context);

function load(relativePath) {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath });
}

[
  'publish/inference/material-request-catalog.js',
  'publish/inference/material-loader.js',
  'publish/news-driver-system.js',
  'publish/news-driver-actions.js',
].forEach(load);

const catalog = context.window.GameModules.realWorldAgentContextParts.materialRequestCatalog;
const loader = context.window.GameModules.realWorldAgentContextParts.materialLoader;
const news = context.window.GameModules.newsDriverSystem;

const req = catalog.parseJsonMaterialRequest({ type: '新闻查询', action: '最新热榜', params: ['当前世界'] }, { mode: 'real' });
assert.deepStrictEqual(JSON.parse(JSON.stringify(req)), {
  skill: 'news.query',
  method: 'getLatestHotlist',
  params: { world: '当前世界' },
  sourceJson: { type: '新闻查询', action: '最新热榜', params: ['当前世界'] },
});

const stage1 = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage1-guided-query.md'), 'utf8');
assert.match(stage1, /旧新闻热榜/u, 'Stage1 prompt should mention old hotlist');
assert.match(stage1, /旧热榜 \+ 增量更新 \+ 当前时间/u, 'Stage1 prompt should avoid duplicate news requests when derivable');

const store = {
  newsDriverState: news.defaultState(),
  phoneDate() { return new Date('2026-07-27T04:00:00.000Z'); },
  save() {},
};
Object.assign(store, context.window.GameModules.newsDriverActions);
store.initNewsDriver();
store.newsDriverState.items = news.rankItems([
  ...store.newsDriverState.items,
  news.normalizeNewsItem({
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

(async () => {
  const text = await loader.dispatch(store, '刷手机看看附近有什么动静', 'news.query', 'getLatestHotlist', { world: '当前世界' });
  assert.match(text, /世界新闻热榜/u, 'news material should return hotlist context');
  assert.match(text, /邻里仓折扣超市/u, 'news material should include current hotlist items');
  const stage3 = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage3-narration.md'), 'utf8');
  assert.match(stage3, /公共信息流与环境驱动源/u, 'Stage3 md should explain driver role');
  console.log('news-driver-material-request tests passed');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
