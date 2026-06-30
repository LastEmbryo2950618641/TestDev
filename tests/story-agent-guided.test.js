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

(async () => { for (const item of tests) { await item.fn(); console.log(`PASS ${item.name}`); } })().catch((err) => { console.error(err); process.exit(1); });
