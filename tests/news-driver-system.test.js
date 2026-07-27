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
vm.runInContext(
  fs.readFileSync(path.join(root, 'publish/news-driver-system.js'), 'utf8'),
  context,
  { filename: 'publish/news-driver-system.js' },
);

const news = context.window.GameModules.newsDriverSystem;

assert.ok(news, 'newsDriverSystem should register');
assert.strictEqual(news.normalizeNewsItem({
  channelId: 'other',
  title: '未知分类',
  summary: '不应通过。',
  tags: ['测试'],
}), null, 'invalid channel must be rejected');

const base = news.normalizeState({
  items: [
    news.normalizeNewsItem({
      id: 'news-a',
      channelId: 'local-life',
      title: '本地旧闻 A',
      summary: '旧闻 A 摘要。',
      tags: ['旧闻A'],
      scope: 'local',
      heat: 40,
      taskPotential: 'soft',
    }, { nowIso: '2026-07-27T00:00:00.000Z' }),
    news.normalizeNewsItem({
      id: 'news-b',
      channelId: 'local-life',
      title: '本地旧闻 B',
      summary: '旧闻 B 摘要。',
      tags: ['旧闻B'],
      scope: 'local',
      heat: 80,
      taskPotential: 'strong',
    }, { nowIso: '2026-07-27T00:00:00.000Z' }),
  ],
});

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(base.items.filter((item) => item.channelId === 'local-life').map((item) => [item.id, item.rank]))),
  [['news-b', 1], ['news-a', 2]],
  'rank should be generated from heat, not input order',
);

const invalidReplace = news.applyOps(base, [{
  op: 'replace',
  targetId: 'news-a',
  channelId: 'local-life',
  item: { title: '缺字段的新新闻' },
}], { nowIso: '2026-07-27T01:00:00.000Z' });
assert.strictEqual(invalidReplace.applied.length, 0, 'replace without complete item must be discarded');
assert.ok(invalidReplace.state.items.some((item) => item.id === 'news-a'), 'invalid replace must keep target');

const replaced = news.applyOps(base, [{
  op: 'replace',
  targetId: 'news-a',
  channelId: 'local-life',
  item: {
    title: '邻里仓折扣超市今晚在锦苑小区东门试营业',
    summary: '邻里仓折扣超市在7月27日18:00于锦苑小区东门开启试营业，推出临期零食、洗护纸品和冷冻食品折扣，居民群开始分享排队位置和停车入口。',
    tags: ['邻里仓', '夜间折扣', '社区消费'],
    scope: 'local',
    heat: 95,
    rankReason: '地点、时间和折扣对象都明确，居民群转发量高，能够直接影响晚间购物行动。',
    taskPotential: 'strong',
  },
}], { nowIso: '2026-07-27T02:00:00.000Z' });
assert.strictEqual(replaced.applied.length, 1, 'valid replace should apply');
assert.ok(!replaced.state.items.some((item) => item.id === 'news-a'), 'target should be replaced');
const replacement = replaced.state.items.find((item) => item.title === '邻里仓折扣超市今晚在锦苑小区东门试营业');
assert.ok(replacement, 'replacement item should exist');
assert.notStrictEqual(replacement.id, 'news-a', 'replacement id should be system generated');
assert.strictEqual(replacement.rank, 1, 'rank should be recalculated by system');

const genericReplace = news.applyOps(base, [{
  op: 'replace',
  targetId: 'news-a',
  channelId: 'games-anime',
  item: {
    title: '热门手游今晚开启限定抽卡与剧情活动',
    summary: '热门手游在今晚开启限定抽卡和剧情活动，玩家群开始讨论保底和充值预算。',
    tags: ['限定抽卡', '热门手游'],
    scope: 'national',
    heat: 90,
    rankReason: '热门手游热度高。',
    taskPotential: 'soft',
  },
}], { nowIso: '2026-07-27T02:00:00.000Z' });
assert.strictEqual(genericReplace.applied.length, 1, 'AI replace should be accepted as returned');
assert.ok(genericReplace.state.items.some((item) => item.title === '热门手游今晚开启限定抽卡与剧情活动'), 'AI returned title should be filled without code-level rewriting');

const bumped = news.applyOps(base, [{
  op: 'bump',
  id: 'news-a',
  deltaHeat: 50,
  reason: '正文中被关注',
}], { nowIso: '2026-07-27T03:00:00.000Z' });
assert.strictEqual(bumped.state.items.find((item) => item.id === 'news-a').rank, 1, 'bump can change ranking through heat');

const eventPayload = news.promoteToEventPayload(base.items.find((item) => item.id === 'news-b'), {
  logId: 'real-1',
  date: '2026-07-27T04:00:00.000Z',
});
assert.strictEqual(eventPayload.type, 'inference');
assert.strictEqual(eventPayload.source, 'news-driver');
assert.strictEqual(eventPayload.sourceLogId, 'real-1');
assert.ok(eventPayload.tags.includes('新闻驱动'));

const prompt = news.formatPromptContext(replaced.state, { limit: 3 });
assert.match(prompt, /世界新闻热榜/u);
assert.match(prompt, /邻里仓折扣超市/u);

const stage2Prompt = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage2-scene-anchor.md'), 'utf8');
const stage3Prompt = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage3-narration.md'), 'utf8');
assert.match(stage2Prompt, /新闻热榜场景锚定规则/u, 'Stage2 md should own news scene-anchor rules');
assert.match(stage2Prompt, /公共信息流与环境驱动源/u, 'Stage2 md should explain news driver purpose');
assert.match(stage3Prompt, /新闻热榜正文联动规则/u, 'Stage3 md should own news narration rules');
assert.match(stage3Prompt, /自然相关，必须体现合理联动/u, 'Stage3 md should require relevant character-world linkage');
assert.match(stage3Prompt, /禁止强行把无关新闻塞进当前场景/u, 'Stage3 md should avoid forced irrelevant linkage');
assert.doesNotMatch(fs.readFileSync(path.join(root, 'publish/news-driver-system.js'), 'utf8'), /正文生成时，若当前行动/u, 'news driver system should not hard-code Stage3 usage rules');

const updatePrompt = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage11-world-news-update.md'), 'utf8');
assert.match(updatePrompt, /不能写“热门手游”“热门番剧”“招聘平台”“多家公司”“相关行业”“某平台”“某学校”/u, 'AI prompt should reject generic news wording');
assert.doesNotMatch(updatePrompt, /如果上下文不足以生成具名事实新闻/u, 'AI prompt should not add extra no-replace policy');
assert.doesNotMatch(updatePrompt, /createdAt/u, 'AI prompt should not mention system-generated runtime fields');
assert.doesNotMatch(fs.readFileSync(path.join(root, 'publish/news-driver-system.js'), 'utf8'), /hasConcreteNewsFacts/u, 'runtime should not hard-code generic news rejection');

const baseline = news.baselineItems({
  realWorldLocationName: '望星街区',
  companyState: { companies: [{ name: '星桥互动科技' }] },
}, '2026-07-27T00:00:00.000Z');
assert.ok(baseline.length >= news.CHANNELS.length * 5, 'baseline should contain at least five items per channel');
news.CHANNELS.forEach((channel) => {
  const channelItems = baseline.filter((item) => item.channelId === channel.id);
  assert.ok(channelItems.length >= 5, `${channel.id} should have at least five baseline news items`);
  channelItems.slice(0, 5).forEach((item) => {
    assert.strictEqual(item.title, '未知', `${channel.id} fallback title should stay unknown`);
    assert.strictEqual(item.summary, '未知', `${channel.id} fallback summary should stay unknown`);
    assert.strictEqual(item.rankReason, '未知', `${channel.id} fallback rank reason should stay unknown`);
    assert.strictEqual(item.placeholder, true, `${channel.id} fallback should be marked as placeholder`);
  });
});

const legacyState = news.ensureBaselineMinimum({
  items: [news.normalizeNewsItem({
    channelId: 'games-anime',
    title: '热门番剧新集播出后讨论度上升',
    summary: '角色塑造与剧情反转引发二创热潮。',
    tags: ['番剧讨论'],
    scope: 'national',
    heat: 67,
    source: 'system',
  }, { nowIso: '2026-07-27T00:00:00.000Z' })],
}, { realWorldLocationName: '望星街区' }, '2026-07-27T00:00:00.000Z', 5);
assert.ok(legacyState.items.filter((item) => item.channelId === 'games-anime').length >= 5, 'legacy short baseline should be replaced with enough standard news');
assert.ok(legacyState.items.filter((item) => item.channelId === 'games-anime').slice(0, 5).every((item) => item.placeholder && item.title === '未知'), 'legacy short baseline should become unknown placeholders');

console.log('news-driver-system tests passed');
