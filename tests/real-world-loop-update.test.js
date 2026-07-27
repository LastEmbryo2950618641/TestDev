const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function createContext() {
  const context = {
    console,
    performance: { now: () => 0 },
    setTimeout,
    window: {},
  };
  context.window.window = context.window;
  context.window.console = console;
  context.window.GameModules = {
    jsonUtils: {
      extractJson(text = '') {
        const raw = String(text || '').trim();
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start < 0 || end < start) throw new Error('JSON missing');
        return raw.slice(start, end + 1);
      },
      repairJson(text = '') { return String(text || ''); },
      parseLoose(text = '') { return JSON.parse(this.extractJson(text)); },
      mergeStreamText(a = '', b = '') { return `${a}${b}`; },
    },
    aiRequest: { outputTailLooksTruncated: () => false, complete: async () => '{}' },
    ai: {
      normalizeChoices(choices, fallback = []) {
        return Array.isArray(choices) && choices.length ? choices.slice(0, 4) : fallback.slice(0, 4);
      },
      normalizeCharacter(item) { return item; },
    },
    promptTemplates: { render: async (_id, vars) => JSON.stringify(vars) },
    updateRegistry: null,
    sqliteSave: {
      getCharacterState: () => null,
      getCharacterStateByName: () => null,
      saveCharacterState: async () => {},
    },
    initPromptRegistry: {
      skillText: () => '',
      schema: () => ({ initUpdates: [] }),
      canonicalSkillIds: (ids = []) => ids,
      ensureTemplateState(_template, state) {
        state.values = state.values || {};
        state.values.intimacy = state.values.intimacy || {};
        state.values.bodyStatus = state.values.bodyStatus || {};
      },
    },
  };
  return vm.createContext(context);
}

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, context, { filename: relativePath });
}

function loadCore(context) {
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/update/generic-update-applier.js');
  loadScript(context, 'publish/update/sexual-experience-update.js');
  loadScript(context, 'publish/update/sexual-history-update.js');
  loadScript(context, 'publish/update/body-status-update.js');
  if (fs.existsSync(path.join(root, 'publish/update/wearing-state-update.js'))) loadScript(context, 'publish/update/wearing-state-update.js');
  loadScript(context, 'publish/real-world-agent-context.js');
  loadScript(context, 'publish/real-world-agent-loop.js');
}

function makeStore() {
  const player = {
    id: 'player-self',
    profile: { name: '玩家', wearing: [], wearingItems: [], roleCardUpdatedAt: '' },
    values: {
      intimacy: {
        sexualExperienceCount: 0,
        sexualExperienceParts: {},
        sexualHistory: { virginityStatus: 'unknown' },
      },
      bodyStatus: {},
      wearing: [{ slot: 'bra', name: '胸罩', state: '穿着' }],
    },
  };
  const npc = {
    id: 'rushiqi',
    profile: { name: '刘思琪', wearing: [], wearingItems: [], roleCardUpdatedAt: '' },
    values: {
      intimacy: {
        sexualExperienceCount: 0,
        sexualExperienceParts: {},
        sexualHistory: { virginityStatus: 'unknown' },
      },
      bodyStatus: {},
      wearing: [{ slot: 'bra', name: '胸罩', state: '穿着' }],
    },
  };
  return {
    modelId: 'test-model',
    realWorldSceneTitle: '测试场景',
    realWorldLocationName: '测试地点',
    realWorldChoices: ['观察', '交流', '行动', '等待'],
    rpgStates: { rushiqi: npc },
    playerIdentityState: () => player,
    itemSkillState(id) { return this.rpgStates[id] || null; },
    itemSkillStateLabel(state) { return state?.profile?.name || state?.id || ''; },
    realWorldSettlementTargetGroup(id, name) { return name || id; },
    realWorldPlayerSettlementName: () => '玩家',
    ensureStateMetrics(state) {
      state.metrics = state.metrics || { emotions: {}, temporaryEmotions: {}, playerFeelings: {}, temporaryPlayerFeelings: {} };
      return state.metrics;
    },
    wearingItems(state) { return state?.values?.wearing || []; },
    rpgVitals: () => [],
    __player: player,
    __npc: npc,
  };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('compactAiReturn removes invisible characters and whitespace control chars', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = '  {\n\t"ok":"a\u200Bb"\n}\uFEFF  ';
  assert.strictEqual(loop.compactAiReturn(raw, { json: true }), '{"ok":"ab"}');
});

test('compactJsonReturn strips markdown fences and compacts JSON', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = '```json\n{\n  "genericUpdates": []\n}\n```';
  assert.strictEqual(loop.compactJsonReturn(raw), '{"genericUpdates":[]}');
});

test('compactJsonReturn preserves ordinary spaces inside JSON string values', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = '{\n  "name": "Liu Si Qi",\n  "evidence": "two words"\n}';
  assert.strictEqual(loop.compactJsonReturn(raw), '{"name":"Liu Si Qi","evidence":"two words"}');
});

test('cleanPhasedNarration compacts prose to a single line', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  assert.strictEqual(loop.cleanPhasedNarration('第一句。\n\t第二句。\u200B'), '第一句。第二句。');
});

test('legacy createRealWorldPrompt supplies Stage 3 template variables', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/real-world-map.js');
  loadScript(context, 'publish/real-world-prompt.js');
  const seen = {};
  context.window.GameModules.promptSections = { stateSnapshot: () => '状态快照', subjectIdRules: () => '主体规则' };
  context.window.GameModules.skillLoader = { instruction: async () => '' };
  context.window.GameModules.realWorldMap = { ensure: () => ({ current: '家', nodes: [], lastText: '' }), render: () => '地图' };
  context.window.GameModules.realWorldMapFacts = { formatFact: (fact) => String(fact) };
  context.window.GameModules.promptTemplates = { render: async (id, vars) => { seen.id = id; seen.vars = vars; return JSON.stringify(vars); } };
  const store = { ...makeStore(), playerProfile: {}, realWorldLog: [], realWorldSceneTitle: '客厅', realWorldLocationName: '家', realWorldQuest: '观察', playerName: '玩家' };

  await context.window.GameModules.createRealWorldPrompt(store, '观察门口');

  assert.strictEqual(seen.id, 'inference-stage3-narration');
  ['模式标签', '本次行动', '基础上下文', '场景锚定报告', '已动态载入资料', '紧凑返回规则'].forEach((key) => {
    assert.ok(Object.prototype.hasOwnProperty.call(seen.vars, key), `${key} missing`);
  });
  assert.ok(!Object.prototype.hasOwnProperty.call(seen.vars, '可用技能'));
  assert.ok(!Object.prototype.hasOwnProperty.call(seen.vars, '资料摘要'));
});

test('inference engine prompt markdown sources have colocated generated scripts', () => {
  const promptRoot = path.join(root, 'publish/prompts/推演引擎');
  const collect = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
  const mdFiles = collect(promptRoot);
  assert.ok(mdFiles.length >= 20);
  mdFiles.forEach((file) => {
    const generated = file.replace(/\.md$/u, '.js');
    assert.ok(fs.existsSync(generated), `${path.relative(root, generated)} should exist beside its md source`);
  });
});

test('old inference prompt compatibility files are removed', () => {
  const removed = [
    'publish/prompt-templates-inline.js',
    'publish/prompts/real-world-engine.md',
    'publish/prompts/real-world-engine-first.md',
    'publish/prompts/story-agent-engine.md',
    'publish/prompts/story-agent-engine-first.md',
    'publish/prompts/stage1-guided-query.md',
    'publish/prompts/stage2-scene-anchor.md',
    'publish/prompts/stage3-narration.md',
    'publish/init/intimacy-body-init-prompt.md',
    'publish/init/intimacy-body-init-prompt.js',
  ];
  fs.readdirSync(path.join(root, 'publish/update'))
    .filter((name) => /-update-prompt\.(?:md|js)$/u.test(name))
    .forEach((name) => removed.push(`publish/update/${name}`));
  removed.forEach((file) => {
    assert.ok(!fs.existsSync(path.join(root, file)), `${file} should be removed`);
  });
});

test('index and asset sync do not use old prompt inline or prompt script paths', () => {
  const html = fs.readFileSync(path.join(root, 'publish/index.html'), 'utf8');
  const syncAssets = fs.readFileSync(path.join(root, 'scripts/sync-inline-assets.js'), 'utf8');
  assert.ok(!html.includes('prompt-templates-inline.js'));
  assert.ok(!syncAssets.includes('prompt-templates-inline.js'));
  assert.ok(!html.includes('src="update/body-status-update-prompt.js"'));
  assert.ok(!html.includes('src="init/intimacy-body-init-prompt.js"'));
  assert.ok(!html.includes('src="prompts/推演引擎/'));
  assert.ok(html.includes('src="boot/script-manifest.js'));
  const scripts = JSON.parse(fs.readFileSync(path.join(root, 'publish/boot/scripts.json'), 'utf8'));
  assert.ok(scripts.includes('inference-prompts-runtime.js'));
  assert.ok(scripts.indexOf('inference/intro-card-stage-update.js') < scripts.indexOf('real-world-agent-loop.js'));
});

test('inference runtime bundle registers stage, update, and init prompts from ASCII path', () => {
  const context = createContext();
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/init/intimacy-body-init-template.js');
  loadScript(context, 'publish/inference-prompts-runtime.js');
  assert.ok(context.window.GameModules.promptTemplates.inline['inference-stage1-guided-query'].includes('查询规划'));
  assert.ok(context.window.GameModules.promptTemplates.inline['inference-update-body-status'].includes('# Stage4 身体状态更新'));
  assert.ok(context.window.GameModules.promptTemplates.inline['inference-init-intimacy-body'].includes('# Stage4 亲密身体初始化'));
});

test('inference runtime bundle keeps Stage1 Stage2 Stage3 slim template fields clean', () => {
  const runtime = fs.readFileSync(path.join(root, 'publish/inference-prompts-runtime.js'), 'utf8');
  const context = createContext();
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/init/intimacy-body-init-template.js');
  loadScript(context, 'publish/inference-prompts-runtime.js');
  const inline = context.window.GameModules.promptTemplates.inline || {};
  const stage1 = String(inline['inference-stage1-guided-query'] || '');
  const stage2 = String(inline['inference-stage2-scene-anchor'] || '');
  const stage3 = String(inline['inference-stage3-narration'] || '');

  ['{{基础上下文}}', '{{动态Skills}}', '{{动态载入资料}}'].forEach((needle) => {
    assert.ok(!stage1.includes(needle), `Stage1 runtime template should not include ${needle}`);
  });
  ['{{参与者分层与查询规划}}', '{{已加载资料摘要}}', '结算边界：'].forEach((needle) => {
    assert.ok(!stage2.includes(needle), `Stage2 runtime template should not include ${needle}`);
  });
  assert.ok(!stage3.includes('结算边界'), 'Stage3 runtime template should not mention legacy settlement boundary');
  ['结算边界', '需严格跟着世界线续写，保证正文对最新世界线连续性', 'elapsedSeconds', 'subject.id'].forEach((needle) => {
    assert.ok(!stage3.includes(needle), `Stage3 runtime template should not include ${needle}`);
  });
  assert.ok(stage1.includes('{{路由上下文}}'), 'Stage1 runtime template should include {{路由上下文}}');
  assert.ok(stage2.includes('{{场景锚定上下文}}'), 'Stage2 runtime template should include {{场景锚定上下文}}');
  assert.ok(stage2.includes('当前场景影响对象'), 'Stage2 runtime template should include 当前场景影响对象');
  assert.ok(stage2.includes('最终有效候选层'), 'Stage2 runtime template should mention final effective candidate layers');
  assert.ok(stage2.includes('不得从历史 trace 中恢复已被后轮清除的候选'), 'Stage2 runtime template should forbid restoring cleared trace candidates');
  assert.ok(stage3.includes('当前场景影响对象'), 'Stage3 runtime template should reference current scene impact objects');
  assert.ok(runtime.includes('{{路由上下文}}'));
  assert.ok(runtime.includes('{{场景锚定上下文}}'));
  assert.ok(runtime.includes('当前场景影响对象'));
});

test('colocated generated update prompts register into promptTemplates inline registry', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/update/body-status-update-prompt.js');
  const body = context.window.GameModules.promptTemplates.inline['inference-update-body-status'];
  assert.ok(body.includes('# Stage4 身体状态更新'));
});

test('colocated generated stage prompts register into promptTemplates inline registry', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const body = context.window.GameModules.promptTemplates.inline['inference-stage1-guided-query'];
  assert.ok(body.includes('查询规划'));
});

test('Stage 1 query planning template uses slim routing variables', () => {
  const body = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage1-guided-query.md'), 'utf8');
  ['{{本次行动}}', '{{路由上下文}}', '{{已加载资料摘要}}', '{{可请求资料目录}}', '{{当前步骤输出要求}}', '{{随机场外角色候选}}'].forEach((token) => {
    assert.ok(body.includes(token), `${token} missing`);
  });
  ['{{基础上下文}}', '{{动态Skills}}', '{{动态载入资料}}'].forEach((token) => {
    assert.ok(!body.includes(token), `${token} should not be in Stage1 template`);
  });
});

test('Stage 1 query planning template prevents schedule and random candidates from being treated as forbidden', () => {
  const files = [
    'publish/prompts/推演引擎/stage1-guided-query.md',
    'publish/prompts/推演引擎/stage1-guided-query.js',
    'publish/inference-prompts-runtime.js',
  ];
  const rules = [
    '随机场外角色候选不等于禁止出场',
    '不强制出场不等于禁止出场',
    '同地点/同住/相邻候选不得仅因未强制出场而写入禁止出场',
    '玩家行动明确目标不得写入禁止出场',
  ];
  files.forEach((file) => {
    const body = fs.readFileSync(path.join(root, file), 'utf8');
    rules.forEach((rule) => {
      assert.ok(body.includes(rule), `${rule} missing from ${file}`);
    });
  });
});

test('inference main-chain prompts contain no AI-facing JSON output contract', () => {
  const files = [
    'publish/real-world-agent-loop.js',
    'publish/prompts/推演引擎/stage1-guided-query.md',
    'publish/prompts/推演引擎/stage2-scene-anchor.md',
    'publish/prompts/推演引擎/stage3-narration.md',
    'publish/prompts/推演引擎/stage4-settlement-window.md',
    'publish/prompts/推演引擎/stage1-guided-query.js',
    'publish/prompts/推演引擎/stage2-scene-anchor.js',
    'publish/prompts/推演引擎/stage3-narration.js',
    'publish/prompts/推演引擎/stage4-settlement-window.js',
    'publish/inference-prompts-runtime.js',
  ];
  const forbidden = [
    '只输出合法 JSON',
    '只输出合法JSON',
    '最小补丁 JSON',
    '输出最小补丁 JSON',
    '返回格式：{"groups"',
    '阶段3A：基础结算字段',
    '阶段3B-分组更新',
    'genericUpdates 用于',
    'initUpdates',
  ];
  files.forEach((file) => {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    forbidden.forEach((needle) => {
      assert.ok(!text.includes(needle), `${file} should not include ${needle}`);
    });
  });
});

test('promptTemplates loads colocated JS before falling back to markdown fetch', async () => {
  const context = createContext();
  const loadedScripts = [];
  context.document = {
    currentScript: { src: 'https://example.test/game/prompt-templates.js' },
    baseURI: 'https://example.test/game/index.html',
    querySelector: () => null,
    createElement: () => ({}),
    head: {
      appendChild(script) {
        loadedScripts.push(script.src);
        const relative = decodeURIComponent(script.src).replace('https://example.test/game/', 'publish/');
        loadScript(context, relative);
        script.onload?.();
      },
    },
  };
  context.location = { origin: 'https://example.test', href: 'https://example.test/game/index.html' };
  context.URL = URL;
  context.fetch = async () => ({ ok: false, status: 404, text: async () => '' });
  loadScript(context, 'publish/prompt-templates.js');

  const prompt = await context.window.GameModules.promptTemplates.render('inference-stage1-guided-query', { 本次行动: '观察门口' });

  assert.ok(loadedScripts.some((src) => src.endsWith('/prompts/%E6%8E%A8%E6%BC%94%E5%BC%95%E6%93%8E/stage1-guided-query.js')));
  assert.ok(prompt.includes('观察门口'));
});

test('promptTemplates reports colocated JS attempts when markdown fallback fails', async () => {
  const context = createContext();
  context.document = {
    currentScript: { src: 'https://example.test/game/prompt-templates.js' },
    baseURI: 'https://example.test/game/index.html',
    querySelector: () => null,
    createElement: () => ({}),
    head: { appendChild(script) { script.onerror?.(); } },
  };
  context.location = { origin: 'https://example.test', href: 'https://example.test/game/index.html' };
  context.URL = URL;
  context.fetch = async () => ({ ok: false, status: 404, text: async () => '' });
  loadScript(context, 'publish/prompt-templates.js');

  await assert.rejects(
    () => context.window.GameModules.promptTemplates.render('inference-stage1-guided-query', {}),
    /stage1-guided-query\.js.*stage1-guided-query\.md/s,
  );
});

test('all promptTemplates markdown entries have colocated generated scripts for publish fallback', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  const missing = context.window.GameModules.promptTemplates.items
    .map((item) => item.file)
    .filter((file) => file.endsWith('.md'))
    .map((file) => `publish/${file.replace(/\.md$/u, '.js')}`)
    .filter((file) => !fs.existsSync(path.join(root, file)));
  assert.strictEqual(missing.length, 0, missing.join('\n'));
});

test('colocated generated prompt scripts are tracked for publishing', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  const templateScripts = context.window.GameModules.promptTemplates.items
    .map((item) => item.file)
    .filter((file) => file.endsWith('.md'))
    .map((file) => `publish/${file.replace(/\.md$/u, '.js')}`);
  const files = [
    'publish/inference-prompts-runtime.js',
    'publish/prompts/推演引擎/init/intimacy-body-init-prompt.js',
    ...templateScripts,
  ];
  const tracked = new Set(require('child_process').execFileSync('git', ['ls-files', '-z', '--', ...files], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean));
  files.forEach((file) => assert.ok(tracked.has(file), `${file} is not tracked and will be missing from publish`));
});

test('configured loop template ids use canonical inference templates', () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const real = loop.realConfig();
  const story = loop.storyConfig();

  assert.strictEqual(real.templateId, 'inference-stage3-narration');
  assert.strictEqual(real.firstTemplateId, 'inference-stage1-guided-query');
  assert.strictEqual(story.templateId, 'inference-stage3-narration');
  assert.strictEqual(story.firstTemplateId, 'inference-stage1-guided-query');
  [real.templateId, real.firstTemplateId, story.templateId, story.firstTemplateId].forEach((id) => {
    assert.strictEqual(context.window.GameModules.promptTemplates.find(id).id, id);
  });
});

test('colocated generated init prompt keeps intimacyBody template binding', () => {
  const context = createContext();
  loadScript(context, 'publish/init/intimacy-body-init-template.js');
  loadScript(context, 'publish/prompts/推演引擎/init/intimacy-body-init-prompt.js');
  loadScript(context, 'publish/init/init-prompt-registry.js');
  context.window.GameModules.initPromptRegistry.registerAll();
  const item = context.window.GameModules.initPromptRegistry.prompts['intimacy-body'];

  assert.strictEqual(item.templateKey, 'intimacyBody');
  assert.ok(item.template);
  assert.ok(JSON.stringify(context.window.GameModules.initPromptRegistry.schema(['intimacy-body'])).includes('initUpdates'));
});

test('Stage 1 prompt requires JSON guided query planning', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = {
    buildLoadedText: () => '',
    baseSnapshot: () => '',
    skillText: async () => '',
    limit: (text) => String(text || ''),
    randomActiveEventCandidates: () => [{ id: 'boss', name: '王主管' }],
  };
  const prompt = await loop.buildConfiguredPrompt({ store: makeStore(), action: '和刘思琪对话', base: '基础', loaded: [], skills: '', step: 1, config });
  const promptText = prompt.map((message) => message.content).join('\n');
  assert.ok(promptText.includes('只输出一个合法 JSON 对象'));
  assert.ok(promptText.includes('"plan":"查询规划摘要"'));
  assert.ok(promptText.includes('"status":"继续请求资料|资料已足够"'));
  assert.ok(promptText.includes('"participants":{"forced"'));
  assert.ok(promptText.includes('"materialRequests"'));
  assert.ok(promptText.includes('随机场外角色候选'));
  assert.ok(promptText.includes('王主管'));
  assert.ok(!promptText.includes('只输出中文 K:V'));
});

test('Stage 1 real template render does not include Stage 3 narration instructions', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  loadScript(context, 'publish/prompts/推演引擎/stage3-narration.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || ''), randomActiveEventCandidates: () => [] };

  const prompt = await loop.buildConfiguredPrompt({ store: makeStore(), action: '观察门口', base: '基础', loaded: [], skills: '', step: 1, config });
  const promptText = prompt.map((message) => message.content).join('\n');

  assert.ok(promptText.includes('只输出一个紧凑 JSON 对象'));
  assert.ok(promptText.includes('"plan":"查询规划摘要"'));
  assert.ok(promptText.includes('"sceneQueries"'));
  assert.ok(promptText.includes('"participants"'));
  assert.ok(!promptText.includes('你只输出现实正文'));
  assert.ok(!promptText.includes('场景锚定报告：'));
  assert.ok(!promptText.includes('sceneTitle'));
  assert.ok(!promptText.includes('genericUpdates'));
  assert.ok(!promptText.includes('updateType'));
});

test('Stage 1 prompt uses slim routing context without final narration settlement or skill manuals', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.phoneDateText = () => '2026-07-01';
  store.phoneTimeText = () => '01:20';
  store.playerSetupSummary = () => '姓名：刘悠\n生日：1998-11-19\n具体地址：锦苑小区3栋2单元601号\n财富等级：中产\n父母去世原因：交通事故';
  const config = loop.realConfig();
  config.ctx.buildLoadedText = () => '';
  config.ctx.buildStage1RoutingContext = () => '路由上下文';
  config.ctx.randomActiveEventCandidates = () => [{ id: 'boss', name: '王主管' }];

  const prompt = await loop.buildConfiguredPrompt({
    store,
    action: '前往刘思琪房间',
    base: 'final 必须返回 elapsedSeconds\nsubject.id 规则\n正文必须服从场景锚定报告\n结算对象：刘思琪\n类型完成：是\nSkill：wechat.query\n激活条件：需要微信时\n返回格式：JSON',
    loaded: [{ title: 'character.query.searchCharacterProfile', text: '全部情绪值：紧张10\n全部穿着槽：bra=胸罩\n人物位置：刘思琪房间附近' }],
    skills: 'Skill：emotion-update\n返回格式：更新JSON',
    step: 1,
    config,
  });

  const promptText = prompt.map((message) => message.content).join('\n');
  ['elapsedSeconds', 'final.wechatActions', 'subject.id', '结算对象', '类型完成', '正文必须', '场景锚定报告', 'Skill：', '激活条件', '返回格式', '全部情绪值', '全部穿着槽', 'character.query.searchCharacterProfile'].forEach((bad) => {
    assert.ok(!promptText.includes(bad), `${bad} leaked into Stage1 prompt`);
  });
  ['"plan"', '"status"', '"sceneQueries"', '"forced"', '"priority"', '"drama"', '"forbidden"', '"randomEvents"', '"randomIntrusionCondition"', '"materialRequests"', '可请求资料目录', '角色查询，搜索角色卡'].forEach((good) => {
    assert.ok(promptText.includes(good), `${good} missing from Stage1 prompt`);
  });
  assert.ok(!promptText.includes('资料请求结束：是'));
});

test('Stage 1 parses numbered query reasons without requiring query target fields', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  const data = loop.parseStep(`查询规划：需要确认房间状态与潜在干扰，但不再输出单独查询目标字段
资料状态：继续请求资料
地点查询理由1：确认刘思琪房间门口、房间内与走廊的空间边界
地点查询理由2：判断玩家本次敲门或进入动作能否自然发生
因果查询理由1：承接最近世界线里刘思琪为什么会在房间附近
冲突查询理由1：确认是否存在家人、微信或其他事件打断当前行动
强制出场：刘思琪（本次行动目标）
高优先候选：无
戏剧候选：无
禁止出场：王主管（场外微信）
随机事件候选：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无
资料请求结束：是`, config);

  assert.strictEqual(data.type, 'request_context');
  assert.strictEqual(JSON.stringify(data.sceneQueries.location), JSON.stringify([
    '确认刘思琪房间门口、房间内与走廊的空间边界',
    '判断玩家本次敲门或进入动作能否自然发生',
  ]));
  assert.strictEqual(JSON.stringify(data.sceneQueries.causality), JSON.stringify(['承接最近世界线里刘思琪为什么会在房间附近']));
  assert.strictEqual(JSON.stringify(data.sceneQueries.conflict), JSON.stringify(['确认是否存在家人、微信或其他事件打断当前行动']));
  assert.ok(data.guidanceText.includes('地点查询理由2：判断玩家本次敲门或进入动作能否自然发生'));
});

test('Stage 1 real routing stops after two steps and carries query reasons into scene anchor', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  const stagePrompts = [];
  let anchorPrompt = '';
  config.ctx = {
    buildLoadedText: () => '',
    baseSnapshot: () => '基础上下文',
    skillText: async () => '',
    limit: (text) => String(text || ''),
    randomActiveEventCandidates: () => [],
    buildStage1RoutingContext: () => '模式：现实\n本次行动：前往刘思琪房间',
    loadedRoutingSummary: () => '无',
    stage1MaterialCatalogText: () => '角色查询：搜索角色卡',
    loadRequests: async () => [],
    autoLoadForStep: async () => [],
    sceneAnchorRequests: () => [],
    buildSceneAnchorContext: ({ effectiveSceneLayers }) => `场景锚定上下文\n地点理由：${effectiveSceneLayers.sceneQueries.location.join('；')}\n因果理由：${effectiveSceneLayers.sceneQueries.causality.join('；')}\n冲突理由：${effectiveSceneLayers.sceneQueries.conflict.join('；')}`,
    loadedNarrationSummary: () => '无',
    buildNarrationContext: () => '叙事上下文',
  };
  context.window.GameModules.promptTemplates.render = async (id, vars) => {
    if (id === 'inference-stage1-guided-query') {
      stagePrompts.push(vars.当前步骤);
      return `Stage1 ${vars.当前步骤}`;
    }
    if (id === 'inference-stage2-scene-anchor') {
      anchorPrompt = String(vars.场景锚定上下文 || '');
      return anchorPrompt;
    }
    if (id === 'inference-stage3-narration') return 'Stage3 prompt';
    return JSON.stringify(vars);
  };
  const stageReplies = [1, 2].map((step) => `查询规划：第${step}步收集场景锚定理由
资料状态：继续请求资料
地点查询理由1：第${step}步地点理由
因果查询理由1：第${step}步因果理由
冲突查询理由1：第${step}步冲突理由
强制出场：刘思琪（本次行动目标）
高优先候选：无
戏剧候选：无
禁止出场：无
随机事件候选：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无
资料请求结束：是`);
  const outputs = [
    ...stageReplies,
    `场景锚定报告：锚定刘思琪房间门口
当前地点：刘思琪房间门口
当前时间：12:56
空间状态：门口与房间相邻
当前动作：前往房间
强制出场：刘思琪
高优先候选：无
戏剧候选：无
禁止出场：无
随机事件影响：无
正文写作重点：只写本次进入房间前后的直接反应
当前场景影响对象：刘思琪、房门`,
    '你来到刘思琪房间门口，抬手轻敲房门。',
  ];
  loop.completeConfiguredStep = async () => outputs.shift();
  loop.completeConfiguredSettlementKvWindow = async () => ({ type: 'final', sceneTitle: '测试', locationName: '刘思琪房间门口', choices: ['观察', '交流', '等待', '离开'] });

  const out = await loop.runConfigured(store, '前往刘思琪房间', null, config);

  assert.deepStrictEqual(stagePrompts, ['1/2', '2/2']);
  assert.ok(anchorPrompt.includes('第1步地点理由'));
  assert.ok(anchorPrompt.includes('第2步地点理由'));
  assert.ok(anchorPrompt.includes('第1步因果理由'));
  assert.ok(anchorPrompt.includes('第2步冲突理由'));
  assert.ok(out.result.narration.includes('轻敲房门'));
});

test('Stage 1 follow-up prompt remains Chinese K:V and never asks for JSON', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const renderedIds = [];
  context.window.GameModules.promptTemplates.render = async (id, vars) => {
    renderedIds.push(id);
    return id === 'inference-stage1-guided-query'
      ? `Stage1模板\n查询规划：\n资料状态：\n输出要求：${vars.当前步骤输出要求}`
      : `基础模板\n输出要求：${vars.当前步骤输出要求}`;
  };
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };

  const prompt = await loop.buildConfiguredPrompt({ store: makeStore(), action: '继续查询', base: '基础', loaded: [{ title: '角色卡', text: '刘思琪' }], skills: '', step: 2, config });

  assert.ok(renderedIds.includes('inference-stage1-guided-query'));
  assert.ok(prompt.includes('中文 K:V'));
  assert.ok(prompt.includes('查询规划'));
  assert.ok(prompt.includes('资料状态'));
  assert.ok(!prompt.includes('只允许返回一个合法 JSON 对象'));
  assert.ok(!prompt.includes('第一个字符必须是 {'));
});

test('Stage 1 prompt passes known participant layers to random candidate provider', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  let receivedOptions = null;
  context.window.GameModules.promptTemplates.render = async () => '提示';
  config.ctx = {
    buildLoadedText: () => '',
    limit: (text) => String(text || ''),
    randomActiveEventCandidates: (_store, _action, options) => { receivedOptions = options; return []; },
  };

  await loop.buildConfiguredPrompt({
    store: makeStore(),
    action: '继续观察',
    base: '基础',
    loaded: [],
    skills: '',
    step: 2,
    config,
    guidance: { forcedParticipants: [{ name: '刘思琪' }], priorityCandidates: [{ name: '刘思怡' }], dramaCandidates: [{ name: '王主管' }], forbiddenParticipants: [{ name: '路人甲' }] },
  });

  assert.strictEqual(JSON.stringify(receivedOptions.forcedParticipants.map((item) => item.name)), JSON.stringify(['刘思琪']));
  assert.strictEqual(JSON.stringify(receivedOptions.priorityCandidates.map((item) => item.name)), JSON.stringify(['刘思怡']));
  assert.strictEqual(JSON.stringify(receivedOptions.dramaCandidates.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.strictEqual(JSON.stringify(receivedOptions.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['路人甲']));
});



test('buildConfiguredPrompt includes previous Stage1 planning summary for later rounds', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = {
    buildLoadedText: () => '',
    limit: (text) => String(text || ''),
    randomActiveEventCandidates: () => [],
    buildStage1RoutingContext: () => '模式：现实\n本次行动：观察门口',
    loadedRoutingSummary: () => '无',
    stage1MaterialCatalogText: () => '无',
  };

  const prompt = await loop.buildConfiguredPrompt({
    store: makeStore(),
    action: '前往刘思琪房间',
    base: '基础',
    loaded: [],
    skills: '',
    step: 2,
    config,
    guidance: {
      forcedParticipants: [{ name: '刘思琪', reason: '本次行动目标' }],
      priorityCandidates: [{ name: '刘思瑶', reason: '同住相邻' }],
      dramaCandidates: [],
      forbiddenParticipants: [{ name: '王主管', reason: '场外微信' }],
      randomActiveEvents: [{ characterName: '路人甲', eventType: 'background_only', motivation: '路过' }],
      randomIntrusionCondition: '无明确条件则禁止闯入',
    },
  });

  assert.ok(prompt.includes('上一轮查询规划摘要：'));
  assert.ok(prompt.includes('强制出场：刘思琪'));
  assert.ok(prompt.includes('高优先候选：刘思瑶'));
  assert.ok(prompt.includes('禁止出场：王主管'));
  assert.ok(prompt.includes('随机主动事件：路人甲'));
});
test('scheduleParticipantHints classifies same nearby offstage and unknown schedules', () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号刘思琪房间门口';
  store.rpgStates = {
    siyao: { id: 'siyao', profile: { name: '刘思瑶' }, name: '刘思瑶' },
    siqi: { id: 'siqi', profile: { name: '刘思琪' }, name: '刘思琪' },
    siyi: { id: 'siyi', profile: { name: '刘思怡' }, name: '刘思怡' },
    teacher: { id: 'teacher', profile: { name: '王老师' }, name: '王老师' },
  };
  store.characterSchedules = {
    siqi: { characterId: 'siqi', characterName: '刘思琪', currentLocation: '锦苑小区3栋2单元601号刘思琪房间门口', currentAction: '等在门口', availability: '在场', reason: '同一地点' },
    siyao: { characterId: 'siyao', characterName: '刘思瑶', currentLocation: '锦苑小区3栋2单元601号客厅', currentAction: '写作业', availability: '在场', reason: '同住' },
    teacher: { characterId: 'teacher', characterName: '王老师', currentLocation: '学校办公室', currentAction: '批改作业', availability: '场外', reason: '在学校' },
    siyi: { characterId: 'siyi', characterName: '刘思怡', currentLocation: '当前位置未知', currentAction: '未知', availability: '未知', reason: '资料不足' },
  };

  const hints = JSON.parse(JSON.stringify(ctx.scheduleParticipantHints(store, '前往刘思琪房间', store.realWorldLocationName)));

  assert.deepStrictEqual(hints.sameLocation.map((item) => item.name), ['刘思琪']);
  assert.deepStrictEqual(hints.nearbyLocation.map((item) => item.name), ['刘思瑶']);
  assert.deepStrictEqual(hints.offstage.map((item) => item.name), ['王老师']);
  assert.deepStrictEqual(hints.unknown.map((item) => item.name), ['刘思怡']);
});

test('scheduleParticipantHints does not classify different keyed rooms as nearby', () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号刘思琪房间门口';
  store.rpgStates = {
    neighbor: { id: 'neighbor', profile: { name: '邻居' }, name: '邻居' },
    otherCommunity: { id: 'otherCommunity', profile: { name: '外小区住户' }, name: '外小区住户' },
  };
  store.characterSchedules = {
    neighbor: { characterId: 'neighbor', characterName: '邻居', currentLocation: '锦苑小区3栋2单元602号客厅', currentAction: '看电视', availability: '在场' },
    otherCommunity: { characterId: 'otherCommunity', characterName: '外小区住户', currentLocation: '湖畔小区7栋1单元601号客厅', currentAction: '休息', availability: '在场' },
  };

  const hints = JSON.parse(JSON.stringify(ctx.scheduleParticipantHints(store, '前往刘思琪房间', store.realWorldLocationName)));

  assert.deepStrictEqual(hints.nearbyLocation.map((item) => item.name), []);
});

test('scheduleCandidateHintText limits available schedule candidates to three', () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号客厅';
  store.rpgStates = Object.fromEntries(['甲', '乙', '丙', '丁'].map((name, index) => [`c${index}`, { id: `c${index}`, profile: { name }, name }]));
  store.characterSchedules = Object.fromEntries(['甲', '乙', '丙', '丁'].map((name, index) => [`c${index}`, {
    characterId: `c${index}`,
    characterName: name,
    currentLocation: `锦苑小区3栋2单元601号${name}房间`,
    currentAction: '日常活动',
    availability: '在场',
  }]));

  const text = String(ctx.scheduleCandidateHintText(store, '在客厅等待', store.realWorldLocationName));

  assert.ok(text.includes('日程候选提示：'));
  assert.ok(text.includes('同住/相邻：甲'));
  assert.ok(text.includes('乙'));
  assert.ok(text.includes('丙'));
  assert.ok(!text.includes('丁'));
});

test('Stage 1 routing context includes schedule candidate hints for nearby household roles', async () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号刘思琪房间门口';
  store.rpgStates = { siyao: { id: 'siyao', profile: { name: '刘思瑶' }, name: '刘思瑶' } };
  store.characterSchedules = {
    siyao: { characterId: 'siyao', characterName: '刘思瑶', currentLocation: '锦苑小区3栋2单元601号客厅', currentAction: '写作业', availability: '在场' },
  };

  const routing = ctx.buildStage1RoutingContext({ store, action: '前往刘思琪房间', loaded: [], config: { mode: 'real', label: '现实' } });

  assert.ok(routing.includes('日程候选提示：'));
  assert.ok(routing.includes('同住/相邻：刘思瑶'));
  assert.ok(routing.includes('不得作为可出场候选') || routing.includes('明确场外'));
});

test('Stage 2 scene anchor context includes schedule boundary hints', async () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.realWorldLocationName = '锦苑小区3栋2单元601号刘思琪房间门口';
  store.rpgStates = { siyao: { id: 'siyao', profile: { name: '刘思瑶' }, name: '刘思瑶' } };
  store.characterSchedules = {
    siyao: { characterId: 'siyao', characterName: '刘思瑶', currentLocation: '锦苑小区3栋2单元601号客厅', currentAction: '写作业', availability: '在场' },
  };

  const anchor = ctx.buildSceneAnchorContext({ store, action: '前往刘思琪房间', loaded: [], trace: [], config: { mode: 'real', label: '现实' } });

  assert.ok(anchor.includes('日程候选提示：'));
  assert.ok(anchor.includes('同住/相邻：刘思瑶'));
  assert.ok(anchor.includes('不是强制出场'));
});

test('Stage 2 narration prompt forbids advancing beyond current action', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '' };
  const prompt = await loop.buildConfiguredNarrationPrompt({ store, action: '亲吻对方', base: '基础', loaded: [], skills: '', config });
  assert.ok(prompt.includes('行动范围内充分推演'));
  assert.ok(prompt.includes('身体感受'));
  assert.ok(prompt.includes('可见细节'));
  assert.ok(prompt.includes('对话回应'));
  assert.ok(prompt.includes('不替玩家执行下一步新行动'));
  assert.ok(prompt.includes('不把亲吻、抚摸、摩擦、按住等行为自动扩展为脱衣、转移地点、插入、高潮'));
  assert.ok(prompt.includes('强制出场必须在正文中实际出现'));
  assert.ok(prompt.includes('不要换行符'));
});

test('Stage3 narration prompt uses slim prose context without final writeback or tool receipts', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage3-narration.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  const store = makeStore();
  store.realWorldLocationName = '刘思琪房间门口';
  store.realWorldSceneTitle = '锦苑小区走廊';
  store.phoneDateText = () => '2026-07-01';
  store.phoneTimeText = () => '01:20';
  store.playerSetupSummary = () => '姓名：刘悠';

  const prompt = await loop.buildConfiguredNarrationPrompt({
    store,
    action: '前往刘思琪房间',
    base: [
      '时间规则：所有现实时间都以桌面时间为准；本次 final 必须返回 elapsedSeconds，代码会用它推进桌面时间。',
      'subject.id 规则',
      '主体ID规则：\n玩家本人固定 id:player-self；未知角色直接写完整姓名，禁止自造前缀。',
      '势力资料库：\n中华人民共和国｜资料库：暂无记录。',
      '## 最近发送的世界线\n需严格跟着世界线续写，保证正文对最新世界线连续性。\n你已经走到走廊。',
    ].join('\n'),
    loaded: [{
      title: 'realworld.location.query.searchLocationOne',
      text: [
        '文本内容参照material-abc',
        '参照对象：刘思琪房间',
        '关键词查询：前往刘思琪房间',
        '除非玩家提出新的未知地点，不要继续为同一人物地点或路线重复 request_context。',
        '当前位置：刘思琪房间门口',
        '空间事实：卧室门口与走廊相连，门内可能听见敲门。',
        '微信事实：王主管只可能场外发消息。',
      ].join('\n'),
    }],
    skills: 'Skill：realworld.location.query\n返回格式：JSON',
    sceneAnchorReport: '场景锚定报告：门口场景。\n当前地点：刘思琪房间门口\n当前场景影响对象：刘思琪、房门。',
    config,
  });

  [
    'elapsedSeconds',
    'final 必须返回',
    'subject.id',
    '主体ID规则',
    'id:player-self',
    '势力资料库：',
    '暂无记录',
    '需严格跟着世界线续写，保证正文对最新世界线连续性',
    'realworld.location.query.searchLocationOne',
    '文本内容参照material-abc',
    '参照对象：',
    '关键词查询：前往刘思琪房间',
    'request_context',
    'Skill：',
    '返回格式：JSON',
  ].forEach((bad) => assert.ok(!prompt.includes(bad), `${bad} leaked into Stage3 prompt`));
  [
    '刘思琪房间门口',
    '锦苑小区走廊',
    '空间事实：卧室门口与走廊相连',
    '微信事实：王主管只可能场外发消息。',
    '场景锚定报告：门口场景。',
    '当前场景影响对象：刘思琪、房门。',
    '正文承接最近已发生事实，不改写已发送内容；只写本次行动直接结果。',
  ].forEach((good) => assert.ok(prompt.includes(good), `${good} missing from Stage3 prompt`));
});

test('scene anchor report prompt uses slim anchor context and current-scene impact field', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage2-scene-anchor.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  const store = makeStore();
  store.realWorldLocationName = '刘思琪房间门口';
  store.phoneDateText = () => '2026-07-01';
  store.phoneTimeText = () => '01:20';

  const prompt = await loop.buildConfiguredSceneAnchorPrompt({
    store,
    action: '前往刘思琪房间',
    base: '时间规则：所有现实时间都以桌面时间为准；本次 final 必须返回 elapsedSeconds\n生日：1998-11-19\n具体地址：锦苑小区3栋2单元601号\n财富等级：中产\n性经验次数：0\n父母去世原因：交通事故\n需严格跟着世界线续写，保证正文对最新世界线连续性。',
    loaded: [{ title: 'character.query.searchCharacterProfile', text: '全部情绪值：紧张10\n全部对玩家感觉值：信任10\n全部穿着槽：bra=胸罩\n全部物品：手机\n全部技能：学习\n全部核心属性数值：力量1\n全部身体状态细项：正常\n当前位置：刘思琪房间附近\n空间事实：卧室门口与走廊相连' }],
    trace: [{
      type: 'request_context',
      forcedParticipants: [{ name: '刘思琪', reason: '房间主人' }],
      priorityCandidates: [{ name: '刘思怡', reason: '相邻房间' }],
      randomActiveEvents: [{ characterName: '王主管', eventType: 'wechat', motivation: '工作确认' }],
      sceneQueries: { location: ['房间门口'], causality: ['旧因果'], conflict: ['冲突'] },
      randomIntrusionCondition: '无明确条件则禁止闯入',
    }],
    config,
  });

  ['场景锚定报告：', '当前地点：', '空间状态：', '正文写作重点：', '当前场景影响对象：', '刘思琪', '王主管'].forEach((good) => {
    assert.ok(prompt.includes(good), `${good} missing from Stage2 prompt`);
  });
  ['elapsedSeconds', 'final.wechatActions', '结算对象', '类型完成', '更新N', '生日：', '具体地址：锦苑小区3栋2单元601号', '财富等级', '性经验次数', '父母去世原因', '需严格跟着世界线续写', '地点查询：', '因果查询：', '冲突查询：', '全部情绪值', '全部对玩家感觉值', '全部穿着槽', '全部物品', '全部技能', '全部核心属性数值', '全部身体状态细项', '结算边界：', 'character.query.searchCharacterProfile'].forEach((bad) => {
    assert.ok(!prompt.includes(bad), `${bad} leaked into Stage2 prompt`);
  });
});

test('resolveEffectiveSceneLayers uses latest explicit layers and always forces player', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } };
  const trace = [
    { forcedParticipants: [], priorityCandidates: [{ name: '刘思瑶', reason: '第一轮探索候选' }], dramaCandidates: [{ name: '刘思怡', reason: '第一轮戏剧候选' }], forbiddenParticipants: [], randomActiveEvents: [{ characterName: '刘思琪', eventType: 'background_only', motivation: '第一轮随机' }], randomIntrusionCondition: '无明确条件则禁止闯入', sceneQueries: { location: ['房间门口'], causality: [], conflict: [] } },
    { forcedParticipants: [{ name: '刘思琪', reason: '本次行动明确目标' }], priorityCandidates: [], dramaCandidates: [], forbiddenParticipants: [], randomActiveEvents: [{ characterName: '刘思瑶', eventType: 'background_only', motivation: '第二轮随机' }], randomIntrusionCondition: '无明确条件则禁止闯入', sceneQueries: { location: ['房间内部'], causality: [], conflict: [] } },
    { forcedParticipants: [], priorityCandidates: [], dramaCandidates: [], forbiddenParticipants: [], randomActiveEvents: [{ characterName: '刘思怡', eventType: 'background_only', motivation: '第三轮随机' }], randomIntrusionCondition: '无明确条件则禁止闯入', sceneQueries: { location: [], causality: [], conflict: [] } },
  ];

  const layers = loop.resolveEffectiveSceneLayers(trace, store, loop.realConfig());

  assert.strictEqual(JSON.stringify(layers.forcedParticipants.map((item) => item.name)), JSON.stringify(['刘悠']));
  assert.strictEqual(JSON.stringify(layers.priorityCandidates.map((item) => item.name)), JSON.stringify([]));
  assert.strictEqual(JSON.stringify(layers.dramaCandidates.map((item) => item.name)), JSON.stringify([]));
  assert.strictEqual(JSON.stringify(layers.randomActiveEvents.map((item) => item.characterName)), JSON.stringify(['刘思怡']));
  assert.strictEqual(layers.randomIntrusionCondition, '无明确条件则禁止闯入');
});

test('resolveEffectiveSceneLayers supports multiple forced participants shared control and removes conflicting random events', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' }, sharedControlState: () => ({ id: 'siqi', profile: { name: '刘思琪' } }) };
  const trace = [{
    forcedParticipants: [{ name: '刘思琪', reason: '本次行动明确目标' }],
    priorityCandidates: [{ name: '刘思瑶', reason: '同住相邻' }],
    dramaCandidates: [{ name: '刘思瑶', reason: '重复层级，应被高优先覆盖' }, { name: '刘思怡', reason: '可能听见' }],
    forbiddenParticipants: [{ name: '王主管', reason: '只能场外微信' }, { name: '刘悠', reason: '模型误判玩家不在场' }],
    randomActiveEvents: [
      { characterName: '刘思琪', eventType: 'background_only', motivation: '与强制冲突' },
      { characterName: '王主管', eventType: 'wechat', motivation: '与禁止冲突' },
      { characterName: '路人甲', eventType: 'background_only', motivation: '可保留场外' },
    ],
    randomIntrusionCondition: '无明确条件则禁止闯入',
  }];

  const layers = loop.resolveEffectiveSceneLayers(trace, store, loop.realConfig());

  assert.strictEqual(JSON.stringify(layers.forcedParticipants.map((item) => item.name)), JSON.stringify(['刘思琪', '刘悠']));
  assert.strictEqual(JSON.stringify(layers.priorityCandidates.map((item) => item.name)), JSON.stringify(['刘思瑶']));
  assert.strictEqual(JSON.stringify(layers.dramaCandidates.map((item) => item.name)), JSON.stringify(['刘思怡']));
  assert.strictEqual(JSON.stringify(layers.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.strictEqual(JSON.stringify(layers.randomActiveEvents.map((item) => item.characterName)), JSON.stringify(['路人甲']));
});


test('parse scene anchor report reads current-scene impact objects and keeps legacy boundary compatibility', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const modern = loop.parseSceneAnchorReport(`场景锚定报告：本轮只处理门口动作。
当前地点：刘思琪房间门口
当前时间：12:56
空间状态：相邻房间可能听见但不能无因果闯入。
当前动作：玩家前往房门。
强制出场：刘思琪
高优先候选：刘思怡，不出场理由：相邻房间未被触发
戏剧候选：无
禁止出场：无
随机事件影响：王主管可能发微信，默认场外。
正文写作重点：写清抵达房门与即时回应。
当前场景影响对象：刘思琪、刘思琪房门、微信系统。`, loop.realConfig());
  assert.strictEqual(modern.currentLocation, '刘思琪房间门口');
  assert.strictEqual(modern.currentSceneImpactObjects, '刘思琪、刘思琪房门、微信系统。');
  assert.strictEqual(modern.settlementBoundary, '刘思琪、刘思琪房门、微信系统。');
  assert.ok(modern.text.includes('当前场景影响对象：刘思琪、刘思琪房门、微信系统。'));

  const legacy = loop.parseSceneAnchorReport(`场景锚定报告：旧字段兼容。
当前地点：刘思琪房间门口
当前时间：12:56
空间状态：门口。
当前动作：敲门。
强制出场：刘思琪
高优先候选：无
戏剧候选：无
禁止出场：无
随机事件影响：无
正文写作重点：敲门。
结算边界：刘思琪。`, loop.realConfig());
  assert.strictEqual(legacy.currentSceneImpactObjects, '刘思琪。');
  assert.ok(legacy.text.includes('当前场景影响对象：刘思琪。'));
});

test('parse scene anchor report rejects participant names that are both candidate and forbidden', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;

  assert.throws(() => loop.parseSceneAnchorReport(`场景锚定报告：本轮处理门口动作。
当前地点：刘思琪房间门口
当前时间：深夜
空间状态：门口
当前动作：前往门口
强制出场：无
高优先候选：刘思琪（房间内睡觉）出场理由：同住且当前时间点符合睡眠时段
戏剧候选：无
禁止出场：刘思琪（房间内睡觉）不出场理由：当前时间点正在休息
随机事件影响：无
正文写作重点：只写门口动作
当前场景影响对象：刘思琪房门`, loop.realConfig()), /同一角色不能同时/u);
});

test('parse scene anchor report rejects missing location time space or action anchors', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const full = {
    '场景锚定报告': '本轮只处理门口动作。',
    '当前地点': '刘思琪房间门口',
    '当前时间': '12:56',
    '空间状态': '相邻房间可能听见但不能无因果闯入。',
    '当前动作': '玩家拉扯 choker。',
    '强制出场': '刘思琪',
    '高优先候选': '无',
    '戏剧候选': '无',
    '禁止出场': '无',
    '随机事件影响': '无',
    '正文写作重点': '只写当前动作。',
    '当前场景影响对象': '刘悠与刘思琪。',
  };
  ['当前地点', '当前时间', '空间状态', '当前动作'].forEach((missingKey) => {
    const text = Object.entries(full).filter(([key]) => key !== missingKey).map(([key, value]) => `${key}：${value}`).join('\n');
    assert.throws(() => loop.parseSceneAnchorReport(text, loop.realConfig()), /场景锚定报告解析错误请重试/u, missingKey);
  });
});

test('parseStep accepts Stage1 continue status with query reasons and no executable requests', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;

  const data = loop.parseStep(`查询规划：
资料状态：继续请求资料
地点查询理由：前往刘思琪房间的路上，需要了解当前位置周边环境，以及刘思琪房间可能的位置关系
因果查询理由：手机异常导致的困惑感仍未消除，需要确认这个异常与即将前往的房间是否有潜在关联
冲突查询理由：尚未明确检测到任何冲突，但内心存在对异常现象的担忧
强制出场：
高优先候选：
戏剧候选：
禁止出场：
随机事件候选：
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无
资料请求结束：是`, loop.realConfig());

  assert.strictEqual(data.type, 'request_context');
  assert.ok(data.sceneQueries.location.includes('前往刘思琪房间的路上，需要了解当前位置周边环境，以及刘思琪房间可能的位置关系'));
});

test('parseStep fills omitted soft-convergence fields when requests are none', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep(`地点查询：无
地点查询理由：无需查询，目标地点已明确为刘思琪的房间
因果查询：无
因果查询理由：无因果链条需要推演
冲突查询：无
冲突查询理由：当前路线无潜在冲突
强制出场：刘思琪（房间主人必然在房间内）
高优先候选：无
戏剧候选：无
随机事件候选：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无`, loop.realConfig());

  assert.strictEqual(data.type, 'context_done');
  assert.strictEqual(data.requests.length, 0);
  assert.ok(data.parseScore.successRate >= 0.8);
  assert.ok(data.guidanceText.includes('资料状态：资料已足够'));
  assert.ok(data.guidanceText.includes('资料请求结束：是'));
});

test('parseStep accepts Stage1 continue status with executable numbered requests', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep(`查询规划：
资料状态：继续请求资料
地点查询：
地点查询理由：前往刘思琪房间前需要确认其房间位置和内部状况
因果查询：
因果查询理由：刘思琪房间可能是异常源头之一，需要了解其具体情况
冲突查询：
冲突查询理由：三胞胎姐妹对哥哥的特殊感情可能与异常现象有关
强制出场：
高优先候选：
戏剧候选：
禁止出场：刘思瑶、刘思怡（当前场景无需她们出场）
随机事件候选：刘思琪房间内的异常物品/设备/装饰品
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无 / 2
资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界
资料请求2：地点查询，查询刘思琪房间，四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋2单元601号
资料请求结束：是`, loop.realConfig());

  assert.strictEqual(data.type, 'request_context');
  assert.strictEqual(data.requests.length, 2);
  assert.ok(data.parseScore.successRate >= 0.8);
});

test('parseStep accepts Stage1 continue status with location query reason', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep(`查询规划：需要地点资料
资料状态：继续请求资料
地点查询理由1：需要了解周边环境布局
地点查询理由2：判断通往刘思琪房间的最佳路径
因果查询理由1：无
冲突查询理由1：无
强制出场：无
高优先候选：无
戏剧候选：无
禁止出场：无
随机事件候选：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无
资料请求结束：是`, loop.realConfig());

  assert.strictEqual(data.type, 'request_context');
  assert.strictEqual(JSON.stringify(data.sceneQueries.location), JSON.stringify(['需要了解周边环境布局', '判断通往刘思琪房间的最佳路径']));
  assert.strictEqual(data.requests.length, 0);
});

test('parseStep keeps later non-empty duplicate participant fields for role-card loading', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep(`查询规划：确认人物与地点
资料状态：继续请求资料
地点查询：
地点查询理由：确认刘思琪房间位置
因果查询：
因果查询理由：确认深夜前往原因
冲突查询：
冲突查询理由：确认潜在冲突
强制出场：
强制出场：刘思琪 - 她是本次行动目标
高优先候选：
高优先候选：刘思瑶 - 同住相邻空间
戏剧候选：
戏剧候选：刘思怡 - 同住相邻空间
禁止出场：
禁止出场：父母 - 已故
随机事件候选：
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无
资料请求结束：是`, loop.realConfig());
  const requests = context.window.GameModules.realWorldAgentContext.participantProfileRequests(data);

  assert.strictEqual(JSON.stringify(data.forcedParticipants.map((item) => item.name)), JSON.stringify(['刘思琪']));
  assert.strictEqual(data.forcedParticipants[0].reason, '她是本次行动目标');
  assert.strictEqual(JSON.stringify(requests.map((item) => item.params.name)), JSON.stringify(['刘思琪', '刘思瑶', '刘思怡']));
});

test('parseStep normalizes Chinese K:V participants into trace items', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep(`查询规划：确认互动边界
资料状态：继续请求资料
强制出场：刘悠；刘思琪
高优先候选：赵敏
戏剧候选：无
禁止出场：王主管
随机事件候选：王主管｜wechat｜工作确认；路人甲｜background｜经过门口
随机事件闯入条件：无明确条件则禁止闯入
资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界
资料请求结束：是`, loop.realConfig());
  const traced = loop.traceItem(1, data, '查询规划：确认互动边界', context.window.GameModules.realWorldAgentContext);

  assert.strictEqual(data.type, 'request_context');
  assert.strictEqual(JSON.stringify(data.participants.map((item) => item.name)), JSON.stringify(['刘悠', '刘思琪']));
  assert.strictEqual(JSON.stringify(data.priorityCandidates.map((item) => item.name)), JSON.stringify(['赵敏']));
  assert.strictEqual(JSON.stringify(data.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.strictEqual(JSON.stringify(data.randomActiveEvents.map((item) => item.characterName)), JSON.stringify(['路人甲']));
  assert.strictEqual(data.requests.length, 1);
  assert.strictEqual(traced.participants.length, 2);
  assert.strictEqual(JSON.stringify(traced.priorityCandidates.map((item) => item.name)), JSON.stringify(['赵敏']));
  assert.strictEqual(JSON.stringify(traced.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.strictEqual(JSON.stringify(traced.randomActiveEvents.map((item) => item.characterName)), JSON.stringify(['路人甲']));
  assert.ok(traced.parseScore.successRate >= 0.8);
  assert.strictEqual(typeof traced.parseDegraded, 'boolean');
  assert.strictEqual(JSON.stringify(traced.droppedMaterialRequests), JSON.stringify([]));
});

test('parseStep rejects legacy JSON Stage1 payloads on strict Chinese K:V path', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  assert.throws(() => loop.parseStep('{"type":"request_context","participants":["刘思琪"],"requests":[]}', loop.realConfig()), /缺少中文 K:V 查询规划字段/u);
});

test('parseChineseKvBlock parses fixed Chinese keys and aliases with score', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseChineseKvBlock(`查询规划：确认地点和直接互动对象\n资料状态：继续请求资料\n必须出场：刘悠；刘思琪\n不能出场：王主管\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界\n资料请求结束：是`, loop.guidedStepFields(), { parseMaterialRequests: true, config: loop.realConfig() });

  assert.strictEqual(parsed.values['强制出场'], '刘悠；刘思琪');
  assert.strictEqual(parsed.values['禁止出场'], '王主管');
  assert.strictEqual(parsed.materialRequests.length, 1);
  assert.ok(parsed.successRate >= 0.8);
});

test('mergeGuidedParseResults combines complementary fields before scoring threshold', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const first = loop.parseChineseKvBlock('查询规划：先确认参与者\n资料状态：继续请求资料\n强制出场：刘悠', loop.guidedStepFields());
  const second = loop.parseChineseKvBlock('禁止出场：王主管\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求结束：是', loop.guidedStepFields());
  const merged = loop.mergeGuidedParseResults(first, second);

  assert.strictEqual(merged.values['强制出场'], '刘悠');
  assert.strictEqual(merged.values['禁止出场'], '王主管');
  assert.ok(merged.successRate >= first.successRate);
  assert.ok(merged.successRate >= second.successRate);
});

test('parseChineseKvBlock does not count empty critical values as successful hits', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseChineseKvBlock('资料状态：\n强制出场：\n禁止出场：\n随机事件闯入条件：', loop.guidedStepFields());

  assert.ok(parsed.keyHits.includes('资料状态'));
  assert.strictEqual(parsed.criticalHits.length, 0);
  assert.ok(parsed.successRate < 0.8);
});

test('mergeGuidedParseResults deduplicates material request scoring and best result picks highest score', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const first = loop.parseChineseKvBlock('资料状态：继续请求资料\n资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界', loop.guidedStepFields(), { parseMaterialRequests: true, config: loop.realConfig() });
  const second = loop.parseChineseKvBlock('资料状态：继续请求资料\n强制出场：刘思琪\n资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界', loop.guidedStepFields(), { parseMaterialRequests: true, config: loop.realConfig() });
  const merged = loop.mergeGuidedParseResults(first, second);

  assert.strictEqual(merged.materialRequests.length, 1);
  assert.ok(merged.successRate >= first.successRate);
  assert.ok(merged.successRate >= second.successRate);
  assert.strictEqual(loop.bestGuidedParseResult([first, merged]), merged);
});

test('parseChineseMaterialRequest maps real Chinese requests to whitelist calls', () => {
  const context = createContext();
  loadCore(context);
  context.window.GameModules.realWorld2026 = { label: '2026现代都市现实世界' };
  const ctx = context.window.GameModules.realWorldAgentContext;

  const role = ctx.parseChineseMaterialRequest('资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界', { mode: 'real' });
  const nearby = ctx.parseChineseMaterialRequest('资料请求2：地点查询，查询附近地点，刘思琪房间门口', { mode: 'real' });
  const news = ctx.parseChineseMaterialRequest('资料请求3：新闻查询，最新热榜，当前世界', { mode: 'real' });
  const bad = ctx.parseChineseMaterialRequest('资料请求3：未知查询，删除资料，刘思琪', { mode: 'real' });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(role)), { skill: 'character.query', method: 'searchCharacterProfile', params: { name: '刘思琪', world: '2026现代都市现实世界' }, sourceText: '资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界' });
  assert.strictEqual(nearby.skill, 'realworld.location.query');
  assert.strictEqual(nearby.method, 'getNearbyLocations');
  assert.strictEqual(nearby.params.locationName, '刘思琪房间门口');
  assert.strictEqual(news.skill, 'news.query');
  assert.strictEqual(news.method, 'getLatestHotlist');
  assert.strictEqual(news.params.world, '当前世界');
  assert.strictEqual(bad, null);
});

test('promptTemplates registers Stage4 settlement window markdown', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  const item = context.window.GameModules.promptTemplates.find('inference-stage4-settlement-window');
  assert.strictEqual(item.id, 'inference-stage4-settlement-window');
  assert.strictEqual(item.file, 'prompts/推演引擎/stage4-settlement-window.md');
});

test('promptTemplates render expands double-brace markdown variables cleanly', async () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  const templates = context.window.GameModules.promptTemplates;
  templates.inline = { 'inference-stage4-settlement-window': '现有 Update：{{现有Update提示词摘要}}\n旧格式：{旧变量}' };
  const out = await templates.render('inference-stage4-settlement-window', { 现有Update提示词摘要: 'UPDATE_REGISTRY_GUIDANCE', 旧变量: 'LEGACY_VALUE' });
  assert.ok(out.includes('现有 Update：UPDATE_REGISTRY_GUIDANCE'));
  assert.ok(out.includes('旧格式：LEGACY_VALUE'));
  assert.ok(!out.includes('{UPDATE_REGISTRY_GUIDANCE}'));
  assert.ok(!out.includes('{{现有Update提示词摘要}}'));
});

test('colocated Stage K:V templates register inline and contain no old guided JSON protocol', () => {
  const context = createContext();
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage1-guided-query.js');
  loadScript(context, 'publish/prompts/推演引擎/stage2-scene-anchor.js');
  loadScript(context, 'publish/prompts/推演引擎/stage3-narration.js');
  loadScript(context, 'publish/prompts/推演引擎/stage4-settlement-window.js');
  const inline = context.window.GameModules.promptTemplates.inline || {};
  ['inference-stage1-guided-query', 'inference-stage2-scene-anchor', 'inference-stage3-narration', 'inference-stage4-settlement-window'].forEach((id) => {
    assert.ok(String(inline[id] || '').length > 20, `${id} inline template missing`);
  });
  const guidedText = [
    inline['inference-stage1-guided-query'] || '',
    inline['inference-stage2-scene-anchor'] || '',
    inline['inference-stage3-narration'] || '',
    inline['inference-stage4-settlement-window'] || '',
  ].join('\n');
  assert.ok(!guidedText.includes('资料收集阶段只能返回一个合法 JSON 对象'));
  assert.ok(!guidedText.includes('只允许输出 `request_context`'));
  assert.ok(!guidedText.includes('第一个字符必须是 `{`'));
  assert.ok(String(inline['inference-stage1-guided-query']).includes('只输出中文 K:V'));
  const stage4 = String(inline['inference-stage4-settlement-window']);
  [
    '现有 Update 提示词摘要',
    '现有 Init 提示词',
    '现有 Init 字段 Schema',
    '残缺原因或尾部',
    '不是最后一批时，本轮返回正文长度必须超过1000个中文字符',
    '类型完成：是',
    '结算结束：是',
  ].forEach((bad) => {
    assert.ok(!stage4.includes(bad), `Stage4 runtime template should not include ${bad}`);
  });
  [
    '最高优先级·输出完整性',
    '本轮结算材料',
    '类型短规则',
    '未完成类型原因',
    '内部提取“本轮稳定事实”',
    '明确事实：可直接结算',
    '强暗示事实：可保守结算',
    '弱氛围暗示：不得结算',
    '未完成类型必须从该类型标题开始完整重输',
    '同一类型标题在本轮输出中只能出现一次',
    '完成一个类型后必须继续下一个类型，不得回到已输出类型',
    '不表示你可以逐个类型分多轮输出',
    '只输出一个类型，系统会判定失败',
    '必须输出块数量',
    '必须输出块顺序',
    '内部自检，不得输出',
  ].forEach((good) => {
    assert.ok(stage4.includes(good), `Stage4 runtime template should include ${good}`);
  });
});

test('Stage4 settlement window prompt uses slim fact context without Update Init manuals or raw tails', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  let updateSkillsCalled = false;
  let initSkillCalled = false;
  let initSchemaCalled = false;
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  context.window.GameModules.updateRegistry.skillsText = () => {
    updateSkillsCalled = true;
    return 'UPDATE_REGISTRY_GUIDANCE_SHOULD_NOT_APPEAR';
  };
  context.window.GameModules.updateRegistry.skillText = () => {
    updateSkillsCalled = true;
    return 'UPDATE_REGISTRY_GUIDANCE_SHOULD_NOT_APPEAR';
  };
  context.window.GameModules.initPromptRegistry.skillText = () => {
    initSkillCalled = true;
    return 'INIT_PROMPT_GUIDANCE_SHOULD_NOT_APPEAR';
  };
  context.window.GameModules.initPromptRegistry.schema = () => {
    initSchemaCalled = true;
    return { initUpdates: [{ type: 'INIT_SCHEMA_GUIDANCE_SHOULD_NOT_APPEAR' }] };
  };

  const prompt = await loop.buildSettlementTypeWindowPrompt({
    requestedTypes: ['情绪', '物品'],
    completedTypes: ['感觉'],
    incompleteTypes: ['物品'],
    partialByType: { 物品: '物品结算：\n结算状态：需要更新\n更新1：物品，手机，旧尾巴原文' },
    store,
    action: '行动',
    base: '基础',
    loaded: [],
    narration: '她侧身让路，手机屏幕亮起；空气有些微妙。',
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }],
    config: loop.realConfig(),
  });

  assert.strictEqual(updateSkillsCalled, false, 'Stage4 prompt should not call update registry helpers');
  assert.strictEqual(initSkillCalled, false, 'Stage4 prompt should not call init prompt skillText');
  assert.strictEqual(initSchemaCalled, false, 'Stage4 prompt should not call init prompt schema');
  [
    'UPDATE_REGISTRY_GUIDANCE_SHOULD_NOT_APPEAR',
    'INIT_PROMPT_GUIDANCE_SHOULD_NOT_APPEAR',
    'INIT_SCHEMA_GUIDANCE_SHOULD_NOT_APPEAR',
    '残缺原因或尾部',
    '旧尾巴原文',
    '现有 Update 提示词摘要',
    '现有 Init 提示词',
    '现有 Init 字段 Schema',
    '本轮返回正文长度必须超过1000',
    '类型完成：是',
    '结算结束：是',
  ].forEach((bad) => assert.ok(!prompt.includes(bad), `${bad} leaked into Stage4 prompt`));
  [
    '本轮结算材料',
    '类型短规则',
    '未完成类型原因',
    '内部提取“本轮稳定事实”',
    '明确事实：可直接结算',
    '强暗示事实：可保守结算',
    '弱氛围暗示：不得结算',
    '情绪结算规则',
    '物品结算规则',
    '需从“物品结算{”开始整块重输',
    '必须输出块数量',
    '必须输出块顺序',
    '情绪结算{ → 物品结算{',
    '她侧身让路，手机屏幕亮起',
  ].forEach((good) => assert.ok(prompt.includes(good), `${good} missing from Stage4 prompt`));
});

test('Stage4 settlement fact context includes current emotion and player-feeling baselines', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = {
    emotions: { 紧张: 18, 好奇: 12 },
    temporaryEmotions: {},
    playerFeelings: { 信任: 35, 警惕: 45 },
    temporaryPlayerFeelings: {},
  };
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);

  const prompt = await loop.buildSettlementTypeWindowPrompt({
    requestedTypes: ['情绪', '感觉'],
    completedTypes: [],
    incompleteTypes: [],
    partialByType: {},
    store,
    action: '行动',
    base: '基础',
    loaded: [],
    narration: '她握紧手机，抬头看你。',
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }],
    config: loop.realConfig(),
  });

  assert.ok(prompt.includes('当前情绪基线'), 'emotion baseline missing from Stage4 prompt');
  assert.ok(prompt.includes('刘思琪：情绪：紧张=18、好奇=12'), 'current emotion values missing');
  assert.ok(prompt.includes('对玩家感觉基线'), 'player-feeling baseline missing from Stage4 prompt');
  assert.ok(prompt.includes('刘思琪：对玩家感觉：信任=35、警惕=45'), 'current player-feeling values missing');
  assert.ok(prompt.includes('感觉只表示该角色对玩家的感觉'), 'feeling boundary missing');
  assert.ok(prompt.includes('情绪指标只能使用当前情绪基线中已经存在的指标名：紧张、好奇'), 'emotion metric whitelist missing');
  assert.ok(prompt.includes('感觉指标只能使用对玩家感觉基线中已经存在的指标名：信任、警惕'), 'feeling metric whitelist missing');
  assert.ok(prompt.includes('若稳定事实不对应上述已有指标名，必须写“无变化”，不得新造情绪/感觉指标'), 'new metric guard missing');
});

test('Stage4 prompt shows exact brace-only block examples', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);

  const prompt = await loop.buildSettlementTypeWindowPrompt({
    requestedTypes: ['情绪', '感觉'],
    completedTypes: [],
    incompleteTypes: [],
    partialByType: {},
    store,
    action: '行动',
    base: '基础',
    loaded: [],
    narration: '她握紧手机，抬头看你。',
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }],
    config: loop.realConfig(),
  });

  const rendered = JSON.parse(prompt);
  assert.ok(rendered.类型合约.includes('严格块格式示例'), 'brace-only example section missing');
  assert.ok(rendered.类型合约.includes('情绪结算{\n无变化\n}'), 'emotion brace example missing');
  assert.ok(rendered.类型合约.includes('感觉结算{\n无变化\n}'), 'feeling brace example missing');
  assert.ok(rendered.类型合约.includes('禁止写成“情绪结算：”或单独一行“情绪结算”'), 'legacy heading ban missing');
});

test('Stage4 base settlement prompt requires mandatory fields and forbids no-change base example', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);

  const prompt = await loop.buildSettlementTypeWindowPrompt({
    requestedTypes: ['基础结算', '情绪', '感觉'],
    completedTypes: [],
    incompleteTypes: [],
    partialByType: {},
    store,
    action: '行动',
    base: '基础',
    loaded: [],
    narration: '她握紧手机，抬头看你。',
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }],
    config: loop.realConfig(),
  });

  const rendered = JSON.parse(prompt);
  const baseContract = rendered.类型合约.split('情绪结算{')[0];
  [
    '经过时间：秒数',
    '当前状态：状态文本',
    '当前目标：目标文本',
    '场景标题：标题',
    '地点名称：地点全称',
    '备选行动1：行动文本',
    '备选行动2：行动文本',
    '备选行动3：行动文本',
    '备选行动4：行动文本',
    '基础结算禁止写“无变化”',
  ].forEach((required) => assert.ok(baseContract.includes(required), `${required} missing from base contract`));
  assert.ok(!baseContract.includes('基础结算{\n无变化\n}'), 'base no-change example should not be advertised');
  assert.ok(prompt.includes('基础结算即使没有稳定变化，也必须完整输出全部基础字段'), 'base no-change exemption missing');
});

test('Stage4 prompt uses dynamic minimum length based on requested type count', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);

  const prompt = await loop.buildSettlementTypeWindowPrompt({
    requestedTypes: ['基础结算', '情绪', '感觉'],
    completedTypes: [],
    incompleteTypes: [],
    partialByType: {},
    store,
    action: '行动',
    base: '基础',
    loaded: [],
    narration: '她握紧手机，抬头看你。',
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }],
    config: loop.realConfig(),
  });

  const rendered = JSON.parse(prompt);
  assert.strictEqual(rendered.最低输出字数, '1000');
  assert.ok(rendered.输出长度规则.includes('不得用解释、总结、重复文本凑字数'), 'anti-padding length rule missing');
});

test('parseSettlementKv rejects legacy colon headings even with completion markers', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseSettlementKv(`情绪结算：
结算状态：无变化
类型完成：是
结算结束：是`, { requestedTypes: ['情绪'], participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪' }], store: makeStore(), config: loop.realConfig() });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['情绪']);
});

test('parseSettlementKv rejects emotion and feeling updates outside existing metric keys', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = {
    emotions: { 紧张: 18 },
    temporaryEmotions: {},
    playerFeelings: { 信任: 35 },
    temporaryPlayerFeelings: {},
  };
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪' }];

  const parsed = loop.parseSettlementKv(`情绪结算{
更新1：刘思琪，羞涩，+12，正文只支持紧张变化
}
感觉结算{
更新1：刘思琪，依赖，+8，正文只支持信任变化
}`, { requestedTypes: ['情绪', '感觉'], participants, store, config: loop.realConfig() });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['情绪', '感觉']);
  assert.strictEqual(parsed.genericUpdates.length, 0);
});

test('parseSettlementKv rejects legacy colon base heading even with completion markers', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseSettlementKv(`基础结算：需要更新 / 无变化
结算状态：需要更新
经过时间：120秒
当前状态：测试状态
当前目标：测试目标
场景标题：测试标题
地点名称：测试地点
备选行动1：一
备选行动2：二
备选行动3：三
备选行动4：四
类型完成：是
结算结束：是`, { requestedTypes: ['基础结算'], participants: [], store: makeStore(), config: loop.realConfig() });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['基础结算']);
});

test('Stage4 keeps complete settlement blocks from short partial output before retrying missing types', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  loop.settlementTypeQueue = () => ['情绪', '感觉'];
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  const rendered = [];
  const outputs = [
    '情绪结算{\n无变化\n}',
    '感觉结算{\n无变化\n}',
  ];
  loop.completeConfiguredStep = async (_store, prompt) => {
    rendered.push(JSON.parse(prompt));
    return outputs.shift();
  };

  await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(rendered.length, 2);
  assert.strictEqual(rendered[1].本次必须返回的类型, '感觉');
  assert.strictEqual(rendered[1].已完成类型, '情绪');
  assert.ok(!rendered[1].类型合约.includes('情绪结算{'), 'completed short-block type should not be requested again');
  assert.ok(rendered[1].未完成类型原因.includes('长度不足，但已验收完整块'), 'retry should explain accepted complete blocks');
});

test('Stage4 short partial output without complete blocks is discarded before retry', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  loop.settlementTypeQueue = () => ['情绪', '感觉'];
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  const rendered = [];
  const outputs = [
    '情绪结算{\n结算状态：无变化',
    '情绪结算{\n无变化\n}\n感觉结算{\n无变化\n}',
  ];
  loop.completeConfiguredStep = async (_store, prompt) => {
    rendered.push(JSON.parse(prompt));
    return outputs.shift();
  };

  await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(rendered.length, 2);
  assert.strictEqual(rendered[1].本次必须返回的类型, '情绪、感觉');
  assert.strictEqual(rendered[1].已完成类型, '无');
  assert.ok(rendered[1].类型合约.includes('情绪结算{'), 'discarded emotion contract should still be requested');
  assert.ok(rendered[1].未完成类型原因.includes('整轮已丢弃'), 'retry should explain whole-attempt discard');
  assert.strictEqual((rendered[1].未完成类型原因.match(/返回过短/gu) || []).length, 1);
});

test('scene anchor accepts parse-degraded report without a second AI request', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  let calls = 0;
  loop.completeConfiguredStep = async () => {
    calls += 1;
    return '场景锚定报告：\n当前地点：锦苑小区3栋2单元\n当前时间：2026年7月1日周三凌晨1:20:45\n空间状态：走廊灯光明亮，安静无人\n当前动作：走向刘思琪房门前\n强制出场：无\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：敲门与回应\n当前场景影响对象：仅限于当前场景内的物理交互';
  };

  const out = await loop.completeSceneAnchorReport(makeStore(), 'prompt', null, loop.realConfig());

  assert.strictEqual(calls, 1);
  assert.strictEqual(out.data.currentLocation, '锦苑小区3栋2单元');
  assert.ok(out.data.parseDegraded);
});

test('parseSettlementKv accepts brace-delimited settlement blocks without type marker', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseSettlementKv(`基础结算{
结算状态：需要更新
经过时间：120秒
当前状态：测试状态
当前目标：测试目标
场景标题：测试标题
地点名称：测试地点
备选行动1：一
备选行动2：二
备选行动3：三
备选行动4：四
}`, { requestedTypes: ['基础结算'], participants: [], store: makeStore(), config: loop.realConfig() });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), ['基础结算']);
  assert.strictEqual(parsed.baseFields['当前状态'], '测试状态');
});

test('Stage4 treats brace block as complete when followed by next heading', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1 }, playerFeelings: {}, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const config = loop.realConfig();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  loop.settlementTypeQueue = () => ['基础结算', '情绪'];
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  const rendered = [];
  const outputs = [
    '基础结算{\n经过时间：90\n当前状态：测试状态\n当前目标：测试目标\n场景标题：测试标题\n地点名称：测试地点\n备选行动1：一\n备选行动2：二\n备选行动3：三\n备选行动4：四\n}\n情绪结算{\n无变化\n}',
  ];
  loop.completeConfiguredStep = async (_store, prompt) => {
    rendered.push(JSON.parse(prompt));
    return outputs.shift();
  };

  await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(rendered.length, 1);
  assert.strictEqual(rendered[0].本次必须返回的类型, '基础结算、情绪');
});

test('Stage4 keeps tail brace block incomplete without closing brace', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseSettlementKv(`基础结算{
结算状态：需要更新
经过时间：90
当前状态：测试状态
当前目标：测试目标
场景标题：测试标题
地点名称：测试地点
备选行动1：一
备选行动2：二
备选行动3：三
备选行动4：四
类型完成：是`, { requestedTypes: ['基础结算'], participants: [], store: makeStore(), config: loop.realConfig() });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['基础结算']);
});

test('Stage4 keeps tail block incomplete without settlement end marker or next heading', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const parsed = loop.parseSettlementKv(`基础结算：
结算状态：需要更新
经过时间：90
当前状态：测试状态
当前目标：测试目标
场景标题：测试标题
地点名称：测试地点
备选行动1：一
备选行动2：二
备选行动3：三
备选行动4：四
类型完成：是`, { requestedTypes: ['基础结算'], participants: [], store: makeStore(), config: loop.realConfig() });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['基础结算']);
});

test('Stage4 completed base settlement is removed from retry prompt when later type is incomplete', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1 }, playerFeelings: {}, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const config = loop.realConfig();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  loop.settlementTypeQueue = () => ['基础结算', '情绪'];
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  const rendered = [];
  const longEvidence = '正文确认她紧张'.repeat(150);
  const outputs = [
    `基础结算{\n经过时间：90\n当前状态：测试状态\n当前目标：测试目标\n场景标题：测试标题\n地点名称：测试地点\n备选行动1：一\n备选行动2：二\n备选行动3：三\n备选行动4：四\n}\n情绪结算{\n更新1：刘思琪，紧张，+2，${longEvidence}`,
    '情绪结算{\n无变化\n}',
  ];
  loop.completeConfiguredStep = async (_store, prompt) => {
    rendered.push(JSON.parse(prompt));
    return outputs.shift();
  };

  await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(rendered.length, 2);
  assert.strictEqual(rendered[1].本次必须返回的类型, '情绪');
  assert.strictEqual(rendered[1].已完成类型, '基础结算');
  assert.ok(!rendered[1].类型短规则.includes('备选行动1'), 'completed base short rule should be absent');
  assert.ok(!rendered[1].类型合约.includes('基础结算{'), 'completed base contract should be absent');
  assert.ok(!rendered[1].未完成类型原因.includes('基础结算'), 'completed base retry reason should be absent');
});

test('Stage4 settlement window requests all unfinished types together on first attempt', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  loop.settlementTypeQueue = () => ['基础结算', '情绪', '感觉'];
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  const rendered = [];
  loop.completeConfiguredStep = async (_store, prompt) => {
    rendered.push(JSON.parse(prompt));
    return '基础结算{\n经过时间：90\n当前状态：测试状态\n当前目标：测试目标\n场景标题：测试标题\n地点名称：测试地点\n备选行动1：一\n备选行动2：二\n备选行动3：三\n备选行动4：四\n}\n情绪结算{\n无变化\n}\n感觉结算{\n无变化\n}';
  };

  await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(rendered.length, 1);
  assert.strictEqual(rendered[0].本次必须返回的类型, '基础结算、情绪、感觉');
  assert.ok(rendered[0].类型合约.includes('基础结算{'));
  assert.ok(rendered[0].类型合约.includes('情绪结算{'));
  assert.ok(rendered[0].类型合约.includes('感觉结算{'));
});

test('Stage4 settlement window awaits rendered prompt on real call chain', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  const participants = [{ type: 'player', id: 'player-self', name: '玩家', role: 'actor' }];
  loop.settlementTypeQueue = () => ['基础结算'];
  context.window.GameModules.promptTemplates.render = async () => '渲染完成提示';
  let receivedPrompt = null;
  loop.completeConfiguredStep = async (_store, prompt) => {
    receivedPrompt = prompt;
    assert.strictEqual(typeof prompt, 'string');
    assert.ok(prompt.includes('渲染完成提示'));
    return '基础结算{\n经过时间：90\n当前状态：测试状态\n当前目标：测试目标\n场景标题：测试标题\n地点名称：测试地点\n备选行动1：一\n备选行动2：二\n备选行动3：三\n备选行动4：四\n}';
  };

  const out = await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(receivedPrompt, '渲染完成提示');
  assert.strictEqual(out.elapsedSeconds, 90);
});

test('Stage4 sliding window retries only the incomplete type without raw pollution', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1 }, playerFeelings: { 信任: 1, 警惕: 1 }, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const config = loop.realConfig();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  loop.settlementTypeQueue = () => ['情绪', '感觉'];
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  const rendered = [];
  const longEvidence = '正文确认她紧张'.repeat(150);
  const outputs = [
    `情绪结算{\n更新1：刘思琪，紧张，+2，${longEvidence}\n}\n感觉结算{\n更新1：刘思琪，警惕，+1`,
    '感觉结算{\n更新1：刘思琪，信任，+2，正文确认她放松\n}',
  ];
  loop.completeConfiguredStep = async (_store, prompt) => {
    rendered.push(JSON.parse(prompt));
    return outputs.shift();
  };

  const out = await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(JSON.stringify(rendered[1].本次必须返回的类型), JSON.stringify('感觉'));
  assert.strictEqual(rendered[1].未完成类型, '感觉');
  assert.ok(rendered[1].未完成类型原因.includes('感觉：'));
  assert.ok(rendered[1].未完成类型原因.includes('需从“感觉结算{”开始整块重输'));
  assert.ok(!rendered[1].未完成类型原因.includes('更新1：感觉，警惕，+1'));
  assert.ok(!rendered[1].未完成类型原因.includes(longEvidence));
  assert.ok(!rendered[1].未完成类型原因.includes('情绪：'));
  assert.strictEqual(out.genericUpdates.length, 2);
});

test('stageParticipants promotes character entries that match existing role cards', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const trace = [{
    characters: [
      { id: 'player-self', name: '玩家本人' },
      { id: '刘思琪', name: '刘思琪' },
      { id: '不存在的人', name: '不存在的人' },
    ],
    participants: [],
  }];

  const participants = loop.stageParticipants(trace, [], store);

  assert.strictEqual(JSON.stringify(participants.map(({ type, id, name, role }) => ({ type, id, name, role }))), JSON.stringify([
    { type: 'player', id: 'player-self', name: '玩家本人', role: 'actor' },
    { type: 'character', id: 'rushiqi', name: '刘思琪', role: 'character-role-card' },
  ]));
});

test('stageParticipants promotes character entries found by sqliteSave name lookup', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), rpgStates: {}, itemSkillState: () => null };
  store.sqliteSave = {
    getCharacterStateByName(name) {
      return name === '刘思琪' ? store.__npc : null;
    },
  };

  const participants = loop.stageParticipants([{ characters: [{ id: '刘思琪', name: '刘思琪' }], participants: [] }], [], store);

  assert.strictEqual(JSON.stringify(participants.map(({ type, id, name, role }) => ({ type, id, name, role }))), JSON.stringify([
    { type: 'character', id: 'rushiqi', name: '刘思琪', role: 'character-role-card' },
    { type: 'player', id: 'player-self', name: '玩家', role: 'actor' },
  ]));
});

test('stageParticipants always includes the current player without AI judgment', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } };

  const participants = loop.stageParticipants([], [], store);

  assert.ok(participants.some((item) => item.type === 'player' && item.id === 'player-self' && item.name === '刘悠'));
});



test('stageParticipants accepts effective layers and excludes priority drama and random candidates from settlement seed', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } };
  const effectiveLayers = {
    forcedParticipants: [{ name: '刘思琪', role: 'forced', canSettle: true }],
    priorityCandidates: [{ name: '刘思瑶', role: 'priority-candidate', canSettle: false }],
    dramaCandidates: [{ name: '刘思怡', role: 'drama-candidate', canSettle: false }],
    forbiddenParticipants: [{ name: '王主管', role: 'forbidden', canSettle: false }],
    randomActiveEvents: [{ characterName: '路人甲', eventType: 'background_only' }],
  };

  const participants = loop.stageParticipants(effectiveLayers, [], store);

  assert.ok(participants.some((item) => item.type === 'player' && item.id === 'player-self' && item.name === '刘悠'));
  assert.ok(participants.some((item) => item.name === '刘思琪'));
  assert.ok(!participants.some((item) => item.name === '刘思瑶'));
  assert.ok(!participants.some((item) => item.name === '刘思怡'));
  assert.ok(!participants.some((item) => item.name === '王主管'));
  assert.ok(!participants.some((item) => item.name === '路人甲'));
});
test('generateConfiguredFinal merges narration-mentioned participants before Stage4 settlement', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } };
  let settlementParticipants = [];
  loop.buildConfiguredSceneAnchorPrompt = async () => 'scene anchor prompt';
  loop.completeSceneAnchorReport = async () => ({ raw: 'anchor raw', text: 'anchor text', data: { text: 'anchor text' } });
  loop.buildConfiguredNarrationPrompt = async () => 'narration prompt';
  loop.completeConfiguredStep = async () => '你来到刘思琪房门前，刘思琪在门内回应。';
  loop.ensureConfiguredNarrationLength = async (_store, _action, _prompt, narration) => narration;
  loop.showConfiguredNarration = () => {};
  loop.completeConfiguredSettlementKvWindow = async ({ participants }) => {
    settlementParticipants = participants;
    return { type: 'final', genericUpdates: [] };
  };

  await loop.generateConfiguredFinal({ store, action: '我前往刘思琪房间', base: '', loaded: [], skills: '', trace: [], materialSession: null, logId: null, config: loop.realConfig() });

  assert.ok(settlementParticipants.some((item) => item.type === 'player' && item.id === 'player-self' && item.name === '刘悠'));
  assert.ok(settlementParticipants.some((item) => item.type === 'character' && item.id === 'rushiqi' && item.name === '刘思琪'));
});

test('parseStep treats continue-without-actionable-requests as done when only empty query reasons exist', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;

  const data = loop.parseStep('资料状态：继续请求资料\n查询规划：\n地点查询理由：已知地点，无需进一步查询\n因果查询理由：无\n冲突查询理由：无\n强制出场：\n高优先候选：\n戏剧候选：\n禁止出场：\n随机事件候选：\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求：无\n资料请求结束：是', loop.realConfig());

  assert.strictEqual(data.type, 'context_done');
  assert.strictEqual(JSON.stringify(data.sceneQueries.location), JSON.stringify([]));
});

test('completeConfiguredParsedStep accepts query-reason handoff without semantic retry', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const prompts = [];
  const outputs = [
    '查询规划：保留理由进入锚定\n资料状态：继续请求资料\n地点查询理由1：确认门口边界\n因果查询理由1：无\n冲突查询理由1：无\n强制出场：无\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件候选：无\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求：无\n资料请求结束：是',
  ];
  loop.completeConfiguredStep = async (_store, prompt) => {
    prompts.push(prompt);
    return outputs.shift();
  };

  const out = await loop.completeConfiguredParsedStep(makeStore(), '原始 prompt', null, false, false, loop.realConfig());

  assert.strictEqual(out.data.type, 'request_context');
  assert.strictEqual(prompts.length, 1);
  assert.ok(out.data.sceneQueries.location.includes('确认门口边界'));
});

test('parseStep derives mapped material requests and keeps missingContext boolean', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const data = loop.parseStep(`查询规划：需要角色和地点资料
资料状态：继续请求资料
强制出场：刘思琪
禁止出场：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界
资料请求2：地点查询，查询附近地点，测试地点
资料请求结束：是`, loop.realConfig());
  const done = loop.parseStep(`查询规划：资料足够
资料状态：资料已足够
强制出场：刘思琪
禁止出场：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无
资料请求结束：是`, loop.realConfig());
  const traced = loop.traceItem(1, data, '查询规划：需要角色和地点资料', context.window.GameModules.realWorldAgentContext);

  assert.strictEqual(JSON.stringify(data.requests.map((item) => item.method)), JSON.stringify(['searchCharacterProfile', 'getNearbyLocations']));
  assert.strictEqual(data.missingContext, true);
  assert.strictEqual(done.type, 'context_done');
  assert.strictEqual(done.missingContext, false);
  assert.strictEqual(traced.missingContext, true);
});

test('completeConfiguredParsedStep retries K:V parse and accepts merged successful fields', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const outputs = [
    '查询规划：先锁定强制出场\n强制出场：刘思琪',
    '查询规划：补齐边界\n资料状态：继续请求资料\n禁止出场：王主管\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求结束：是',
  ];
  loop.completeConfiguredStep = async () => outputs.shift();

  const out = await loop.completeConfiguredParsedStep(makeStore(), '原始 prompt', null, false, false, loop.realConfig());

  assert.strictEqual(out.data.type, 'request_context');
  assert.strictEqual(JSON.stringify(out.data.participants.map((item) => item.name)), JSON.stringify(['刘思琪']));
  assert.strictEqual(JSON.stringify(out.data.forbiddenParticipants.map((item) => item.name)), JSON.stringify(['王主管']));
  assert.ok(out.data.parseScore.successRate >= 0.8);
});

test('completeConfiguredParsedStep carries successful K:V values into retry and preserves first values', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const prompts = [];
  const outputs = [
    '查询规划：首次判断\n资料状态：继续请求资料\n强制出场：刘思琪\n高优先候选：刘思瑶\n随机事件闯入条件：无明确条件则禁止闯入',
    '查询规划：补齐字段但误改已有值\n资料状态：继续请求资料\n强制出场：刘悠\n高优先候选：无\n禁止出场：无\n随机事件闯入条件：无明确自然闯入条件则禁止闯入\n资料请求：1\n资料请求1：地点查询，查询附近地点，锦苑小区3栋2单元\n资料请求结束：是',
  ];
  loop.completeConfiguredStep = async (_store, prompt) => {
    prompts.push(prompt);
    return outputs.shift();
  };

  const out = await loop.completeConfiguredParsedStep(makeStore(), '原始 prompt', null, false, false, loop.realConfig());

  assert.ok(prompts[1].includes('强制出场：刘思琪'));
  assert.ok(prompts[1].includes('高优先候选：刘思瑶'));
  assert.strictEqual(JSON.stringify(out.data.forcedParticipants.map((item) => item.name)), JSON.stringify(['刘思琪']));
  assert.strictEqual(JSON.stringify(out.data.priorityCandidates.map((item) => item.name)), JSON.stringify(['刘思瑶']));
  assert.strictEqual(out.data.randomIntrusionCondition, '无明确条件则禁止闯入');
});

test('loadStepContext derives requests from needed when requests is empty', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const seen = [];
  const ctx = {
    autoLoadForStep: async () => [],
    loadRequests: async (_store, _action, requests) => {
      seen.push(...requests);
      return requests.map((item) => ({ title: item, text: `loaded:${item}` }));
    },
  };

  const out = await loop.loadStepContext(ctx, makeStore(), '观察', {
    type: 'request_context',
    requests: [],
    needed: ['character:刘思琪', 'location:测试地点'],
  }, new Set(), [], new Set(), 1, null, null);

  assert.strictEqual(JSON.stringify(seen), JSON.stringify(['character:刘思琪', 'location:测试地点']));
  assert.strictEqual(JSON.stringify(out.map((item) => item.title)), JSON.stringify(['character:刘思琪', 'location:测试地点']));
});

test('loadStepContext loads role cards from parsed participant candidates with reasons', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/real-world-map.js');
  loadScript(context, 'publish/character-query.js');
  context.window.GameModules.realWorld2026 = { label: '2026现代都市现实世界' };
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const data = loop.parseStep(`查询规划：确认人物与地点
资料状态：继续请求资料
地点查询：
地点查询理由：确认刘思琪房间位置
因果查询：
因果查询理由：确认深夜前往原因
冲突查询：
冲突查询理由：确认潜在冲突
强制出场：刘思琪 - 她是本次行动目标
高优先候选：刘思瑶 - 同住相邻空间
戏剧候选：刘思怡 - 同住相邻空间
禁止出场：父母 - 已故
随机事件候选：
随机事件闯入条件：无明确条件则禁止闯入
资料请求：无
资料请求结束：是`, loop.realConfig());

  const out = await loop.loadStepContext(context.window.GameModules.realWorldAgentContext, store, '我前往刘思琪的房间', data, new Set(), [], new Set(), 1, null, context.window.GameModules.realWorldMaterials);
  const text = out.map((item) => item.text).join('\n');

  assert.ok(text.includes('资料类型：完整角色卡'));
  assert.ok(text.includes('姓名：刘思琪'));
  assert.ok(!text.includes('未找到角色资料：刘思琪 -'));
});

test('loadStepContext loads Top3 profiles, scene anchors, then mapped material requests', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const calls = [];
  const ctx = {
    autoLoadForStep: async () => [],
    participantProfileRequests: () => [{ skill: 'character.query', method: 'searchCharacterProfile', params: { name: '刘思琪' } }],
    sceneAnchorRequests: () => [{ skill: 'realworld.location.query', method: 'getCurrentLocationContext', params: {} }],
    loadRequests: async (_store, _action, requests, _loadedKeys, _session, _materials, _memoryIds, _loaded, _current, options) => { calls.push({ requests, limit: options?.limit }); return requests.map((item) => ({ title: `${item.skill}.${item.method}`, text: 'loaded' })); },
  };
  const out = await loop.loadStepContext(ctx, makeStore(), '观察', { type: 'request_context', requests: [{ skill: 'memory.query', method: 'searchCharacterMemoryWindow', params: { keyword: '旧请求' } }], forcedParticipants: [{ name: '刘思琪' }], sceneQueries: { location: ['门口'] } }, new Set(), [], new Set(), 1, null, null);
  assert.strictEqual(JSON.stringify(calls.map((item) => item.limit)), JSON.stringify([3, 4, 2]));
  assert.strictEqual(out.length, 3);
});

test('real context builds Top3 participant profile requests and excludes forbidden names', () => {
  const context = createContext();
  loadCore(context);
  context.window.GameModules.realWorld2026 = { label: '2026现代都市现实世界' };
  const ctx = context.window.GameModules.realWorldAgentContext;
  const requests = ctx.participantProfileRequests({
    forcedParticipants: [{ name: '刘思琪' }, { name: '刘思怡' }],
    priorityCandidates: [{ name: '王主管' }],
    dramaCandidates: [{ name: '路人甲' }],
    forbiddenParticipants: [{ name: '王主管' }],
  });
  assert.strictEqual(JSON.stringify(requests.map((item) => item.params.name)), JSON.stringify(['刘思琪', '刘思怡', '路人甲']));
});

test('real randomActiveEventCandidates excludes forced priority drama and forbidden names', () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();
  store.rpgStates = {
    a: { id: 'a', profile: { name: '刘思琪' } },
    b: { id: 'b', profile: { name: '刘思怡' } },
    c: { id: 'c', profile: { name: '王主管' } },
    d: { id: 'd', profile: { name: '路人甲' } },
  };

  const random = ctx.randomActiveEventCandidates(store, '观察门口', {
    forcedParticipants: [{ name: '刘思琪' }],
    priorityCandidates: [{ name: '刘思怡' }],
    dramaCandidates: [{ name: '王主管' }],
    forbiddenParticipants: [{ name: '路人甲' }],
  });

  assert.strictEqual(JSON.stringify(random.map((item) => item.name)), JSON.stringify([]));
});

test('auto-loaded character cards carry structured participants for Stage 3', async () => {
  const context = createContext();
  loadCore(context);
  context.window.GameModules.realWorld2026 = { label: '2026 现代都市现实世界' };
  context.window.GameModules.characterQuery = {
    worldMatches: () => true,
    stateText: () => '资料类型：完整角色卡',
  };
  const store = makeStore();
  const out = await context.window.GameModules.realWorldAgentContext.autoLoadForStep(store, '我前往妹妹刘思琪的房间', new Set(), null, null, new Set(), 1, [], []);

  assert.strictEqual(out.length, 1);
  assert.strictEqual(JSON.stringify(out[0].participants), JSON.stringify([{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'loaded-role-card' }]));
});

test('harness loads core modules', () => {
  const context = createContext();
  loadCore(context);
  assert.ok(context.window.GameModules.realWorldAgentLoop);
  assert.ok(context.window.GameModules.updateRegistry);
});

test('legacy Stage3 JSON settlement methods are removed from inference loop', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  [
    'buildConfiguredStage3BasePrompt',
    'completeConfiguredStage3Base',
    'buildGroupedUpdateJsonPrompt',
    'completeGroupedStage3Updates',
    'buildConfiguredSkillSelectionPrompt',
    'completeConfiguredSkillSelection',
  ].forEach((name) => {
    assert.strictEqual(loop[name], undefined, `${name} should be removed`);
  });
});

test('sexual-experience prompt clarifies per-target participant rules', () => {
  const context = createContext();
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/prompts/推演引擎/update/sexual-experience-update-prompt.js');
  const body = context.window.GameModules.updateRegistry.prompts['sexual-experience-update'];
  assert.ok(body.includes('结算对象永远表示这条性经历记录写入谁的角色卡。'));
  assert.ok(body.includes('同一亲密/性事件若玩家与角色双方都参与，则玩家一条，对方角色一条。'));
  assert.ok(body.includes('多人参与时，每个 Stage1 参与者清单和 Stage2 正文明确确认参与的人各自一条。'));
  assert.ok(body.includes('禁止根据 skill 名称凭空猜对象；参与者只能来自本回合参与者清单和正文明确事实。'));
  assert.ok(body.includes('如果只是接触、摩擦、亲吻，不得升级为插入、高潮或性交记录。'));
  assert.ok(!body.includes('subject 永远表示'));
  assert.ok(!body.includes('sexual-experience：'));
});

test('sexual-experience prompt stays abstract and non-process', () => {
  const context = createContext();
  loadScript(context, 'publish/update/update-registry.js');
  loadScript(context, 'publish/prompts/推演引擎/update/sexual-experience-update-prompt.js');
  const body = context.window.GameModules.updateRegistry.prompts['sexual-experience-update'];
  assert.ok(body.includes('只记录总数与分类次数，不记录过程'));
  assert.ok(!body.includes('露骨'));
  assert.ok(!body.includes('对未成年'));
  assert.ok(!body.includes('详述'));
});

test('parseSettlementKv saves complete types and leaves incomplete types for retry', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1 }, playerFeelings: { 警惕: 1 }, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`情绪结算{
更新1：刘思琪，紧张，+2，颈饰被突然拉扯
}
感觉结算{
更新1：刘思琪，警惕，+1`, { requestedTypes: ['情绪', '感觉'], participants, store, config: loop.realConfig() });
  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['情绪']));
  assert.strictEqual(JSON.stringify(parsed.incompleteTypes), JSON.stringify(['感觉']));
  assert.strictEqual(parsed.patchesByType['情绪'].genericUpdates.length, 1);
});

test('parseSettlementKv selects the most complete duplicate settlement type block', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1, 困惑: 1 }, playerFeelings: {}, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`情绪结算{
更新1：刘思琪，紧张，+2
}
情绪结算{
更新1：刘思琪，紧张，+2，颈饰被突然拉扯
更新2：刘思琪，困惑，+1，门口回应让她产生迟疑
}`, { requestedTypes: ['情绪'], participants, store, config: loop.realConfig() });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), ['情绪']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.patchesByType['情绪'].genericUpdates.map((item) => item.field))), ['metrics.emotions.紧张', 'metrics.emotions.困惑']);
});

test('parseSettlementKv rejects short settlement type headings from model output', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1 }, playerFeelings: {}, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`情绪：
结算状态：需要更新
结算对象：刘思琪｜角色｜允许结算
更新1：情绪，紧张，+2，正文确认她因为门口动静紧张
结算对象结束：刘思琪
类型完成：是
结算结束：是`, { requestedTypes: ['情绪'], participants, store, config: loop.realConfig() });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['情绪']);
});

test('settlementTypeQueue includes character schedule after map settlement', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const queue = loop.settlementTypeQueue(loop.realConfig());

  assert.ok(queue.includes('人事安排'));
  assert.ok(queue.indexOf('人事安排') > queue.indexOf('地图'));
  assert.ok(queue.indexOf('人事安排') < queue.indexOf('势力总览'));
});

test('parseSettlementKv parses character schedule updates', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = `人事安排结算{
结算对象：刘思琪｜角色｜允许结算
更新1：人事安排，当前地点，刘思琪房间，正文确认刘思琪仍在房间内互动
更新2：人事安排，当前行动，和玩家交谈，正文明确发生对话互动
更新3：人事安排，可用状态，在场，正文确认其可参与当前场景
}`;

  const parsed = loop.parseSettlementKv(raw, {
    requestedTypes: ['人事安排'],
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: '参与者' }],
    store: makeStore(),
    config: loop.realConfig(),
  });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), ['人事安排']);
  assert.strictEqual(parsed.incompleteTypes.length, 0);
  assert.strictEqual(parsed.genericUpdates.length, 3);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.genericUpdates.map((item) => item.updateType))), ['character-schedule', 'character-schedule', 'character-schedule']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.genericUpdates.map((item) => item.change.value))), [
    { currentLocation: '刘思琪房间', reason: '正文确认刘思琪仍在房间内互动' },
    { currentAction: '和玩家交谈', reason: '正文明确发生对话互动' },
    { availability: '在场', reason: '正文确认其可参与当前场景' },
  ]);
});

test('parseSettlementKv rejects character schedule updates for non-participants even if text says communication or movement', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = `人事安排结算{
结算对象：刘思瑶｜角色｜允许结算
更新1：人事安排，当前地点，客厅，正文明确通信约定她移动到客厅，但她未进入 participants，仍不应被结算
}`;

  const parsed = loop.parseSettlementKv(raw, {
    requestedTypes: ['人事安排'],
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: '参与者' }],
    store: makeStore(),
    config: loop.realConfig(),
  });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['人事安排']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.genericUpdates)), []);
});

test('parseSettlementKv rejects character schedule updates for non-character settlement objects', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = `人事安排结算{
结算对象：锦苑小区｜地点｜允许结算
更新1：人事安排，当前地点，锦苑小区门口，正文提到地点变化但地点不是角色日程对象
}`;

  const parsed = loop.parseSettlementKv(raw, {
    requestedTypes: ['人事安排'],
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: '参与者' }],
    store: makeStore(),
    config: loop.realConfig(),
  });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['人事安排']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.genericUpdates)), []);
});

test('parseSettlementKv rejects character schedule updates when participant name is declared as a non-character object', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const raw = `人事安排结算{
结算对象：刘思琪｜地点｜允许结算
更新1：人事安排，当前地点，客厅，正文提到刘思琪但对象类型被错误标为地点
}`;

  const parsed = loop.parseSettlementKv(raw, {
    requestedTypes: ['人事安排'],
    participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: '参与者' }],
    store: makeStore(),
    config: loop.realConfig(),
  });

  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.completeTypes)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.incompleteTypes)), ['人事安排']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(parsed.genericUpdates)), []);
});

test('parseSettlementKv leaves malformed update types incomplete even with completion markers', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1 }, playerFeelings: {}, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`情绪结算{
更新1：刘思琪，紧张
}`, { requestedTypes: ['情绪'], participants, store, config: loop.realConfig() });
  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify([]));
  assert.strictEqual(JSON.stringify(parsed.incompleteTypes), JSON.stringify(['情绪']));
});

test('parseSettlementKv keeps unknown standard labels incomplete instead of generic fallback', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1 }, playerFeelings: {}, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`情绪结算{
更新1：情绪变化，紧张，+1，正文确认她因为门口动作紧张
}`, { requestedTypes: ['情绪'], participants, store, config: loop.realConfig() });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify([]));
  assert.strictEqual(JSON.stringify(parsed.incompleteTypes), JSON.stringify(['情绪']));
  assert.strictEqual(parsed.genericUpdates.length, 0);
});

test('mergeGroupedUpdatePatches maps Stage4 baseFields into final route fields', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const merged = loop.mergeGroupedUpdatePatches([{ baseFields: { '经过时间': '90', '当前状态': '门口僵持', '当前目标': '确认反应', '场景标题': '门口拉扯', '地点名称': '刘思琪房间门口', '备选行动1': '松手', '备选行动2': '询问', '备选行动3': '后退', '备选行动4': '观察' }, genericUpdates: [] }], {});
  assert.strictEqual(merged.elapsedSeconds, 90);
  assert.strictEqual(merged.status, '门口僵持');
  assert.strictEqual(merged.quest, '确认反应');
  assert.strictEqual(merged.sceneTitle, '门口拉扯');
  assert.strictEqual(merged.locationName, '刘思琪房间门口');
  assert.strictEqual(JSON.stringify(merged.choices), JSON.stringify(['松手', '询问', '后退', '观察']));
});

test('parseSettlementKv preserves unknown stable facts as generic solidification', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`角色卡结算{
结算对象：刘思琪｜角色｜允许结算
更新1：未知稳定事实，门口距离，保持半步距离，正文确认她后退半步观察
}`, { requestedTypes: ['角色卡'], participants, store, config: loop.realConfig() });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['角色卡']));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'generic' && item.field === 'status_tags.门口距离'));
});

test('parseSettlementKv keeps malformed special update incomplete instead of generic fallback', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`关系结算{
结算对象：刘思琪｜角色｜允许结算
更新1：关系变化，刘悠，刘思琪，动作越界
}`, { requestedTypes: ['关系'], participants, store, config: loop.realConfig() });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify([]));
  assert.strictEqual(JSON.stringify(parsed.incompleteTypes), JSON.stringify(['关系']));
});

test('parseSettlementKv handles sexual history relationship and role-card special formats', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`性历史结算{
结算对象：刘思琪｜角色｜允许结算
更新1：性历史，亲密身份状态变化，刘悠，正文明确确认关系进入新的稳定亲密阶段
}
关系结算{
结算对象：刘思琪｜角色｜允许结算
更新1：关系，刘悠(兄)，刘思琪(妹妹)，信任边界，轻微受损，动作越过舒适距离，关系短暂紧张
}
角色卡结算{
结算对象：刘思琪｜角色｜允许结算
更新1：角色卡，性格，增加，边界感更强，面对越界动作紧张防备，偏向退缩
}`, { requestedTypes: ['性历史', '关系', '角色卡'], participants, store, config: loop.realConfig() });
  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['性历史', '关系', '角色卡']));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'sexual-history'));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'relationship'));
  assert.ok(parsed.genericUpdates.some((item) => item.updateType === 'role-card'));
});

test('wearing-state update writes values and mirrors profile wearing', async () => {
  const context = createContext();
  loadCore(context);
  assert.ok(context.window.GameModules.updateRegistry.types.some((type) => type.id === 'wearing-state'));
  const store = makeStore();
  const update = {
    updateType: 'wearing-state',
    subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
    field: 'values.wearing',
    change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开，胸部外露' }] },
    reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认胸罩被推开但未脱下', confidence: 'confirmed' }],
  };
  await context.window.GameModules.updateRegistry.applyGeneric(store, [update]);
  assert.strictEqual(store.__npc.values.wearing[0].state, '仍穿着但被推开，胸部外露');
  assert.strictEqual(store.__npc.profile.wearingItems[0].state, '仍穿着但被推开，胸部外露');
  assert.strictEqual(store.__npc.profile.wearing[0].state, '仍穿着但被推开，胸部外露');
});

test('Stage4 wearing settlement maps aliases and preserves unknown ornament slots', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`穿着状态结算{
结算对象：刘思琪｜角色｜允许结算
更新1：穿着状态，胸部，胸罩，肩带滑落，正文确认肩带滑落
更新2：穿着状态，大腿根部，腿圈，仍贴在腿根，正文确认腿圈仍在
}`, { requestedTypes: ['穿着状态'], participants, store, config: loop.realConfig() });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['穿着状态']));
  await context.window.GameModules.updateRegistry.applyGeneric(store, parsed.genericUpdates);
  assert.ok(store.__npc.values.wearing.some((item) => item.slot === 'bra' && item.name === '胸罩' && item.state === '肩带滑落'));
  assert.ok(store.__npc.values.wearing.some((item) => item.slot === '饰品' && item.name === '腿圈' && item.state === '仍贴在腿根'));
});

test('Stage4 body-status settlement maps aliases and preserves unknown parts', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`身体状态结算{
结算对象：刘思琪｜角色｜允许结算
更新1：身体状态，胸口，发闷，正文确认她呼吸急促
更新2：身体状态，胳肢窝，通红，正文确认摩擦发红
}`, { requestedTypes: ['身体状态'], participants, store, config: loop.realConfig() });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['身体状态']));
  await context.window.GameModules.updateRegistry.applyGeneric(store, parsed.genericUpdates);
  assert.strictEqual(store.__npc.values.bodyStatus.chest.part, '胸部');
  assert.strictEqual(store.__npc.values.bodyStatus.chest.status, '发闷');
  assert.strictEqual(store.__npc.values.bodyStatus['胳肢窝'].part, '胳肢窝');
  assert.strictEqual(store.__npc.values.bodyStatus['胳肢窝'].status, '通红');
});

test('Stage4 sexual-experience settlement maps aliases and preserves unknown categories', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  const parsed = loop.parseSettlementKv(`性经历结算{
结算对象：刘思琪｜角色｜允许结算
更新1：性经历，胸部，+1，稳定事实确认胸部相关抽象次数
更新2：性经历，耳垂，+1，稳定事实确认耳垂相关抽象次数
更新3：性经历，总次数，+9，应被忽略的总数写入
}`, { requestedTypes: ['性经历'], participants, store, config: loop.realConfig() });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['性经历']));
  await context.window.GameModules.updateRegistry.applyGeneric(store, parsed.genericUpdates);
  assert.strictEqual(store.__npc.values.intimacy.sexualExperienceParts.chest, 1);
  assert.strictEqual(store.__npc.values.intimacy.sexualExperienceParts['耳垂'], 1);
  assert.strictEqual(store.__npc.values.intimacy.sexualExperienceCount, 2);
});

test('character-schedule update merges into store schedules without touching role card values', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  store.phoneDateText = () => '2026-07-01';
  store.phoneTimeText = () => '02:10';
  store.characterSchedules = {
    rushiqi: {
      characterId: 'rushiqi',
      characterName: '刘思琪',
      currentLocation: '刘思琪房间',
      currentAction: '写作业',
      availability: '在场',
      confidence: '默认',
      source: '角色卡初始化',
      stability: '默认稳定',
      updatedAt: '2026-07-01 01:20',
      reason: '初始化',
    },
    siyao: { characterId: 'siyao', characterName: '刘思瑶', currentLocation: '客厅', currentAction: '看书' },
  };

  await context.window.GameModules.updateRegistry.applyGeneric(store, [{
    updateType: 'character-schedule',
    subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
    field: 'characterSchedules',
    change: { mode: 'merge', value: { currentAction: '和玩家交谈', availability: '在场', reason: '正文确认交谈' } },
    reasons: [{ trigger: '人事安排当前行动', evidence: '正文确认交谈', confidence: 'confirmed' }],
  }]);

  assert.deepStrictEqual(JSON.parse(JSON.stringify(store.characterSchedules.rushiqi)), {
    characterId: 'rushiqi',
    characterName: '刘思琪',
    currentLocation: '刘思琪房间',
    currentAction: '和玩家交谈',
    availability: '在场',
    confidence: '确认',
    source: '结算事件',
    stability: '事件锁定',
    updatedAt: '2026-07-01 02:10',
    reason: '正文确认交谈',
  });
  assert.strictEqual(store.characterSchedules.siyao.currentAction, '看书');
  assert.strictEqual(store.__npc.values.characterSchedules, undefined);
});

test('character-schedule update normalizes stale availability and protects identity fields', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  store.phoneDateText = () => '2026-07-01';
  store.phoneTimeText = () => '02:20';
  store.characterSchedules = {
    rushiqi: {
      characterId: 'rushiqi',
      characterName: '刘思琪',
      currentLocation: '刘思琪房间',
      currentAction: '写作业',
      availability: '离开',
    },
  };

  await context.window.GameModules.updateRegistry.applyGeneric(store, [{
    updateType: 'character-schedule',
    subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
    field: 'characterSchedules',
    change: { mode: 'merge', value: { characterId: 'other-id', characterName: '错误角色', currentAction: '和玩家交谈', reason: '正文确认交谈' } },
    reasons: [{ trigger: '人事安排当前行动', evidence: '正文确认交谈', confidence: 'confirmed' }],
  }]);

  assert.strictEqual(store.characterSchedules.rushiqi.characterId, 'rushiqi');
  assert.strictEqual(store.characterSchedules.rushiqi.characterName, '刘思琪');
  assert.strictEqual(store.characterSchedules.rushiqi.availability, '未知');
  assert.strictEqual(store.characterSchedules.rushiqi.currentAction, '和玩家交谈');
  assert.strictEqual(store.characterSchedules.rushiqi.updatedAt, '2026-07-01 02:20');
});

test('sexual-history supports unknown to virgin to non-virgin facts', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  const updates = [
    {
      updateType: 'sexual-history',
      subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
      field: 'intimacy.sexualHistory',
      change: { mode: 'merge', value: { virginityStatus: '处女', virginityEvidence: '正文确认此前无既往阴道性交历史' } },
      reasons: [{ trigger: '此前处女事实确认', evidence: '正文明确建立此前处女事实', confidence: 'confirmed' }],
    },
    {
      updateType: 'sexual-history',
      subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
      field: 'intimacy.sexualHistory',
      change: { mode: 'merge', value: { virginityStatus: '非处女', firstVaginalPartner: { type: 'player', id: 'player-self', name: '玩家' }, firstVaginalAt: '当前回合', firstVaginalEvidence: '正文确认首次事实' } },
      reasons: [{ trigger: '首次事实确认', evidence: '正文确认首次阴道插入或处女膜破裂', confidence: 'confirmed' }],
    },
  ];
  await context.window.GameModules.updateRegistry.applyGeneric(store, updates);
  assert.strictEqual(store.__npc.values.intimacy.sexualHistory.virginityStatus, '非处女');
  assert.strictEqual(store.__npc.values.intimacy.sexualHistory.firstVaginalPartner.id, 'player-self');
  assert.strictEqual(store.__npc.values.intimacy.sexualStatus, '非处女');
  assert.strictEqual(store.__npc.values.intimacy.sexualPartnerCount, 1);
  assert.strictEqual(String(store.__npc.values.intimacy.sexualPartners[0]?.name || store.__npc.values.intimacy.sexualPartners[0] || ''), '玩家');
});

test('sexualPartners list auto syncs sexualPartnerCount and ignores manual count', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  await context.window.GameModules.updateRegistry.applyGeneric(store, [
    {
      updateType: 'sexual-history',
      subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
      field: 'intimacy.sexualPartners',
      change: { mode: 'append', value: ['刘悠', '刘悠'] },
      reasons: [{ trigger: '经历对象确认', evidence: '正文确认', confidence: 'confirmed' }],
    },
    {
      updateType: 'sexual-history',
      subject: { type: 'character', id: 'rushiqi', name: '刘思琪' },
      field: 'intimacy.sexualPartnerCount',
      change: { mode: 'set', value: 99 },
      reasons: [{ trigger: '错误人数', evidence: '应被忽略', confidence: 'confirmed' }],
    },
  ]);
  assert.strictEqual(store.__npc.values.intimacy.sexualPartners.length, 1);
  assert.strictEqual(String(store.__npc.values.intimacy.sexualPartners[0]), '刘悠');
  assert.strictEqual(store.__npc.values.intimacy.sexualPartnerCount, 1);
});

test('sexual-history records defloweredPartners on the other subject', async () => {
  const context = createContext();
  loadCore(context);
  const store = makeStore();
  await context.window.GameModules.updateRegistry.applyGeneric(store, [{
    updateType: 'sexual-history',
    subject: { type: 'player', id: 'player-self', name: '玩家' },
    field: 'intimacy.sexualHistory.defloweredPartners',
    change: { mode: 'append', value: { type: 'character', id: 'rushiqi', name: '刘思琪', at: '当前回合' } },
    reasons: [{ trigger: '成为对方首次对象', evidence: '正文确认', confidence: 'confirmed' }],
  }]);
  assert.strictEqual(store.__player.values.intimacy.sexualHistory.defloweredPartners[0].id, 'rushiqi');
});

test('generateConfiguredFinal derives display route only from Stage4 base settlement', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    assert.ok(!cfg?.sourceTitle?.includes('阶段3A'), 'Stage3A JSON route must not run');
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只写当前场景影响对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n当前场景影响对象：只包含当前场景内实际可能被当前行动影响的对象。';
    if (streamToUi) return '正文确认刘思琪紧张。';
    return '';
  };
  loop.completeConfiguredSettlementKvWindow = async () => ({
    elapsedSeconds: 120,
    status: 'Stage4状态',
    quest: 'Stage4目标',
    choices: ['一', '二', '三', '四'],
    sceneTitle: 'Stage4标题',
    locationName: 'Stage4地点',
    genericUpdates: [],
  });

  const out = await loop.generateConfiguredFinal({ store, action: '行动', base: '基础', loaded: [], skills: '', trace: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'direct-target' }] }], materialSession: null, logId: null, config });

  assert.strictEqual(out.result.elapsedSeconds, 120);
  assert.strictEqual(out.result.status, 'Stage4状态');
  assert.strictEqual(out.result.quest, 'Stage4目标');
  assert.strictEqual(out.result.sceneTitle, 'Stage4标题');
  assert.strictEqual(out.result.locationName, 'Stage4地点');
  assert.deepStrictEqual(out.result.choices, ['一', '二', '三', '四']);
});

test('generateConfiguredFinal merges base fields with Stage4 sliding patch', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = {
    buildLoadedText: () => '',
    limit: (text) => String(text || ''),
  };
  let slidingCalls = 0;
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只写当前场景影响对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n当前场景影响对象：只包含当前场景内实际可能被当前行动影响的对象。';
    if (streamToUi) return '你完成了本次行动范围内的直接动作，对方作出即时反应。';
    assert.ok(!cfg?.sourceTitle?.includes('阶段3A'), 'Stage3A JSON base route must not be called');
    return '';
  };
  loop.completeConfiguredSettlementKvWindow = async () => {
    slidingCalls += 1;
    return { type: 'final', elapsedSeconds: 180, status: '测试状态', quest: '测试目标', choices: ['一', '二', '三', '四'], sceneTitle: '测试标题', locationName: '测试地点', genericUpdates: [{ updateType: 'wearing-state', subject: { type: 'character', id: 'rushiqi', name: '刘思琪' }, field: 'values.wearing', change: { mode: 'set', value: [{ slot: 'bra', name: '胸罩', state: '仍穿着但被推开' }] }, reasons: [{ trigger: '衣物局部状态变化', evidence: '正文确认', confidence: 'confirmed' }] }] };
  };
  const out = await loop.generateConfiguredFinal({ store, action: '行动', base: '基础', loaded: [], skills: '', trace: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'direct-target' }] }], materialSession: null, logId: null, config });
  assert.strictEqual(out.result.elapsedSeconds, 180);
  assert.strictEqual(out.result.status, '测试状态');
  assert.strictEqual(out.result.genericUpdates.length, 1);
  assert.strictEqual(slidingCalls, 1);
});

test('generateConfiguredFinal uses Stage4 sliding settlement and skips legacy grouped path when sliding succeeds', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };
  let slidingCalls = 0;
  let legacyCalls = 0;
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只写当前场景影响对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n当前场景影响对象：只包含当前场景内实际可能被当前行动影响的对象。';
    if (streamToUi) return '正文确认刘思琪紧张。';
    assert.ok(!cfg?.sourceTitle?.includes('阶段3A'), 'Stage3A JSON base route must not be called');
    return '';
  };
  loop.completeConfiguredSettlementKvWindow = async () => {
    slidingCalls += 1;
    return { type: 'final', elapsedSeconds: 180, status: '滑动结算状态', quest: '滑动结算目标', choices: ['一', '二', '三', '四'], sceneTitle: '滑动标题', locationName: '滑动地点', genericUpdates: [{ updateType: 'emotion', subject: { type: 'character', id: 'rushiqi', name: '刘思琪' }, field: 'metrics.emotions.紧张', change: { mode: 'delta', value: 1 }, reasons: [] }] };
  };
  loop.completeGroupedStage3Updates = async () => { legacyCalls += 1; return { type: 'final', genericUpdates: [] }; };

  const out = await loop.generateConfiguredFinal({ store, action: '行动', base: '基础', loaded: [], skills: '', trace: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'direct-target' }] }], materialSession: null, logId: null, config });

  assert.strictEqual(slidingCalls, 1);
  assert.strictEqual(legacyCalls, 0);
  assert.strictEqual(out.result.status, '滑动结算状态');
  assert.strictEqual(out.result.genericUpdates.length, 1);
});

test('generateConfiguredFinal reuses computed Stage 3 participants across groups', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };
  let participantCalls = 0;
  const originalStageParticipants = loop.stageParticipants.bind(loop);
  loop.stageParticipants = (...args) => {
    participantCalls += 1;
    return originalStageParticipants(...args);
  };
  loop.completeConfiguredStep = async (_store, _prompt, _logId, streamToUi, cfg) => {
    if (cfg?.sourceTitle?.includes('场景锚定')) return '场景锚定报告：只写当前场景影响对象。\n当前地点：测试地点\n当前时间：测试时间\n空间状态：测试空间\n当前动作：行动\n强制出场：刘思琪\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件影响：无\n正文写作重点：只写当前动作。\n当前场景影响对象：只包含当前场景内实际可能被当前行动影响的对象。';
    if (streamToUi) return '正文。';
    assert.ok(!cfg?.sourceTitle?.includes('阶段3A'), 'Stage3A JSON base route must not be called');
    return '{"genericUpdates":[]}';
  };
  loop.completeConfiguredUpdateJson = async () => ({ genericUpdates: [] });

  await loop.generateConfiguredFinal({
    store,
    action: '行动',
    base: '基础',
    loaded: [{ participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪' }] }],
    skills: '',
    trace: [],
    materialSession: null,
    logId: null,
    config,
  });

  assert.strictEqual(participantCalls, 1);
});

test('Stage 4 settlement participants include player but not loaded role cards when trace participants are empty', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const loaded = [{ title: '结构化资料缓存', text: '资料正文可能被压缩或引用替换。', participants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'loaded-role-card' }] }];
  const participants = loop.stageParticipants([], loaded, store);
  assert.strictEqual(JSON.stringify(participants.map(({ type, id, name, role }) => ({ type, id, name, role }))), JSON.stringify([
    { type: 'player', id: 'player-self', name: '玩家', role: 'actor' },
  ]));
});

test('Stage 3 participants include forced participants but exclude candidates and forbidden roles', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = loop.stageParticipants([{ participants: [{ type: 'player', id: 'player-self', name: '玩家', role: 'actor' }], forcedParticipants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }], priorityCandidates: [{ type: 'character', id: 'liusiyi', name: '刘思怡', role: 'priority-candidate', canSettle: false }], forbiddenParticipants: [{ type: 'character', id: 'boss', name: '王主管', role: 'forbidden', canSettle: false }] }], [], store);
  assert.strictEqual(JSON.stringify(participants.map((item) => item.name)), JSON.stringify(['玩家', '刘思琪']));
});

test('Stage 3 participants sanitize trace participants that duplicate candidate forbidden background and random roles', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const trace = [{
    participants: [
      { type: 'player', id: 'player-self', name: '玩家', role: 'actor' },
      { type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' },
      { type: 'character', id: 'liusiyi', name: '刘思怡', role: 'direct-target' },
      { type: 'character', id: 'boss', name: '王主管', role: 'direct-target' },
      { type: 'character', id: 'passer', name: '路人甲', role: 'direct-target' },
      { type: 'character', id: 'random', name: '随机角色', role: 'direct-target' },
    ],
    priorityCandidates: [{ name: '刘思怡' }],
    forbiddenParticipants: [{ name: '王主管' }],
    dramaCandidates: [{ name: '路人甲' }],
    randomActiveEvents: [{ characterName: '随机角色' }],
  }];

  const participants = loop.stageParticipants(trace, [], store);

  assert.strictEqual(JSON.stringify(participants.map((item) => item.name)), JSON.stringify(['玩家', '刘思琪']));
});

test('Stage 3 participants keep forced participants even when also listed as candidates or random events', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const participants = loop.stageParticipants([{
    forcedParticipants: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }],
    priorityCandidates: [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'priority-candidate' }],
    randomActiveEvents: [{ id: 'rushiqi', characterName: '刘思琪' }],
  }], [], store);
  assert.strictEqual(JSON.stringify(participants.map((item) => item.name)), JSON.stringify(['刘思琪', '玩家']));
});

test('real world materials mention Chinese requests, scene anchoring, and Top3 role card rule', () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompts/materials/real-world-materials.js');
  const text = JSON.stringify(context.window.GameModules.realWorldMaterials || {});
  assert.ok(text.includes('中文资料请求'));
  assert.ok(text.includes('场景锚定'));
  assert.ok(text.includes('Top3'));
  assert.ok(text.includes('加载角色卡不等于出场或结算'));
  assert.ok(text.includes('不得输出英文 skill/method'));
});

test('Stage 1 prompt tells model not to copy material request placeholders', () => {
  const body = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage1-guided-query.md'), 'utf8');
  assert.ok(body.includes('不得照抄示例中的占位词'));
  assert.ok(body.includes('角色全称、世界全称、地点全称、人物全称、作品全称都必须替换为本次行动中的真实名称'));
  assert.ok(!body.includes('资料请求1：角色查询，搜索角色卡，角色全称，世界全称'));
});

test('parseGuidedStepKv rejects copied placeholder material requests with diagnostics', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  assert.throws(() => loop.parseGuidedStepKv(`查询规划：需要角色卡
资料状态：继续请求资料
地点查询：无
地点查询理由：无
因果查询：无
因果查询理由：无
冲突查询：无
冲突查询理由：无
强制出场：刘思琪
高优先候选：无
戏剧候选：无
禁止出场：无
随机事件候选：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求：1条
资料请求1：角色查询，搜索角色卡，角色全称，世界全称
资料请求结束：是`, loop.realConfig()), /资料请求包含未替换占位词/);
});

test('completeConfiguredParsedStep logs parse score diagnostics before retry recovery', async () => {
  const context = createContext();
  const warnings = [];
  context.console = { ...console, warn: (...args) => warnings.push(args.map((item) => String(item)).join(' ')), error: console.error, log: console.log };
  context.window.console = context.console;
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const outputs = [
    '资料状态：继续请求资料\n资料请求：1条\n资料请求1：未知查询，未知动作，锦苑小区3栋2单元',
    '查询规划：资料足够\n资料状态：资料已足够\n地点查询理由1：无\n因果查询理由1：无\n冲突查询理由1：无\n强制出场：无\n高优先候选：无\n戏剧候选：无\n禁止出场：无\n随机事件候选：无\n随机事件闯入条件：无明确条件则禁止闯入\n资料请求：无\n资料请求结束：是',
  ];
  loop.completeConfiguredStep = async () => outputs.shift();

  const out = await loop.completeConfiguredParsedStep(makeStore(), '原始 prompt', null, false, false, loop.realConfig());

  assert.strictEqual(out.data.type, 'context_done');
  const text = warnings.join('\n');
  assert.ok(text.includes('score='));
  assert.ok(text.includes('successRate='));
  assert.ok(text.includes('missing='));
  assert.ok(text.includes('droppedMaterialRequests='));
});

test('parseGuidedStepKv ignores invalid request explosion when core K:V fields are present', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const invalidRequests = Array.from({ length: 38 }, (_, index) => `资料请求${index + 2}：作品设定查询，搜索物品，衣物${index + 1}，2026现代都市现实世界`).join('\n');
  const data = loop.parseGuidedStepKv(`查询规划：核心资料已明确，只保留可执行请求
资料状态：继续请求资料
地点查询：无
地点查询理由：无
因果查询：无
因果查询理由：无
冲突查询：无
冲突查询理由：无
强制出场：刘思琪
高优先候选：无
戏剧候选：无
禁止出场：无
随机事件候选：无
随机事件闯入条件：无明确条件则禁止闯入
资料请求：39条
资料请求1：角色查询，搜索角色卡，刘思琪，2026现代都市现实世界
${invalidRequests}
资料请求结束：是`, loop.realConfig());

  assert.strictEqual(data.type, 'request_context');
  assert.strictEqual(JSON.stringify(data.requests.map((item) => item.method)), JSON.stringify(['searchCharacterProfile']));
  assert.ok(data.parseScore.successRate >= 0.8);
});

test('completeConfiguredParsedStep condenses dropped material requests in retry prompt', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const prompts = [];
  const invalidRequests = Array.from({ length: 20 }, (_, index) => `资料请求${index + 1}：作品设定查询，搜索物品，衣物${index + 1}，2026现代都市现实世界`).join('\n');
  const outputs = [
    `资料状态：继续请求资料\n资料请求：20条\n${invalidRequests}`,
    '资料状态：资料已足够',
  ];
  loop.completeConfiguredStep = async (store, prompt) => {
    prompts.push(prompt);
    return outputs.shift();
  };

  await assert.rejects(() => loop.completeConfiguredParsedStep(makeStore(), '原始 prompt', null, false, false, loop.realConfig()), /解析错误请重试/);

  assert.ok(prompts[1].includes('已丢弃资料请求：'));
  assert.ok(prompts[1].includes('等20条'));
  assert.ok(!prompts[1].includes('资料请求20'));
});

test('Stage 1 prompt forbids repeated and irrelevant material requests after context is enough', () => {
  const body = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage1-guided-query.md'), 'utf8');
  assert.ok(body.includes('已加载资料摘要已经覆盖的人物、地点、路线不得重复请求'));
  assert.ok(body.includes('不得请求衣着、鞋袜、随身物品等细节'));
  assert.ok(!body.includes('{{基础上下文}}'));
  assert.ok(!body.includes('{{动态Skills}}'));
  assert.ok(!body.includes('{{动态载入资料}}'));
});

test('Stage2 scene anchor prompt uses effective scene layers and requires appearance reasons', async () => {
  const context = createContext();
  loadCore(context);
  loadScript(context, 'publish/prompt-templates.js');
  loadScript(context, 'publish/prompts/推演引擎/stage2-scene-anchor.js');
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '', limit: (text) => String(text || '') };

  const prompt = await loop.buildConfiguredSceneAnchorPrompt({
    store: { ...makeStore(), playerName: '刘悠', playerProfile: { name: '刘悠' } },
    action: '走到刘思琪门前',
    base: '基础',
    loaded: [],
    trace: [
      { type: 'request_context', forcedParticipants: [], priorityCandidates: [{ name: '刘思瑶', reason: '第一轮候选' }], dramaCandidates: [{ name: '刘思怡', reason: '第一轮戏剧候选' }], randomActiveEvents: [{ characterName: '刘思琪', eventType: 'background_only', motivation: '第一轮随机' }] },
      { type: 'request_context', forcedParticipants: [{ name: '刘思琪', reason: '最终目标' }], priorityCandidates: [], dramaCandidates: [], forbiddenParticipants: [], randomActiveEvents: [{ characterName: '刘思怡', eventType: 'background_only', motivation: '最终场外' }], randomIntrusionCondition: '无明确条件则禁止闯入' },
    ],
    config,
  });

  assert.ok(prompt.includes('强制出场：刘思琪'));
  assert.ok(prompt.includes('强制出场：刘思琪') && prompt.includes('刘悠'));
  assert.ok(!prompt.includes('高优先候选：刘思瑶'));
  assert.ok(!prompt.includes('戏剧候选：刘思怡'));
  assert.ok(prompt.includes('随机主动事件：刘思怡'));
  assert.ok(!prompt.includes('随机主动事件：刘思琪'));
  assert.ok(prompt.includes('出场理由'));
  assert.ok(prompt.includes('不出场理由'));
});

test('Stage2 scene anchor prompt only carries acquired material, not request catalog', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = context.window.GameModules.realWorldAgentContext;
  config.materials = {
    summary: () => ['已获取资料：角色卡摘要', '仍可获取资料：', '- 查询角色完整身份资料：character.query.searchCharacterProfile｜params：{}'].join('\n'),
    acquiredSummary: () => '已获取资料：角色卡摘要',
  };
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);

  const prompt = await loop.buildConfiguredSceneAnchorPrompt({ store: makeStore(), action: '敲门', base: '基础', loaded: [{ title: '角色卡摘要', text: '当前位置：刘思琪房门附近\n当前状态：房间内可能有人回应' }], trace: [], materialSession: {}, config });

  assert.ok(prompt.includes('当前位置：刘思琪房门附近'));
  assert.ok(prompt.includes('已加载锚定事实：'));
  assert.ok(!prompt.includes('仍可获取资料'));
  assert.ok(!prompt.includes('character.query.searchCharacterProfile'));
  assert.ok(!prompt.includes('params'));
});

test('Stage1 routing summary keeps compact full role card fields', () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const summary = ctx.loadedRoutingSummary([{
    title: '自动资料：刘思琪角色卡',
    text: [
      '资料类型：完整角色卡',
      '姓名：刘思琪',
      '身份：高中生',
      '当前地点：刘思琪的房间',
      '人际关系：刘悠的妹妹',
      '外貌：黑发，居家装',
      '性格：敏感但嘴硬',
      '身体状态：疲惫，心跳略快',
      '穿着：睡衣、拖鞋',
      '物品：手机、钥匙',
      '技能：绘画、记忆力好',
      '知识：熟悉家中布局',
      '其他身份状态：可被当前剧情结算',
    ].join('\n'),
  }]);

  assert.ok(summary.includes('资料类型：完整角色卡'));
  assert.ok(summary.includes('身体状态：疲惫'));
  assert.ok(summary.includes('其他身份状态：可被当前剧情结算'));
});

test('Stage3 narration prompt omits skills and material request method guidance', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const config = loop.realConfig();
  config.ctx = { buildLoadedText: () => '角色卡：刘思琪', limit: (text) => String(text || '') };
  config.materials = { acquiredSummary: () => '资料请求方式：角色查询，搜索角色卡，刘思琪' };
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);

  const prompt = await loop.buildConfiguredNarrationPrompt({ store: makeStore(), action: '敲门', base: '基础', loaded: [], skills: '动态Skills：资料请求方式与skill方法说明', materialSession: {}, sceneAnchorReport: '强制出场：刘思琪', config });

  assert.ok(!prompt.includes('可用技能'));
  assert.ok(!prompt.includes('动态Skills'));
  assert.ok(!prompt.includes('资料请求方式'));
  assert.ok(prompt.includes('角色卡：刘思琪'));
});

test('parseSettlementKv accepts 更新N placeholder update lines from model output', () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  store.__npc.metrics = { emotions: { 紧张: 1 }, playerFeelings: {}, temporaryEmotions: {}, temporaryPlayerFeelings: {} };
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];

  const parsed = loop.parseSettlementKv(`情绪结算{
更新N：刘思琪，紧张，+2，正文确认她因门口动静紧张
}`, { requestedTypes: ['情绪'], participants, store, config: loop.realConfig() });

  assert.strictEqual(JSON.stringify(parsed.completeTypes), JSON.stringify(['情绪']));
  assert.strictEqual(parsed.genericUpdates.length, 1);
});

test('Stage4 settlement gate keeps complete short non-final blocks before retry', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  loop.settlementTypeQueue = () => ['情绪', '感觉'];
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  const rendered = [];
  let calls = 0;
  loop.completeConfiguredStep = async (_store, prompt) => {
    rendered.push(JSON.parse(prompt));
    calls += 1;
    if (calls === 1) return '情绪结算{\n结算状态：无变化\n}';
    return '情绪结算{\n结算状态：无变化\n}\n感觉结算{\n结算状态：无变化\n}';
  };

  await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(calls, 2);
  assert.strictEqual(rendered[1].本次必须返回的类型, '感觉');
  assert.strictEqual(rendered[1].未完成类型, '感觉');
  assert.ok(rendered[1].未完成类型原因.includes('长度不足，但已验收完整块'));
  assert.ok(!rendered[1].类型合约.includes('情绪结算{'));
  assert.ok(rendered[1].类型合约.includes('感觉结算{'));
});

test('Stage4 keeps repeated short complete single-type replies and reports remaining types', async () => {
  const context = createContext();
  loadCore(context);
  const loop = context.window.GameModules.realWorldAgentLoop;
  const store = makeStore();
  const config = loop.realConfig();
  const participants = [{ type: 'character', id: 'rushiqi', name: '刘思琪', role: 'forced' }];
  loop.settlementTypeQueue = () => ['基础结算', '情绪', '感觉'];
  context.window.GameModules.promptTemplates.render = async (_id, vars) => JSON.stringify(vars);
  const rendered = [];
  const outputs = [
    '基础结算{\n结算状态：需要更新\n经过时间：90\n当前状态：测试状态\n当前目标：测试目标\n场景标题：测试标题\n地点名称：测试地点\n备选行动1：一\n备选行动2：二\n备选行动3：三\n备选行动4：四\n}',
    '情绪结算{\n无变化\n}',
    '感觉结算{\n无变化\n}',
  ];
  loop.completeConfiguredStep = async (_store, prompt) => {
    rendered.push(JSON.parse(prompt));
    return outputs.shift();
  };

  await loop.completeConfiguredSettlementKvWindow({ store, action: '行动', base: '基础', loaded: [], narration: '正文', trace: [], participants, config });

  assert.strictEqual(rendered.length, 3);
  assert.strictEqual(rendered[1].本次必须返回的类型, '情绪、感觉');
  assert.strictEqual(rendered[2].本次必须返回的类型, '感觉');
  assert.ok(rendered[1].未完成类型原因.includes('长度不足，但已验收完整块'));
  assert.ok(!rendered[1].类型合约.includes('基础结算{'));
  assert.ok(!rendered[2].类型合约.includes('情绪结算{'));
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
