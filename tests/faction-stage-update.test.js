const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function loadFactionQuery() {
  const context = vm.createContext({
    console,
    Set,
    Map,
    Date,
    JSON,
    window: {
      GameModules: {
        orgTerritory: {
          resolveFactionWorldTag: (f, store) => f.worldTag || store?.currentWorldTag?.() || '测试世界',
          normalizeFaction: (f) => f,
          normalizeOverviewPanels: (p) => p || {},
          normalizeOverviewField: (raw) => raw,
          overviewFieldSchema: () => ({ kind: 'text' }),
          normalizeOverviewEntryValue: (_panel, _field, value) => value,
          ideologyFixedKeys: () => ['core', 'reason', 'description', 'base', 'legitimacy'],
          economyFixedKeys: () => ['institutions', 'laws', 'works'],
          defaultOverviewPanels: () => ({
            ideology: {},
            economy: { entries: {} },
            politics: { entries: {} },
            military: { entries: {} },
            diplomacy: { entries: {} },
            territory: { entries: {} },
          }),
        },
        realWorldAgentContext: {},
      },
    },
  });
  context.window.window = context.window;
  const code = fs.readFileSync(path.join(__dirname, '..', 'publish/prompts/materials/real-world-faction-query.js'), 'utf8');
  vm.runInContext(code, context, { filename: 'publish/prompts/materials/real-world-faction-query.js' });
  return context.window.GameModules.realWorldAgentContext;
}

test('UI no longer exposes manual generateFactionsByAI button', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'publish/index.html'), 'utf8');
  assert.ok(!html.includes('generateFactionsByAI()'));
  assert.ok(!html.includes('初始化/全量检视势力'));
});

test('Stage4 settlement queue drops faction overview/structure/panel types', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'publish/real-world-agent-loop.js'), 'utf8');
  const match = script.match(/settlementTypeQueue[\s\S]*?return \(story/);
  assert.ok(match, 'settlementTypeQueue present');
  const block = match[0];
  assert.ok(!block.includes("'势力总览'"), '势力总览 moved out of Stage4');
  assert.ok(!block.includes("'势力结构'"), '势力结构 moved out of Stage4');
  assert.ok(!block.includes("'组织能力'"), '组织能力 moved out of Stage4');
});

test('faction skill supports createFaction / patchFactionField / getFactionField', () => {
  const ctx = loadFactionQuery();
  const store = {
    factionState: { factions: [] },
    initFactionSystem() {},
    currentWorldTag: () => '测试世界',
    phoneDate: () => new Date('2026-07-24T00:00:00.000Z'),
    factionIdByName: (name) => `force-${name}`,
    completeFactionReasons: () => ({}),
    normalizeFactionStructure: (f) => f,
    factionParentName: () => '无',
  };
  const created = ctx.createFaction(store, {
    id: 'country-test',
    name: '测试国',
    type: '国家',
    classification: 'country',
    worldTag: '测试世界',
    description: '完整创建',
    solid: {
      overviewPanels: {
        ideology: { core: { value: '国体A' } },
        economy: { entries: { institutions: { value: [{ name: '央行', description: '货币' }] } } },
      },
    },
    reason: '正文确认',
  });
  assert.ok(String(created).includes('已创建势力'));
  assert.strictEqual(store.factionState.factions.length, 1);
  assert.strictEqual(store.factionState.factions[0].id, 'country-test');

  const field = ctx.getFactionField(store, { id: 'country-test', panel: 'economy', field: 'institutions' });
  assert.ok(String(field).includes('央行'));

  ctx.patchFactionField(store, {
    id: 'country-test',
    panel: 'economy',
    field: 'institutions',
    op: 'append',
    value: { name: '财政部', description: '财政' },
    reason: '追加',
  });
  const list = store.factionState.factions[0].solid.overviewPanels.economy.entries.institutions.value;
  assert.strictEqual(list.length, 2);

  ctx.patchFactionField(store, {
    id: 'country-test',
    panel: 'economy',
    field: 'institutions',
    op: 'delete',
    index: 0,
    reason: '删除',
  });
  assert.strictEqual(store.factionState.factions[0].solid.overviewPanels.economy.entries.institutions.value[0].name, '财政部');

  ctx.patchFactionField(store, {
    id: 'country-test',
    panel: 'ideology',
    field: 'core',
    op: 'set',
    value: '国体B',
    reason: '覆盖',
  });
  assert.strictEqual(store.factionState.factions[0].solid.overviewPanels.ideology.core.value, '国体B');
});

test('listFactions default text includes id and structure', () => {
  const ctx = loadFactionQuery();
  const store = {
    factionState: {
      factions: [{
        id: 'country-test',
        name: '测试国',
        type: '国家',
        level: '国家级',
        parentName: '无势力归属',
        worldTag: '测试世界',
        structure: [{ name: '内阁', roles: [{ title: '首相', characters: ['未知'] }] }],
      }],
    },
    initFactionSystem() {},
    factionParentName: () => '无势力归属',
    normalizeFactionRoles: (roles) => roles,
  };
  const text = ctx.factionList(store);
  assert.ok(text.includes('country-test'));
  assert.ok(text.includes('测试国'));
  assert.ok(text.includes('内阁') || text.includes('组织架构'));
});

test('Stage9 prompt creates on appearance and patches only on factual change', () => {
  const root = path.join(__dirname, '..');
  const md = fs.readFileSync(path.join(root, 'publish/prompts/推演引擎/stage6-faction-update.md'), 'utf8');
  assert.ok(md.includes('出现且未入库'));
  assert.ok(md.includes('已入库且正文有事实变化'));
  assert.ok(md.includes('仅出现、无事实变化'));
  assert.ok(md.includes('不得以“本轮未互动'));
  const runtime = fs.readFileSync(path.join(root, 'publish/inference/faction-stage-update.js'), 'utf8');
  assert.ok(runtime.includes('出现且未入库'));
  assert.ok(runtime.includes('仅出现、无事实变化'));
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
