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
vm.createContext(context);
for (const rel of ['publish/event-system.js', 'publish/news-driver-system.js', 'publish/news-driver-actions.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
}

const gm = context.window.GameModules;
const store = {
  newsDriverState: gm.newsDriverSystem.defaultState(),
  eventState: gm.eventSystem.defaultState(),
  realWorldLocationName: '锦苑小区',
  desktopUnlocked: false,
  saved: 0,
  phoneDate() { return new Date('2026-07-27T04:00:00.000Z'); },
  closeDesktopApps() {
    if (this.newsDriverState) this.newsDriverState.open = false;
    if (this.eventState) this.eventState.open = false;
  },
  closeAppToDesktop() { this.desktopUnlocked = false; this.closeDesktopApps(); },
  save() { this.saved += 1; },
  upsertEvent(raw) {
    const event = gm.eventSystem.normalizeEvent(raw, this);
    this.eventState.events.unshift(event);
    return event;
  },
};
Object.assign(store, gm.newsDriverActions);

store.openNewsApp();
assert.strictEqual(store.newsDriverState.open, true, 'openNewsApp opens news state');
assert.strictEqual(store.desktopUnlocked, true, 'openNewsApp unlocks desktop');
assert.ok(store.newsDriverState.items.length >= 10, 'init seeds baseline news');
const concreteNews = gm.newsDriverSystem.normalizeNewsItem({
  channelId: 'local-life',
  title: '邻里仓折扣超市今晚在锦苑小区东门试营业',
  summary: '邻里仓折扣超市在7月27日18:00于锦苑小区东门开启试营业，推出临期零食、洗护纸品和冷冻食品折扣，居民群开始分享排队位置和停车入口。',
  tags: ['邻里仓', '试营业', '停车入口'],
  scope: 'local',
  location: '锦苑小区东门',
  heat: 95,
  rankReason: '地点、时间和折扣对象都明确，居民群转发量高，能够直接影响晚间购物行动。',
  taskPotential: 'strong',
  source: 'ai',
}, { nowIso: '2026-07-27T04:00:00.000Z', source: 'ai' });
store.newsDriverState.items = gm.newsDriverSystem.rankItems([...store.newsDriverState.items, concreteNews]);

const allCount = store.currentNewsList().length;
const topAll = store.currentNewsList()[0];
assert.strictEqual(topAll.title, '邻里仓折扣超市今晚在锦苑小区东门试营业', 'all channel should sort by global heat');
assert.strictEqual(topAll.rank, 1, 'item keeps its channel rank');
assert.strictEqual(topAll.displayRank, 1, 'all channel should display global rank');
store.setNewsChannel('bilibili-community');
const bilibiliTop = store.currentNewsList()[0];
assert.strictEqual(bilibiliTop.rank, 1, 'single channel keeps channel rank');
assert.strictEqual(bilibiliTop.displayRank, 1, 'single channel displays channel rank');
store.setNewsChannel('all');
store.setNewsFilter('task');
const taskList = store.currentNewsList();
assert.ok(taskList.length > 0, 'task filter has strong local items');
assert.ok(taskList.length < allCount, 'task filter narrows news list');

const prompt = store.newsNarrationPromptContext('出门买东西');
assert.match(prompt, /世界新闻热榜/u);
assert.match(prompt, /邻里仓折扣超市/u);

const beforeEvents = store.eventState.events.length;
const tick = store.tickWorldNewsDriver(3600, { logId: 'real-news-test' });
assert.ok(tick.promoted >= 1, 'strong local news promotes to event');
assert.ok(store.eventState.events.length > beforeEvents, 'promoted event is written');
assert.strictEqual(store.eventState.events[0].type, 'inference');
assert.strictEqual(store.eventState.events[0].source, 'news-driver');

console.log('news-driver-actions tests passed');
