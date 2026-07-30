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
    realWorld2026: {
      label: 'TestWorld',
      summary: 'Test background summary for Stage1.',
    },
    jsonUtils: {
      extractJson(text = '') {
        const raw = String(text || '').trim();
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start < 0 || end < start) throw new Error('JSON missing');
        return raw.slice(start, end + 1);
      },
      parseLoose(text = '') { return JSON.parse(this.extractJson(text)); },
      repairJson(text = '') { return String(text || ''); },
    },
    aiRequest: { outputTailLooksTruncated: () => false, complete: async () => '{}' },
    promptTemplates: { render: async (_id, vars) => JSON.stringify(vars) },
    sqliteSave: { getCharacterState: () => null, getCharacterStateByName: () => null },
    realWorldMap: { ensure: () => ({ current: 'Home' }) },
    characterQuery: {
      worldMatches: () => true,
      stateText(state) {
        return `资料类型：完整角色卡\n姓名：${state.profile?.name || state.name}\n单位：${state.profile?.company || ''}`;
      },
      stateByName(store, name) {
        return Object.values(store?.rpgStates || {}).find((state) => state?.name === name || state?.profile?.name === name) || null;
      },
      query: () => '',
    },
  };
  return vm.createContext(context);
}

function loadScript(context, relativePath) {
  const file = path.join(root, relativePath);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: relativePath });
}

function loadCore(context) {
  loadScript(context, 'publish/inference/agent-context-core.js');
  loadScript(context, 'publish/inference/material-dedup.js');
  loadScript(context, 'publish/inference/material-request-catalog.js');
  loadScript(context, 'publish/inference/scene-boundary.js');
  loadScript(context, 'publish/inference/material-loader.js');
  loadScript(context, 'publish/real-world-agent-context.js');
}

function makeStore() {
  const player = {
    id: 'player-self',
    name: 'Liu You',
    worldTag: 'TestWorld',
    profile: {
      name: 'Liu You',
      currentLocation: 'TestWorld·Country·City·Home·Room',
      company: 'Chengdu Youyun Technology Co., Ltd.',
    },
  };
  return {
    playerName: 'Liu You',
    realWorldLocationName: 'Home',
    rpgStates: { 'player-self': player },
    playerIdentityState: () => player,
    playerSetupSummary: () => 'player setup summary should not replace full player role card',
    playerIdentitySummary: () => 'player identity summary should not replace full player role card',
    phoneDateText: () => '2026-07-30',
    phoneTimeText: () => '10:00',
    initFactionSystem: () => {},
  };
}

(async () => {
  const context = createContext();
  loadCore(context);
  const ctx = context.window.GameModules.realWorldAgentContext;
  const store = makeStore();

  const routing = ctx.buildStage1RoutingContext({ store, action: 'go to sibling room', loaded: [], config: { mode: 'real', label: 'Real' } });
  assert.ok(routing.includes('TestWorld'));
  assert.ok(routing.includes('Test background summary for Stage1.'));
  assert.ok(!routing.includes('player setup summary should not replace full player role card'));
  assert.ok(!routing.includes('player identity summary should not replace full player role card'));

  const loaded = await ctx.autoLoadForStep(store, 'go to sibling room', new Set(), null, context.window.GameModules.realWorldMaterials, new Set(), 1, [], []);
  const texts = loaded.map((item) => item.text).join('\n');
  assert.ok(texts.includes('姓名：Liu You'));
  assert.ok(texts.includes('Chengdu Youyun Technology Co., Ltd.'));

  store.characterSchedules = {
    'rel-ai-242269': {
      characterId: 'rel-ai-242269',
      characterName: 'Liu Siyi',
      currentLocation: 'Home',
      currentAction: 'reading',
      availability: '在场',
    },
  };
  const scheduleHint = ctx.scheduleCandidateHintText(store, 'go to sibling room', 'Home');
  assert.ok(scheduleHint.includes('Liu Siyi'));
  assert.ok(!scheduleHint.includes('Liu Siyi(rel-ai-242269)'));

  loadScript(context, 'publish/character-id-ensure.js');
  const ensureLayers = {
    forcedParticipants: [{ name: 'Liu Siyi', id: '待建卡' }],
    priorityCandidates: [],
    dramaCandidates: [],
    forbiddenParticipants: [],
  };
  store.rpgStates['rel-ai-real-siyi'] = {
    id: 'rel-ai-real-siyi',
    name: 'Liu Siyi',
    worldTag: 'TestWorld',
    profile: { id: 'rel-ai-real-siyi', name: 'Liu Siyi', work: 'TestWorld' },
  };
  const ensured = await context.window.GameModules.characterIdEnsure.ensureBatch(store, ensureLayers);
  assert.strictEqual(ensureLayers.forcedParticipants[0].id, 'rel-ai-real-siyi');
  assert.strictEqual(ensured.count, 0);

  console.log('PASS stage1 player context and autoload');
})();
