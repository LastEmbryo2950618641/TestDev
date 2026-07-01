const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function loadScript(context, relativePath) { vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, { filename: relativePath }); }
function createContext() { const context = { console, window: {} }; context.window.window = context.window; context.window.GameModules = { realWorld2026: { label: '2026现代都市现实世界' }, sqliteSave: {}, characterQuery: {} }; return vm.createContext(context); }
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('story context exposes controlled retrieval helpers', () => {
  const context = createContext();
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  const ctx = context.window.GameModules.storyAgentContext;
  const store = { character: { work: 'Fate/stay night', name: '士郎' }, knownCharacters: [{ name: '凛' }, { name: '樱' }] };

  const profiles = ctx.participantProfileRequests({ forcedParticipants: [{ name: '阿尔托莉雅' }], priorityCandidates: [{ name: '凛' }], forbiddenParticipants: [{ name: '樱' }] }, { store });
  const anchors = ctx.sceneAnchorRequests({ sceneQueries: { location: ['卫宫宅'], causality: ['圣杯战争'], conflict: ['士郎和凛'] } }, store);
  const random = ctx.randomActiveEventCandidates(store, '观察士郎', { rng: () => 0.75 });

  assert.strictEqual(JSON.stringify(profiles.map((item) => item.params.name)), JSON.stringify(['阿尔托莉雅', '凛']));
  assert.ok(anchors.some((item) => item.method === 'searchLocation'));
  assert.strictEqual(JSON.stringify(random.map((item) => item.name)), JSON.stringify(['凛']));
});

test('story randomActiveEventCandidates excludes forced priority drama and forbidden names', () => {
  const context = createContext();
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  const ctx = context.window.GameModules.storyAgentContext;
  const store = { character: { work: 'Fate/stay night', name: '士郎' }, knownCharacters: [{ name: '阿尔托莉雅' }, { name: '凛' }, { name: '樱' }, { name: '伊莉雅' }, { name: '慎二' }] };
  const layers = { forcedParticipants: [{ name: '阿尔托莉雅' }], priorityCandidates: [{ name: '凛' }], dramaCandidates: [{ name: '樱' }], forbiddenParticipants: [{ name: '伊莉雅' }] };

  const random = ctx.randomActiveEventCandidates(store, '观察士郎', { rng: () => 0.5, ...layers });

  assert.strictEqual(JSON.stringify(random.map((item) => item.name)), JSON.stringify(['慎二']));
});

test('story randomActiveEventCandidates can return up to three external candidates', () => {
  const context = createContext();
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  const ctx = context.window.GameModules.storyAgentContext;
  const store = { character: { work: 'Fate/stay night', name: '士郎' }, knownCharacters: [{ name: '阿尔托莉雅' }, { name: '凛' }, { name: '樱' }, { name: '伊莉雅' }, { name: '慎二' }] };

  const random = ctx.randomActiveEventCandidates(store, '观察士郎', { rng: () => 0.95 });

  assert.strictEqual(JSON.stringify(random.map((item) => item.name)), JSON.stringify(['阿尔托莉雅', '凛', '樱']));
});

test('story context maps worklore Chinese material requests', () => {
  const context = createContext();
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  const ctx = context.window.GameModules.storyAgentContext;
  const people = ctx.parseChineseMaterialRequest('资料请求1：作品设定查询，搜索人物，阿尔托莉雅，Fate/stay night', { mode: 'story' });
  const ability = ctx.parseChineseMaterialRequest('资料请求2：作品设定查询，搜索能力，直感，Fate/stay night', { mode: 'story' });
  const realOnly = ctx.parseChineseMaterialRequest('资料请求3：微信查询，会话片段，boss，5', { mode: 'story' });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(people)), { skill: 'worklore.query', method: 'searchPeople', params: { keyword: '阿尔托莉雅', world: 'Fate/stay night' }, sourceText: '资料请求1：作品设定查询，搜索人物，阿尔托莉雅，Fate/stay night' });
  assert.strictEqual(ability.method, 'searchAbility');
  assert.strictEqual(realOnly, null);
});

test('work lore materials mention Chinese requests and canon constraints', () => {
  const context = createContext();
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  loadScript(context, 'publish/prompts/materials/work-lore-materials.js');
  const text = JSON.stringify(context.window.GameModules.workLoreMaterials || {});
  assert.ok(text.includes('中文资料请求'));
  assert.ok(text.includes('作品设定查询'));
  assert.ok(text.includes('canon'));
  assert.ok(text.includes('当前时间线'));
});

test('story Stage1 routing context exposes story catalog without skill manuals', async () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { character: { name: '齐格', work: 'Fate Apocrypha' }, selectedWork: 'Fate Apocrypha', sceneTitle: '米雷尼亚城塞' };
  const config = loop.storyConfig();

  const prompt = await loop.buildConfiguredPrompt({
    store,
    action: '观察附近是否有人能自然介入',
    base: '需严格跟着世界线续写\nfinal 必须返回 elapsedSeconds\nSkill：worklore.query\n返回格式：JSON',
    loaded: [{ title: 'worklore.query.searchPeople', text: '当前位置：米雷尼亚城塞庭院\n空间事实：庭院可通向大厅' }],
    skills: 'Skill：worklore.query\n激活条件：任何作品设定问题',
    step: 1,
    config,
  });

  assert.ok(prompt.includes('作品设定查询：入口说明、常驻设定、搜索人物、搜索剧情、搜索时间线、搜索能力、搜索关系、搜索地点、搜索物品'));
  ['Skill：', '激活条件', '返回格式', 'elapsedSeconds', '需严格跟着世界线续写', 'worklore.query.searchPeople'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into story Stage1 prompt`);
  });
});

test('story Stage2 anchor prompt omits story continuation and full role-card fields', async () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  loadScript(context, 'publish/prompts/推演引擎/stage2-scene-anchor.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.storyConfig();
  const store = { character: { name: '齐格', work: 'Fate Apocrypha' }, selectedWork: 'Fate Apocrypha', sceneTitle: '米雷尼亚城塞' };

  const prompt = await loop.buildConfiguredSceneAnchorPrompt({
    store,
    action: '观察附近是否有人能自然介入',
    base: '需严格跟着世界线续写，保证正文对最新世界线连续性。\n角色当前数值：力量1 敏捷1\nfinal 必须返回 elapsedSeconds',
    loaded: [{ title: 'worklore.query.searchPeople', text: '全部技能：变身\n全部核心属性数值：力量5\n当前位置：米雷尼亚城塞庭院\n空间事实：庭院可通向大厅' }],
    trace: [{ forcedParticipants: [{ name: '齐格' }], sceneQueries: { location: ['庭院'], causality: [], conflict: [] } }],
    config,
  });

  assert.ok(prompt.includes('当前场景影响对象：'));
  assert.ok(prompt.includes('齐格'));
  ['需严格跟着世界线续写', '角色当前数值', '全部技能', '全部核心属性数值', 'elapsedSeconds', '结算边界：', 'worklore.query.searchPeople'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into story Stage2 prompt`);
  });
});

test('story Stage3 narration prompt omits final rules tool receipts and raw continuation wording', async () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/story-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
  loadScript(context, 'publish/prompts/推演引擎/stage3-narration.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.storyConfig();
  const store = {
    character: { name: '齐格', work: 'Fate Apocrypha' },
    selectedWork: 'Fate Apocrypha',
    sceneTitle: '米雷尼亚城塞庭院',
    entryTimeLabel: () => '黄昏',
    quest: '确认庭院情况',
  };

  const prompt = await loop.buildConfiguredNarrationPrompt({
    store,
    action: '观察附近是否有人能自然介入',
    base: '需严格跟着世界线续写，保证正文对最新世界线连续性。\n角色当前数值：力量1 敏捷1\nfinal 必须返回 elapsedSeconds',
    loaded: [{
      title: 'worklore.query.searchPeople',
      text: '文本内容参照material-story\n参照对象：齐格\n关键词查询：观察附近是否有人能自然介入\n当前位置：米雷尼亚城塞庭院\n空间事实：庭院可通向大厅，脚步声可能从走廊传来。',
    }],
    sceneAnchorReport: '场景锚定报告：庭院观察。\n当前地点：米雷尼亚城塞庭院\n当前场景影响对象：齐格、庭院。',
    config,
  });

  ['需严格跟着世界线续写', '角色当前数值', 'elapsedSeconds', 'worklore.query.searchPeople', '文本内容参照material-story', '参照对象：', '关键词查询：观察附近是否有人能自然介入'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into story Stage3 prompt`);
  });
  ['Fate Apocrypha', '齐格', '米雷尼亚城塞庭院', '空间事实：庭院可通向大厅', '场景锚定报告：庭院观察。', '正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。'].forEach((good) => {
    assert.ok(prompt.includes(good), `${good} missing from story Stage3 prompt`);
  });
});

(async () => { for (const item of tests) { await item.fn(); console.log(`PASS ${item.name}`); } })().catch((err) => { console.error(err); process.exit(1); });
