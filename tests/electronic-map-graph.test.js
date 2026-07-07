const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function loadScript(context, relativePath) {
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
}
function methodBody(source, name, nextName) {
  const start = source.indexOf(`  ${name}(`);
  const end = source.indexOf(`\n  ${nextName}(`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : '';
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('manifest loads electronic map interior, fog, geopolitical, graph before map actions', () => {
  const manifest = read('publish/boot/script-manifest.js');
  const order = [
    'real-world-map-facts.js',
    'real-world-map-interior-templates.js',
    'real-world-map-interior.js',
    'real-world-map.js',
    'real-world-map-fog.js',
    'real-world-map-geopolitical.js',
    'real-world-map-graph.js',
    'real-world-map-actions.js',
  ].map((name) => manifest.indexOf(`"${name}"`));
  order.forEach((index, i) => assert.ok(index >= 0, `missing script ${i}`));
  for (let i = 1; i < order.length; i += 1) assert.ok(order[i - 1] < order[i], `script order broken at ${i}`);
});

test('index uses graph viewport and interior drawer instead of legacy map rows', () => {
  const html = read('publish/index.html');
  assert.ok(html.includes('real-world-map-viewport'));
  assert.ok(html.includes('real-world-map-canvas'));
  assert.ok(html.includes('real-world-map-stage'));
  assert.ok(html.includes('real-world-map-interior-panel'));
  assert.ok(html.includes('realWorldMapHasGraphNodes()'));
  assert.ok(!html.includes('realWorldMapRows()'));
  assert.ok(!html.includes('realWorldFunctionView === \'map\' && $nextTick'));
});

test('map prompts require building nodes, realistic route distance, and fogged interiors', () => {
  const prompt = read('publish/prompts/推演引擎/update/map-update-prompt.md');
  assert.ok(prompt.includes('建筑物级 POI'));
  assert.ok(prompt.includes('distanceMeters'));
  assert.ok(prompt.includes('basis'));
  assert.ok(prompt.includes('玩家初始化只知道自己房间'));
  assert.ok(prompt.includes('禁止为了丰富地图而硬造'));
});

test('map actions cache graph builds between reactive refreshes', () => {
  const actions = read('publish/real-world-map-actions.js');
  assert.ok(actions.includes('realWorldMapGraphSourceSignature(mapArg = null)'));
  assert.ok(actions.includes('realWorldMapRuntime()'));
  assert.ok(actions.includes('runtime.graphCache'));
  assert.ok(actions.includes('realWorldMapHasGraphNodes()'));
  assert.ok(actions.includes('if (options.fast && runtime.graphCache?.graph) return runtime.graphCache.graph;'));
});

test('map drag redraws canvas without reactive store writes', () => {
  const actions = read('publish/real-world-map-actions.js');
  const moveBody = methodBody(actions, 'realWorldMapPanMove', 'realWorldMapPanEnd');
  assert.ok(actions.includes('realWorldMapRuntime()'));
  assert.ok(actions.includes('drawRealWorldMapCanvas'));
  assert.ok(actions.includes('queueRealWorldMapViewPaint(view = {})'));
  assert.ok(actions.includes('commitRealWorldMapView(view = this.realWorldMapRuntime().liveView)'));
  assert.ok(moveBody.includes('this.queueRealWorldMapViewPaint(pan.view)'));
  assert.ok(!actions.includes('stage.replaceChildren()'));
  assert.ok(!actions.includes('document.createElementNS(ns'));
  assert.ok(!moveBody.includes('ensureMapView(map)'));
  assert.ok(!moveBody.includes('map.view'));
});

test('map canvas uses lightweight POI drawing during pan', () => {
  const actions = read('publish/real-world-map-actions.js');
  const drawBody = methodBody(actions, 'drawRealWorldMapCanvas', 'realWorldMapCanvasHitTest');
  assert.ok(actions.includes('const dpr = 1'));
  assert.ok(actions.includes('realWorldMapShortLabel('));
  assert.ok(actions.includes('realWorldMapDrawPill('));
  assert.ok(drawBody.includes('const isInteracting = Boolean(runtime.pan)'));
  assert.ok(drawBody.includes('this.realWorldMapGraph({ fast: Boolean(viewArg || runtime.pan), map })'));
  assert.ok(drawBody.includes('if (current && !isInteracting)'));
  assert.ok(drawBody.includes("ctx.fillText('i'"));
  assert.ok(!drawBody.includes('ctx.shadowBlur'));
  assert.ok(!drawBody.includes('createLinearGradient'));
});

test('map viewport uses native DOM input instead of Alpine high-frequency handlers', () => {
  const html = read('publish/index.html');
  const actions = read('publish/real-world-map-actions.js');
  const clockActions = read('publish/real-world-clock-actions.js');
  assert.ok(clockActions.includes('ensureRealWorldMapNativeInput?.()'));
  assert.ok(html.includes('data-real-world-map-native-input="pending"'));
  assert.ok(!html.includes('x-effect="$store.game.realWorldFunctionView === \'map\''));
  assert.ok(!html.includes('@pointermove="$store.game.realWorldMapPanMove($event)"'));
  assert.ok(!html.includes('@wheel="$store.game.realWorldMapWheel($event)"'));
  assert.ok(actions.includes('ensureRealWorldMapNativeInput()'));
  assert.ok(actions.includes("addEventListener('pointermove'"));
  assert.ok(actions.includes("addEventListener('wheel'"));
  assert.ok(actions.includes('{ passive: false }'));
  assert.ok(actions.includes('realWorldMapHandleCanvasTap(event)'));
});

test('map node tap opens info popover before interior drawer', () => {
  const html = read('publish/index.html');
  const actions = read('publish/real-world-map-actions.js');
  const tapBody = methodBody(actions, 'realWorldMapHandleCanvasTap', 'paintRealWorldMapView');
  const infoBody = methodBody(actions, 'showRealWorldMapInfo', 'closeRealWorldMapInfo');
  assert.ok(tapBody.includes("if (hit.type === 'info') this.showRealWorldMapInfo(hit.id);"));
  assert.ok(tapBody.includes("else if (hit.type === 'node') this.showRealWorldMapInfo(hit.id);"));
  assert.ok(!tapBody.includes("else if (hit.type === 'node') this.showRealWorldMapInterior(hit.id);"));
  assert.ok(infoBody.includes('this.realWorldMap.infoNodeId = id;'));
  assert.ok(!infoBody.includes('window.GameModules.realWorldMap.ensure'));
  assert.ok(infoBody.includes('requestAnimationFrame'));
  assert.ok(infoBody.includes('setTimeout'));
  assert.ok(infoBody.indexOf('setTimeout') < infoBody.indexOf('resolveControlLabel'));
  assert.ok(html.includes('查看建筑内部'));
});

test('real world panel and map actions defer heavy work until after first paint', () => {
  const currentWorld = read('publish/current-world-actions.js');
  const clockActions = read('publish/real-world-clock-actions.js');
  const mapActions = read('publish/real-world-map-actions.js');
  const openPanelBody = methodBody(clockActions, 'openRealWorldPanel', 'closeRealWorldPanel');
  const openFunctionBody = methodBody(clockActions, 'openRealWorldFunctionPanel', 'closeRealWorldFunctionPanel');
  const showInteriorBody = methodBody(mapActions, 'showRealWorldMapInterior', 'closeRealWorldMapInterior');
  const drawBody = methodBody(mapActions, 'drawRealWorldMapCanvas', 'realWorldMapCanvasHitTest');
  assert.ok(clockActions.includes('runAfterRealWorldPaint(callback)'));
  assert.ok(mapActions.includes('realWorldMapAfterPaint(callback)'));
  assert.ok(currentWorld.includes('this.realWorldOpen = true;'));
  assert.ok(!currentWorld.includes('await this.ensureGameplayAssetsReady'));
  assert.ok(openPanelBody.indexOf('runAfterRealWorldPaint') < openPanelBody.indexOf('realWorldMap.ensure'));
  assert.ok(openFunctionBody.includes('this.runAfterRealWorldPaint?.(() => {'));
  assert.ok(showInteriorBody.includes('runtime.interiorPreparingNodeId = key;'));
  assert.ok(!showInteriorBody.includes('realWorldMap.showInterior'));
  assert.ok(drawBody.includes('realWorldMapNodeControlCachedLine'));
  assert.ok(!drawBody.includes('realWorldMapNodeControlLine?.(node.id)'));
});

test('org territory consistency warning is signature-deduped', () => {
  const org = read('publish/org-territory-system.js');
  assert.ok(org.includes('const repeated = Boolean(prevSig) && prevSig === nextSig'));
  assert.ok(org.includes('if (!repeated)'));
  assert.ok(org.includes("if (warnings.length) console.warn('[orgTerritory]"));
  assert.ok(org.includes('if (store && (!repeated || !store.orgTerritoryConsistency)) store.orgTerritoryConsistency = report;'));
  assert.ok(org.includes('return repeated && prev.signature ? prev : report;'));
});

test('game store has graph map UI fallbacks before gameplay chunk loads', () => {
  const game = read('publish/game.js');
  [
    'realWorldMapStageStyle()',
    'openRealWorldPanel()',
    'openRealWorldFunctionPanel(view = \'menu\')',
    'closeRealWorldFunctionPanel()',
    'realWorldMapHasGraphNodes()',
    'ensureRealWorldMapNativeInput()',
    'realWorldMapInteriorNode()',
    'realWorldMapInteriorTitle()',
    'realWorldMapInteriorSummary()',
    'realWorldMapInteriorView()',
    'realWorldMapInfoControlLine()',
  ].forEach((name) => assert.ok(game.includes(name), `missing fallback ${name}`));
});

test('map css prevents node text overlap and avoids expensive filters', () => {
  const css = read('publish/real-world.css');
  assert.ok(css.includes('Electronic map performance/readability hotfix'));
  assert.ok(css.includes('Electronic map canvas renderer'));
  assert.ok(css.includes('-webkit-line-clamp: 2'));
  assert.ok(css.includes('contain: layout paint style'));
  assert.ok(css.includes('filter: none;'));
});

test('graph builds network edges with distance labels', () => {
  const context = {
    window: { GameModules: {} },
    console,
  };
  context.window.GameModules.realWorldMap = {
    isMapDisplayNode: (node) => node.mapVisible !== false,
  };
  loadScript(context, 'publish/real-world-map-graph.js');
  const graph = context.window.GameModules.realWorldMapGraph.build({
    currentId: 'a',
    mapAnchorId: 'a',
    nodes: [
      { id: 'a', name: '3栋2单元', order: 1, visited: true, revealed: true, mapVisible: true },
      { id: 'b', name: '小区门口', order: 2, visited: false, revealed: true, mapVisible: true },
    ],
    edges: [{ from: 'a', to: 'b', distanceMeters: 126, basis: '按小区道路估算' }],
  });
  assert.strictEqual(graph.nodes.length, 2);
  assert.strictEqual(graph.edges.length, 1);
  assert.strictEqual(graph.edges[0].distanceText, '126 m');
  assert.ok(graph.nodes.every((node) => node.h >= 88));
});

test('interior floors come only from inferred layout and sort low to high', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior.js');
  const interior = context.window.GameModules.realWorldMapInterior;
  assert.deepStrictEqual(interior.ensureFloors({ interiorLayout: { floors: [] } }, {}), []);
  const floors = interior.ensureFloors({
    interiorLayout: {
      floors: [
        { id: 'floor_2', name: '第2层', rooms: [{ name: 'KTV' }] },
        { id: 'floor_1', name: '第1层', rooms: [{ number: '101' }, { name: '餐厅' }] },
      ],
    },
  }, {});
  assert.deepStrictEqual(floors.map((floor) => floor.name), ['第1层', '第2层']);
  assert.ok(floors[0].rooms.some((room) => room.name === '餐厅'));
  assert.ok(floors[1].rooms.some((room) => room.name === 'KTV'));
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
