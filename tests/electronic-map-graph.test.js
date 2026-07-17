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
    'real-world-location-graph.js',
    'real-world-location-graph-skills.js',
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
  const prompt = read('publish/prompts/\u63a8\u6f14\u5f15\u64ce/update/map-update-prompt.md');
  assert.ok(prompt.includes('\u5efa\u7b51\u7269\u7ea7 POI'));
  assert.ok(prompt.includes('distanceMeters'));
  assert.ok(prompt.includes('basis'));
  assert.ok(prompt.includes('\u73a9\u5bb6\u521d\u59cb\u5316\u53ea\u77e5\u9053\u81ea\u5df1\u623f\u95f4'));
  assert.ok(prompt.includes('POI'));
});

test('map update prompt captures item container changes during settlement', () => {
  const prompt = read('publish/prompts/\u63a8\u6f14\u5f15\u64ce/update/map-update-prompt.md');
  assert.ok(prompt.includes('\u7269\u54c1\u5bb9\u5668\u53d8\u5316'));
  assert.ok(prompt.includes('containerItems'));
  assert.ok(prompt.includes('\u653e\u7f6e\u7269\u54c1'));
  assert.ok(prompt.includes('\u684c\u5b50'));
  assert.ok(prompt.includes('\u7a33\u5b9a\u4e8b\u5b9e'));
});

test('surround unlock prompt requires contextual AI furniture contents persistence', () => {
  const prompt = read('publish/prompts/real-world-map-surround-unlock.md');
  assert.ok(prompt.includes('\u4eba\u7269\u6027\u683c'));
  assert.ok(prompt.includes('\u8d22\u529b'));
  assert.ok(prompt.includes('containerContents'));
  assert.ok(prompt.includes('AI'));
  assert.ok(prompt.includes('\u5927\u578b\u6446\u4ef6'));
  assert.ok(prompt.includes('containerContents'));
});

test('surround unlock prompt allows AI generated room layouts before templates', () => {
  const prompt = read('publish/prompts/real-world-map-surround-unlock.md');
  assert.ok(prompt.includes('layout.shapes'));
  assert.ok(prompt.includes('AI \u751f\u6210\u5b8c\u6574\u6237\u578b'));
  assert.ok(prompt.includes('\u4f18\u5148\u4f7f\u7528 `layout.shapes`'));
  assert.ok(prompt.includes('\u6a21\u677f\u515c\u5e95'));
});

test('surround unlock prompt documents full and patch response modes', () => {
  const prompt = read('publish/prompts/real-world-map-surround-unlock.md');
  assert.ok(prompt.includes('\u8fd4\u56de\u6a21\u5f0f\uff1a{{\u8fd4\u56de\u6a21\u5f0f}}'));
  assert.ok(prompt.includes('\u5f53\u524d\u5730\u70b9\u5b8c\u6574JSON'));
  assert.ok(prompt.includes('\u8fd4\u56de\u6a21\u5f0f=full'));
  assert.ok(prompt.includes('\u8fd4\u56de\u6a21\u5f0f=patch'));
  assert.ok(prompt.includes('noChange'));
  assert.ok(prompt.includes('currentPoi'));
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


test('stage1 auto location fill labels token stats as stage1 context instead of stage4 settlement', async () => {
  const context = {
    window: {
      GameModules: {
        realWorldAgentContext: {
          locationTargetKeyword: () => '\u5218\u601d\u742a\u5367\u5ba4',
          findLocationHit: () => null,
          ensurePlayerCurrentLocation: () => null,
        },
        realWorldMap: { ensure: () => ({ nodes: [] }), cleanName: (value) => String(value || '') },
      },
    },
    console,
  };
  loadScript(context, 'publish/real-world-agent-location-fill.js');
  let captured = null;
  context.window.GameModules.realWorldAgentContext.fillCharacterLocation = async (...args) => {
    captured = args;
    return 'filled location';
  };
  await context.window.GameModules.realWorldAgentContext.actionLocationForStep(
    {},
    '\u53bb\u59b9\u59b9\u623f\u95f4',
    [],
    '',
    new Set(),
    { phase: 'stage1', guidedStep: 2, label: '\u73b0\u5b9e' },
  );
  assert.ok(captured, 'stage1 auto route should invoke location fill');
  const options = captured[3] || {};
  assert.strictEqual(options.outputLimitKind, 'stage1');
  assert.strictEqual(options.tokenMeta.title, '\u73b0\u5b9eStage1\u8d44\u6599\u8def\u7531\uff5c\u7535\u5b50\u5730\u56fe\u65b0\u589e\u5730\u70b9');
  assert.strictEqual(options.tokenMeta.category, '\u73b0\u5b9e\u63a8\u6f14');
  assert.strictEqual(options.tokenMeta.summary, 'Stage1 \u8d44\u6599\u8def\u7531\u4e2d\u6309\u5f53\u524d\u884c\u52a8\u8865\u9f50\u73a9\u5bb6\u5df2\u77e5\u5730\u70b9\u3002');
});
test('map auxiliary AI requests reuse real world KV cache path', () => {
  const loop = read('publish/real-world-agent-loop.js');
  const jsonUtils = read('publish/json-utils.js');
  const fog = read('publish/real-world-map-fog.js');
  const locationFill = read('publish/real-world-agent-location-fill.js');
  assert.ok(loop.includes('completeCachedJsonPrompt(store, options = {})'));
  assert.ok(loop.includes('activeKvCacheSession(store, \'real\')'));
  assert.ok(loop.includes('loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession, config.materials, config)'));
  assert.ok(loop.includes('materials = window.GameModules.realWorldMaterials, config = this.realConfig()'));
  assert.ok(loop.includes('tokenMeta: options.tokenMeta'));
  assert.ok(loop.includes('requestOptions.tokenMeta = config.tokenMeta'));
  assert.ok(jsonUtils.includes('useRealWorldKvCache && store'));
  assert.ok(jsonUtils.includes('completeCachedJsonPrompt(store'));
  assert.ok(jsonUtils.includes('tokenMeta,'));
  assert.ok(fog.includes("source: 'real-world-map-surround-unlock'"));
  assert.ok(fog.includes('useRealWorldKvCache: true'));
  assert.ok(fog.includes("outputLimitKind: 'stage4'"));
  assert.ok(locationFill.includes("source: 'real-world-location-fill'"));
  assert.ok(locationFill.includes('useRealWorldKvCache: true'));
  assert.ok(locationFill.includes('locationFillRequestOptions(options = {})'));
  assert.ok(locationFill.includes("requestOptions.outputLimitKind || 'stage4'"));
  assert.ok(locationFill.includes('tokenMeta: requestOptions.tokenMeta'));
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
  assert.ok(html.includes('\u67e5\u770b\u5efa\u7b51\u5185\u90e8'));
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


test('token stats rows do not let long cost text squeeze titles', () => {
  const index = read('publish/index.html');
  const css = read('publish/skills-app.css');
  assert.ok(index.includes('tokenPromptRowCostText(item)'));
  assert.ok(!index.includes('`${item.tokens} token｜约 ${item.credits} 积分`'));
  assert.ok(css.includes('.token-row .prompt-title {'));
  assert.ok(css.includes('grid-template-columns: minmax(0, 1fr);'));
  assert.ok(css.includes('justify-self: end;'));
  assert.ok(css.includes('text-align: right;'));
  assert.ok(css.includes('white-space: normal;'));
  assert.ok(!css.includes('.token-row .prompt-title em { white-space: nowrap; }'));
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
      { id: 'a', name: 'building-a', order: 1, visited: true, revealed: true, mapVisible: true },
      { id: 'b', name: 'gate-b', order: 2, visited: false, revealed: true, mapVisible: true },
    ],
    edges: [{ from: 'a', to: 'b', distanceMeters: 126, basis: 'route estimate' }],
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
        { id: 'floor_2', name: '\u7b2c\u4e8c\u5c42', rooms: [{ name: 'KTV' }] },
        { id: 'floor_1', name: '\u7b2c\u4e00\u5c42', rooms: [{ number: '101' }, { name: '\u9910\u5385' }] },
      ],
    },
  }, {});
  assert.deepStrictEqual(floors.map((floor) => floor.name), ['\u7b2c\u4e00\u5c42', '\u7b2c\u4e8c\u5c42']);
  assert.ok(floors[0].rooms.some((room) => room.name === '\u9910\u5385'));
  assert.ok(floors[1].rooms.some((room) => room.name === 'KTV'));
});

test('interior room template persists AI generated slot objects', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  const interior = context.window.GameModules.realWorldMapInterior;
  const room = interior.normalizeRoom({
    number: '202',
    residents: ['Liuyou', 'Siqi'],
    layoutTemplateId: 'four_bedroom_one_living',
    slotAssignments: { bed_1: 'Liuyou', bed_2: 'Siqi', living: '\u5ba2\u5385' },
    slotObjects: {
      bed_2: ['pink sheet', 'star lamp', 'rabbit pillow'],
      living: ['blue sofa', 'glass table'],
    },
  });
  assert.deepStrictEqual(Array.from(room.slotObjects.bed_2), ['pink sheet', 'star lamp', 'rabbit pillow']);
  const layout = interior.resolveRoomLayout(room);
  const siqiShape = layout.shapes.find((shape) => shape.label === 'Siqi\u7684\u5367\u5ba4');
  assert.ok(siqiShape, 'missing assigned bedroom shape');
  assert.deepStrictEqual(Array.from(siqiShape.objects), ['pink sheet', 'star lamp', 'rabbit pillow']);
  assert.deepStrictEqual(Array.from(interior.roomShapeObjectLabels(siqiShape)), ['pink sheet', 'star lamp', 'rabbit pillow']);
});

test('interior room detail uses AI generated object positions and container contents', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  const interior = context.window.GameModules.realWorldMapInterior;
  const aiObjectName = '\u661f\u7eb9\u8eba\u6905';
  const aiContents = ['\u8584\u6bef', '\u9065\u63a7\u5668'];
  const room = interior.normalizeRoom({
    number: '202',
    layoutTemplateId: 'four_bedroom_one_living',
    slotAssignments: { bed_2: '\u5218\u601d\u742a' },
    slotObjects: {
      bed_2: [
        { name: aiObjectName, x: 301, y: 119, w: 73, h: 57, containerContents: aiContents },
      ],
    },
  });
  assert.strictEqual(room.slotObjects.bed_2[0].name, aiObjectName);
  assert.deepStrictEqual([room.slotObjects.bed_2[0].x, room.slotObjects.bed_2[0].y, room.slotObjects.bed_2[0].w, room.slotObjects.bed_2[0].h], [301, 119, 73, 57]);

  const layout = interior.resolveRoomLayout(room);
  const areaShape = layout.shapes.find((shape) => (
    Array.isArray(shape.objects)
    && shape.objects.some((object) => object?.name === aiObjectName)
  ));
  assert.ok(areaShape, 'template must keep AI object records on the room area');

  const areaRegion = interior.roomLayoutRegions(layout).find((region) => region.shape === areaShape);
  const detail = interior.roomAreaDetailLayout(room, areaRegion);
  const objectShape = detail.shapes.find((shape) => shape.label === aiObjectName);
  assert.ok(objectShape, 'detail layout must draw AI object by name');
  assert.deepStrictEqual([objectShape.x, objectShape.y, objectShape.w, objectShape.h], [301, 119, 73, 57]);
  assert.deepStrictEqual(Array.from(objectShape.containerContents), aiContents);
});

test('interior unlock normalization persists AI generated room layout before template fallback', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const layout = {
    width: 480,
    height: 320,
    shapes: [
      { type: 'rect', id: 'ai_bedroom', x: 31, y: 42, w: 111, h: 88, label: '\u5218\u601d\u742a\u7684\u5367\u5ba4' },
      { type: 'rect', id: 'ai_living', x: 172, y: 42, w: 180, h: 120, label: '\u5ba2\u5385' },
    ],
  };
  const [floor] = fog.normalizeInteriorFloors([{
    id: 'floor_2',
    name: '\u7b2c\u4e8c\u5c42',
    rooms: [{
      number: '202',
      residents: ['\u5218\u601d\u742a'],
      layoutTemplateId: 'four_bedroom_one_living',
      layout,
    }],
  }]);
  const [room] = floor.rooms;
  assert.strictEqual(room.layout.shapes[0].id, 'ai_bedroom');
  assert.deepStrictEqual(room.layout.shapes.map((shape) => shape.id), ['ai_bedroom', 'ai_living']);
  assert.strictEqual(room.layout.templateId, undefined);
});

test('surround unlock patch mode merges object container contents locally', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const existing = {
    summary: '已有布局',
    zones: [],
    floors: [{
      id: 'floor_2',
      name: '第二层',
      rooms: [{
        id: 'room_202',
        number: '202',
        name: '202',
        residents: ['刘思琪'],
        slotObjects: {
          bed_2: [{ name: '书桌', x: 262, y: 58, w: 126, h: 54, containerContents: ['书本', '台灯'] }],
        },
      }],
    }],
  };
  const payload = fog.validateUnlockPayload({
    responseMode: 'patch',
    patch: {
      interiorLayout: {
        floors: [{
          id: 'floor_2',
          rooms: [{
            id: 'room_202',
            number: '202',
            slotObjects: {
              bed_2: [{ name: '书桌', containerContents: ['书本', '台灯', '刚放下的书'] }],
            },
          }],
        }],
      },
    },
    surroundLocations: [],
  }, { name: '锦苑小区3栋' }, {}, 'patch');
  const merged = fog.mergeInteriorLayout(existing, payload.interiorLayout);
  const desk = merged.floors[0].rooms[0].slotObjects.bed_2.find((item) => item.name === '书桌');
  assert.deepStrictEqual(Array.from(desk.containerContents), ['书本', '台灯', '刚放下的书']);
  assert.strictEqual(merged.floors[0].rooms.length, 1);
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
