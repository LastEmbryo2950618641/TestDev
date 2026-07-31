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
  assert.ok(html.includes('real-world-map-shell--interior-open'));
  assert.ok(html.includes(":class=\"{ 'real-world-map-shell--interior-open': $store.game.realWorldMapInteriorNode() }\""));
  assert.ok(html.includes('realWorldMapHasGraphNodes()'));
  assert.ok(html.includes('refreshRealWorldMapJsonDump'));
  assert.ok(html.includes(':value="$store.game.realWorldMapJsonDump || \'\'"'));
  assert.ok(!html.includes('JSON.stringify($store.game.realWorldMap'));
  assert.ok(!html.includes('realWorldMapRows()'));
  assert.ok(!html.includes('realWorldFunctionView === \'map\' && $nextTick'));
});

test('interior drawer opens floors first and compact room list second', () => {
  const html = read('publish/index.html');
  assert.ok(html.includes('openRealWorldMapInteriorFloor(floor.id)'));
  assert.ok(html.includes('realWorldMapInteriorView() === \'floor\''));
  assert.ok(html.includes('real-world-map-room-list-compact'));
  assert.ok(html.includes('openRealWorldMapRoom(room.id || room.number || room.name)'));
  assert.ok(!html.includes('real-world-map-floorplan-canvas'));
  assert.ok(!html.includes('realWorldMapFloorPlanClick($event)'));
  assert.ok(!html.includes('toggleRealWorldMapInteriorFloor(floor.id)'));
  assert.ok(!html.includes('real-world-map-zone-grid'));
});

test('token response detail uses copyable textarea', () => {
  const html = read('publish/index.html');
  const css = read('publish/skills-app.css');
  assert.ok(html.includes('token-response-textarea'));
  assert.ok(html.includes(':value="$store.game.tokenPromptDetailText()"'));
  assert.ok(html.includes('@focus="$event.target.select()"'));
  assert.ok(css.includes('.token-response-textarea'));
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

test('surround unlock prompt forbids interior building payloads', () => {
  const prompt = read('publish/prompts/real-world-map-surround-unlock.md');
  assert.ok(prompt.includes('这次只做“周边解锁 + 出场人物位置按需同步”'));
  assert.ok(prompt.includes('禁止返回 `interiorLayout`'));
  assert.ok(prompt.includes('`floors`'));
  assert.ok(prompt.includes('`slotObjects`'));
  assert.ok(prompt.includes('周边解锁硬约束'));
  assert.ok(prompt.includes('禁止返回空数组'));
});

test('surround unlock prompt documents five-field response with neighbor faction and character locations', () => {
  const prompt = read('publish/prompts/real-world-map-surround-unlock.md');
  assert.ok(prompt.includes('\u5f53\u524d\u5730\u70b9\u5b8c\u6574JSON'));
  assert.ok(prompt.includes('"当前节点"'));
  assert.ok(prompt.includes('"周围地点"'));
  assert.ok(prompt.includes('"势力"'));
  assert.ok(prompt.includes('"地点信息"'));
  assert.ok(prompt.includes('"出场人物位置"'));
  assert.ok(prompt.includes('出场人物地点快照：{{出场人物地点快照}}'));
  assert.ok(prompt.includes('## 出场人物位置（必读）'));
  assert.ok(prompt.includes('"ID"'));
  assert.ok(prompt.includes('越具体越好') || prompt.includes('尽量精确'));
  assert.ok(prompt.includes('不需要更新（禁止输出）'));
  assert.ok(prompt.includes('需要更新（必须输出）'));
  assert.ok(prompt.includes('所在世界·势力·层级1·层级2·地点·详细的具体位置'));
  assert.ok(prompt.includes('角色卡当前位置格式为固定六段链式'));
  assert.ok(prompt.includes('"距离"'));
  assert.ok(prompt.includes('"地点名"'));
  assert.ok(prompt.includes('每项必须写 `距离`、`地点名`、`势力`'));
  assert.ok(prompt.includes('出场人物：{{出场人物}}'));
  assert.ok(prompt.includes('正式地图地点名'));
  assert.ok(prompt.includes('2026 现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室内楼梯上第一间房间床上'));
  assert.ok(prompt.includes('"出场人物位置": []'));
});

test('surround unlock prompt is simple and inline synced', () => {
  const prompt = read('publish/prompts/real-world-map-surround-unlock.md');
  const inline = read('publish/prompts/real-world-map-surround-unlock.js');
  assert.ok(prompt.includes('Stage10 电子地图周围解锁') || prompt.includes('电子地图周围解锁'));
  assert.ok(prompt.includes('字段固定只有五个'));
  assert.ok(inline.includes('Stage10 电子地图周围解锁') || inline.includes('电子地图周围解锁'));
  assert.ok(inline.includes('字段固定只有五个'));
  assert.ok(inline.includes('出场人物位置'));
  assert.ok(!prompt.includes('\ufffd'));
  assert.ok(!inline.includes('\ufffd'));
  assert.ok(!prompt.includes('layout.shapes'));
  assert.ok(!prompt.includes('usageContracts'));
});

test('map actions cache graph builds between reactive refreshes', () => {
  const actions = read('publish/real-world-map-actions.js');
  assert.ok(actions.includes('realWorldMapGraphSourceSignature(mapArg = null)'));
  assert.ok(actions.includes('realWorldMapRuntime()'));
  assert.ok(actions.includes('runtime.graphCache'));
  assert.ok(actions.includes('realWorldMapHasGraphNodes()'));
  assert.ok(actions.includes('if (options.fast && runtime.graphCache?.graph) return runtime.graphCache.graph;'));
});

test('map json dump exports only standard graph nodes and edges', () => {
  const context = {
    window: { GameModules: {} },
    document: { addEventListener() {} },
    console,
  };
  loadScript(context, 'publish/real-world-location-graph.js');
  loadScript(context, 'publish/real-world-map-actions.js');
  const actions = context.window.GameModules.realWorldMapActions;
  const store = {
    realWorldMap: { currentId: 'legacy_a', mapAnchorId: 'legacy_a', nodes: [], edges: [] },
    locationGraph: {
      version: 1,
      nodesById: {
        loc_a: { id: 'loc_a', type: 'poi', name: '锦苑小区3栋', displayName: '锦苑小区3栋', descriptionFacts: ['旧事实'], ownerRefs: [{ name: '甲' }], interiorLayout: { floors: [] } },
        loc_b: { id: 'loc_b', type: 'poi', name: '锦苑小区2栋', displayName: '锦苑小区2栋' },
      },
      legacyAliases: { 'mapId:legacy_a': 'loc_a' },
      identityIndex: {},
      searchIndex: { locationNodeIds: [], byNormalizedName: {} },
      characterLocations: {},
      poiGraph: {
        nodes: ['loc_a', 'loc_b'],
        edges: [{ id: 'edge_loc_a_loc_b', fromPoiId: 'loc_a', toPoiId: 'loc_b', distanceMeters: 20, distanceText: '约20米' }],
      },
    },
  };
  const text = actions.realWorldMapJsonDumpText.call({
    ...store,
    realWorldMapCurrentMap() { return store.realWorldMap; },
  });
  const payload = JSON.parse(text);
  assert.strictEqual(payload.currentId, 'loc_a');
  assert.deepStrictEqual(payload.nodes.map((node) => node.name), ['锦苑小区3栋', '锦苑小区2栋']);
  assert.strictEqual(payload.edges[0].weight, 20);
  assert.ok(text.includes('"nodes"'));
  assert.ok(text.includes('"edges"'));
  assert.ok(!text.includes('descriptionFacts'));
  assert.ok(!text.includes('ownerRefs'));
  assert.ok(!text.includes('interiorLayout'));
  assert.ok(!text.includes('"error"'));
});

test('standard graph exports structural poi nodes only when distance-linked', () => {
  const context = {
    window: { GameModules: {} },
    console,
  };
  loadScript(context, 'publish/real-world-map.js');
  loadScript(context, 'publish/real-world-location-graph.js');
  const state = {
    realWorldMap: { currentId: 'room', mapAnchorId: 'room', nodes: [], edges: [] },
    locationGraph: {
      version: 1,
      nodesById: {
        building3: { id: 'building3', type: 'poi', name: '锦苑小区3栋', displayName: '锦苑小区3栋', mapVisible: true },
        building2: { id: 'building2', type: 'poi', name: '锦苑小区2栋', displayName: '锦苑小区2栋', mapVisible: true },
        province: { id: 'province', type: 'poi', name: '四川省', displayName: '四川省', mapVisible: false },
        city: { id: 'city', type: 'poi', name: '成都市', displayName: '成都市', mapVisible: false },
        community: { id: 'community', type: 'region', name: '成都市武侯区玉林街道玉林北路社区', displayName: '成都市武侯区玉林街道玉林北路社区', mapVisible: true },
        room: { id: 'room', type: 'room', name: '刘思琪房间', displayName: '刘思琪房间', mapVisible: true },
        unlinkedPark: { id: 'unlinkedPark', type: 'poi', name: '玉林公园', displayName: '玉林公园', mapVisible: true },
        palace: { id: 'palace', type: 'poi', name: '星辉宫殿', displayName: '星辉宫殿', mapVisible: true },
        gate: { id: 'gate', type: 'poi', name: '北城门', displayName: '北城门', mapVisible: true },
      },
      legacyAliases: { 'mapId:room': 'room' },
      identityIndex: {},
      searchIndex: { locationNodeIds: [], byNormalizedName: {} },
      characterLocations: {},
      poiGraph: {
        nodes: ['building3', 'building2', 'province', 'city', 'community', 'room', 'unlinkedPark', 'palace', 'gate'],
        edges: [
          { id: 'edge_building3_building2', fromPoiId: 'building3', toPoiId: 'building2', distanceMeters: 20, distanceText: '约20米' },
          { id: 'edge_palace_gate', fromPoiId: 'palace', toPoiId: 'gate', distanceMeters: 900, distanceText: '约900米' },
        ],
      },
    },
  };

  const graph = context.window.GameModules.realWorldLocationGraph.standardPoiGraph(state);

  assert.deepStrictEqual(graph.nodes.map((node) => node.name), ['锦苑小区3栋', '锦苑小区2栋', '星辉宫殿', '北城门']);
  assert.deepStrictEqual(graph.edges.map((edge) => [edge.from, edge.to, edge.weight]), [['building3', 'building2', 20], ['palace', 'gate', 900]]);
  assert.strictEqual(graph.currentId, 'building3');
});

test('map drag moves cached canvas with transform only', () => {
  const actions = read('publish/real-world-map-actions.js');
  const moveBody = methodBody(actions, 'realWorldMapPanMove', 'realWorldMapPanEnd');
  const queueBody = methodBody(actions, 'queueRealWorldMapViewPaint', 'commitRealWorldMapView');
  assert.ok(actions.includes('realWorldMapRuntime()'));
  assert.ok(actions.includes('drawRealWorldMapCanvas'));
  assert.ok(actions.includes('queueRealWorldMapViewPaint(view = {})'));
  assert.ok(actions.includes('commitRealWorldMapView(view = this.realWorldMapRuntime().liveView)'));
  assert.ok(actions.includes('applyRealWorldMapCanvasTransform(view = {})'));
  assert.ok(moveBody.includes('this.queueRealWorldMapViewPaint(pan.view)'));
  assert.ok(queueBody.includes('this.applyRealWorldMapCanvasTransform(runtime.liveView)'));
  assert.ok(!queueBody.includes('drawRealWorldMapCanvas(runtime.liveView)'));
  assert.ok(!actions.includes('stage.replaceChildren()'));
  assert.ok(!actions.includes('document.createElementNS(ns'));
  assert.ok(!moveBody.includes('ensureMapView(map)'));
  assert.ok(!moveBody.includes('map.view'));
});

test('map canvas draws world once and hit tests through view transform', () => {
  const actions = read('publish/real-world-map-actions.js');
  const drawBody = methodBody(actions, 'drawRealWorldMapCanvas', 'realWorldMapCanvasHitTest');
  const hitBody = methodBody(actions, 'realWorldMapCanvasHitTest', 'realWorldMapHandleCanvasTap');
  assert.ok(actions.includes('const dpr = 1'));
  assert.ok(actions.includes('realWorldMapShortLabel('));
  assert.ok(drawBody.includes('const drawSignature = `${signature}|${size.width}x${size.height}`;'));
  assert.ok(drawBody.includes('if (runtime.canvasDrawSignature === drawSignature && runtime.hitRegions?.length) return;'));
  assert.ok(drawBody.includes('this.applyRealWorldMapCanvasTransform(view);'));
  assert.ok(drawBody.includes('const graph = this.realWorldMapGraph({ map: graphData })'));
  assert.ok(drawBody.includes("ctx.fillText(this.realWorldMapShortLabel(label, current ? 24 : 18), labelX + 12, labelY + labelHeight / 2 + 1)"));
  assert.ok(drawBody.includes("ctx.fillText('i'"));
  assert.ok(hitBody.includes('const x = (event.clientX - rect.left - (Number(view.x) || 0)) / scale;'));
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
  const actions = read('publish/real-world-actions.js');
  const locationFill = read('publish/real-world-agent-location-fill.js');
  assert.ok(loop.includes('completeCachedJsonPrompt(store, options = {})'));
  assert.ok(loop.includes('activeKvCacheSession(store = null, mode = \'real\')') || loop.includes("activeKvCacheSession(store = null, mode = 'real')"));
  assert.ok(loop.includes('pendingKvCacheSession(store'));
  assert.ok(loop.includes('clearPendingKvCacheSession(store'));
  assert.ok(loop.includes('realWorldAgentPendingKvByMode'));
  assert.ok(loop.includes('resolveKvCacheSession(store'));
  assert.ok(loop.includes('loadStepContext(ctx, store, action, data, loadedKeys, loaded, memoryIds, step, materialSession, config.materials, config)'));
  assert.ok(loop.includes('materials = window.GameModules.realWorldMaterials, config = this.realConfig()'));
  assert.ok(loop.includes('tokenMeta: options.tokenMeta'));
  assert.ok(loop.includes('requestOptions.tokenMeta = config.tokenMeta'));
  assert.ok(jsonUtils.includes('useRealWorldKvCache && store'));
  assert.ok(jsonUtils.includes('completeCachedJsonPrompt(store'));
  assert.ok(jsonUtils.includes('kvCacheSession,'));
  assert.ok(jsonUtils.includes('tokenMeta,'));
  assert.ok(jsonUtils.includes('attemptTitle'));
  assert.ok(jsonUtils.includes('max > 1 && i > 0'));
  assert.ok(jsonUtils.includes('重试${i + 1}/${max}') || jsonUtils.includes('重试${i + 1}/'));
  assert.ok(!jsonUtils.includes("'尝试'"));
  assert.ok(fog.includes("source: 'real-world-map-surround-unlock'"));
  assert.ok(fog.includes('useRealWorldKvCache: true'));
  assert.ok(fog.includes('kvCacheSession: state.realWorldAgentPendingKvByMode'));
  assert.ok(fog.includes('logId: result.logId'));
  assert.ok(fog.includes("outputLimitKind: 'stage4'"));
  assert.ok(actions.includes('clearPendingKvCacheSession'));
  assert.ok(loop.includes('requestJsonMode = expectsJson'));
  assert.ok(loop.includes('const wantsDeepThinking = requestJsonMode ? false'));
  assert.ok(loop.includes('const shouldStream = true'));
  assert.ok(locationFill.includes("source: 'real-world-location-fill'"));
  assert.ok(locationFill.includes('useRealWorldKvCache: true'));
  assert.ok(locationFill.includes('locationFillRequestOptions(options = {})'));
  assert.ok(locationFill.includes("requestOptions.outputLimitKind || 'stage4'"));
  assert.ok(locationFill.includes('tokenMeta: requestOptions.tokenMeta'));
});

test('map node tap opens location info directly', () => {
  const html = read('publish/index.html');
  const actions = read('publish/real-world-map-actions.js');
  const map = read('publish/real-world-map.js');
  const tapBody = methodBody(actions, 'realWorldMapHandleCanvasTap', 'paintRealWorldMapView');
  const infoBody = methodBody(actions, 'showRealWorldMapInfo', 'closeRealWorldMapInfo');
  const interiorNodeBody = methodBody(map, 'interiorNode', 'infoNode');
  const showInteriorBody = methodBody(actions, 'showRealWorldMapInterior', 'openRealWorldMapInfoInterior');
  assert.ok(tapBody.includes("if (hit.type === 'info') this.showRealWorldMapInfo(hit.id);"));
  assert.ok(tapBody.includes("else if (hit.type === 'node') this.showRealWorldMapInfo(hit.id);"));
  assert.ok(!tapBody.includes("else if (hit.type === 'node') this.showRealWorldMapInterior(hit.id);"));
  assert.ok(interiorNodeBody.includes('window.GameModules.realWorldLocationGraph?.getNode?.(map?._boundStore || {}, key)'));
  assert.ok(!interiorNodeBody.includes('graphNodeId'));
  assert.ok(!interiorNodeBody.includes('identityKey'));
  assert.ok(!showInteriorBody.includes('realWorldMapInfoNode'));
  assert.ok(!showInteriorBody.includes('fallbackId'));
  assert.ok(infoBody.includes('this.realWorldMap.infoNodeId = id;'));
  assert.ok(!infoBody.includes('window.GameModules.realWorldMap.ensure'));
  assert.ok(infoBody.includes('requestAnimationFrame'));
  assert.ok(infoBody.includes('setTimeout'));
  assert.ok(infoBody.indexOf('setTimeout') < infoBody.indexOf('resolveControlLabel'));
  assert.ok(!html.includes('查看建筑内部'));
  assert.ok(!html.includes('openRealWorldMapInfoInterior($store.game.realWorldMapInfoNode()?.id)'));
  assert.ok(!actions.includes('installRealWorldMapInteriorNativeOpen'));
  assert.ok(!actions.includes('.real-world-map-info-pop .ghost-wide'));
  assert.ok(!html.includes('showRealWorldMapInterior($store.game.realWorldMapInfoNode()?.id); $store.game.closeRealWorldMapInfo()'));
  const infoInteriorBody = methodBody(actions, 'openRealWorldMapInfoInterior', 'closeRealWorldMapInterior');
  assert.ok(infoInteriorBody.includes('this.showRealWorldMapInterior(key);'));
  assert.ok(infoInteriorBody.includes('this.realWorldMap.infoNodeId = \'\';'));
  assert.ok(!infoInteriorBody.includes('closeRealWorldMapInfo'));
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
  assert.ok(showInteriorBody.includes('this.prepareRealWorldMapInteriorFloors(key, { commit: false, node });'));
  assert.ok(showInteriorBody.indexOf('prepareRealWorldMapInteriorFloors') < showInteriorBody.indexOf('this.setRealWorldMapState({ ...map })'));
  assert.ok(!showInteriorBody.includes('this.realWorldMapAfterPaint(() => this.prepareRealWorldMapInteriorFloors(key))'));
  assert.ok(!showInteriorBody.includes('realWorldMap.showInterior'));
  assert.ok(drawBody.includes('const graph = this.realWorldMapGraph({ map: graphData })'));
  assert.ok(!drawBody.includes('realWorldMapNodeControlCachedLine'));
  assert.ok(!drawBody.includes('realWorldMapDrawPill('));
});

test('interior floor signature stays lightweight for room detail changes', () => {
  const context = {
    window: { GameModules: {} },
    document: { addEventListener() {} },
    requestAnimationFrame(callback) { if (typeof callback === 'function') callback(); },
    setTimeout(callback) { if (typeof callback === 'function') callback(); return 0; },
    clearTimeout() {},
  };
  loadScript(context, 'publish/real-world-map-interior.js');
  loadScript(context, 'publish/real-world-map-actions.js');
  const actions = context.window.GameModules.realWorldMapActions;
  const baseNode = {
    interiorLayout: {
      floors: [{
        id: 'floor_1',
        name: '第一层',
        rooms: [{
          id: 'room_101',
          name: '主卧',
          number: '101',
          kind: '卧室',
          residents: ['张三'],
          slotObjects: {
            bed: [{ name: '床', containerContents: ['床单'] }],
          },
        }],
      }],
    },
  };
  const changedNode = JSON.parse(JSON.stringify(baseNode));
  changedNode.interiorLayout.floors[0].rooms[0].slotObjects.bed[0].containerContents.push('枕头');
  const signature = actions.realWorldMapInteriorFloorSignature(baseNode);
  assert.strictEqual(signature, actions.realWorldMapInteriorFloorSignature(changedNode));
  assert.ok(signature.includes('floor_1:第一层:1'));
  assert.ok(!signature.includes('枕头'));
  assert.ok(!signature.includes('床单'));
});

test('interior node only returns the explicitly selected map node', () => {
  const context = {
    window: { GameModules: {} },
    console,
  };
  loadScript(context, 'publish/real-world-map-facts.js');
  loadScript(context, 'publish/real-world-map.js');
  const mapApi = context.window.GameModules.realWorldMap;
  const map = {
    interiorNodeId: 'long_home',
    nodes: [
      {
        id: 'long_home',
        name: '四川省成都市武侯区玉林街道玉林北路社区锦苑小区3栋',
        graphNodeId: 'loc_1',
        interiorLayout: { summary: '', zones: [] },
      },
      {
        id: 'short_home',
        name: '锦苑小区3栋',
        graphNodeId: 'loc_1',
        interiorLayout: {
          floors: [{ id: 'floor_6', name: '第六层', rooms: [{ id: 'room_601', number: '601' }] }],
          zones: [],
        },
      },
    ],
  };
  const node = mapApi.interiorNode(map);
  assert.strictEqual(node.id, 'long_home');
  assert.ok(!Array.isArray(node.interiorLayout.floors));
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
    'refreshRealWorldMapJsonDump()',
    'ensureRealWorldMapNativeInput()',
    'realWorldMapInteriorNode()',
    'realWorldMapInteriorTitle()',
    'realWorldMapInteriorSummary()',
    'realWorldMapInteriorView()',
    'realWorldMapInfoControlLine()',
    'realWorldWordCountValue()',
    'realWorldWordCountValid()',
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

test('graph renderer maps stored json directly without compatibility edges', () => {
  const source = read('publish/real-world-map-graph.js');
  assert.ok(source.includes('Array.isArray(map.nodes) ? map.nodes : []'));
  assert.ok(source.includes('Array.isArray(map.edges) ? map.edges : []'));
  assert.ok(!source.includes('realWorldMapFog'));
  assert.ok(!source.includes('visibleNodes'));
  assert.ok(!source.includes('isMapDisplayNode'));
  assert.ok(!source.includes('fallback'));
  const context = { window: { GameModules: {} }, console };
  context.window.GameModules.realWorldMap = { isMapDisplayNode: (node) => node.mapVisible !== false };
  loadScript(context, 'publish/real-world-map-graph.js');
  const graph = context.window.GameModules.realWorldMapGraph.build({
    currentId: 'a',
    nodes: [
      { id: 'a', name: 'building-a', mapVisible: true },
      { id: 'b', name: 'building-b', mapVisible: true, parentId: 'a' },
    ],
    edges: [],
  });
  assert.strictEqual(graph.nodes.length, 2);
  assert.strictEqual(graph.edges.length, 0);
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

test('interior renderer preserves known floors without rooms', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior.js');
  const interior = context.window.GameModules.realWorldMapInterior;
  const node = {
    name: '锦苑小区3栋',
    interiorLayout: {
      floors: [{ id: 'floor_2', name: '\u7b2c\u4e8c\u5c42', rooms: [] }],
      zones: [],
    },
  };
  const floors = interior.ensureFloors(node, {});
  assert.strictEqual(floors.length, 1);
  assert.strictEqual(floors[0].name, '\u7b2c\u4e8c\u5c42');
  assert.deepStrictEqual(floors[0].rooms, []);
});

test('interior renderer does not synthesize floors from root zones', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior.js');
  const interior = context.window.GameModules.realWorldMapInterior;
  const node = {
    name: '锦苑小区3栋',
    interiorLayout: {
      floors: [],
      zones: [{ id: 'zone_unit_2', name: '2单元', kind: '区域', description: '错误的单元区域' }],
    },
  };
  assert.deepStrictEqual(interior.ensureFloors(node, {}), []);
  assert.deepStrictEqual(node.interiorLayout.floors, []);
});

test('interior room layout persists AI generated slot objects', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior.js');
  const interior = context.window.GameModules.realWorldMapInterior;
  const room = interior.normalizeRoom({
    number: '202',
    residents: ['Liuyou', 'Siqi'],
    slotAssignments: { bed_1: 'Liuyou', bed_2: 'Siqi', living: '\u5ba2\u5385' },
    slotObjects: {
      bed_2: ['pink sheet', 'star lamp', 'rabbit pillow'],
      living: ['blue sofa', 'glass table'],
    },
    layout: {
      shapes: [
        { type: 'rect', id: 'bed_1', x: 20, y: 20, w: 120, h: 80, label: 'Liuyou\u7684\u5367\u5ba4' },
        { type: 'rect', id: 'bed_2', x: 160, y: 20, w: 120, h: 80, label: 'Siqi\u7684\u5367\u5ba4' },
        { type: 'rect', id: 'living', x: 20, y: 120, w: 260, h: 100, label: '\u5ba2\u5385' },
      ],
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
  loadScript(context, 'publish/real-world-map-interior.js');
  const interior = context.window.GameModules.realWorldMapInterior;
  const aiObjectName = '\u661f\u7eb9\u8eba\u6905';
  const aiContents = ['\u8584\u6bef', '\u9065\u63a7\u5668'];
  const room = interior.normalizeRoom({
    number: '202',
    slotAssignments: { bed_2: '\u5218\u601d\u742a' },
    slotObjects: {
      bed_2: [
        { name: aiObjectName, x: 301, y: 119, w: 73, h: 57, containerContents: aiContents },
      ],
    },
    layout: {
      shapes: [
        { type: 'rect', id: 'bed_2', x: 40, y: 52, w: 154, h: 104, label: '\u5218\u601d\u742a\u7684\u5367\u5ba4' },
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
  assert.ok(areaShape, 'layout must keep AI object records on the room area');

  const areaRegion = interior.roomLayoutRegions(layout).find((region) => region.shape === areaShape);
  const detail = interior.roomAreaDetailLayout(room, areaRegion);
  const objectShape = detail.shapes.find((shape) => shape.label === aiObjectName);
  assert.ok(objectShape, 'detail layout must draw AI object by name');
  assert.deepStrictEqual([objectShape.x, objectShape.y, objectShape.w, objectShape.h], [301, 119, 73, 57]);
  assert.deepStrictEqual(Array.from(objectShape.containerContents), aiContents);
});

test('interior unlock normalization persists AI generated room layout without template fallback', () => {
  const context = { window: { GameModules: {} }, console };
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
      layout,
    }],
  }]);
  const [room] = floor.rooms;
  assert.strictEqual(room.layout.shapes[0].id, 'ai_bedroom');
  assert.deepStrictEqual(room.layout.shapes.map((shape) => shape.id), ['ai_bedroom', 'ai_living']);
  assert.strictEqual(room.layout.templateId, undefined);
});

test('interior unlock normalization keeps root zones direct', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const interior = fog.normalizeInterior({
    summary: '直接映射楼层',
    floors: [{ id: 'floor_2', name: '第二层', rooms: [{ number: '202', residents: ['刘悠'] }] }],
    zones: [],
  }, '锦苑小区3栋');
  assert.deepStrictEqual(interior.zones, []);
  assert.strictEqual(interior.floors[0].rooms[0].number, '202');
});

test('surround unlock normalization accepts AI room aliases and preserves known empty floors', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const interior = fog.normalizeInterior({
    summary: 'AI 返回的楼层结构',
    floors: [
      { id: 'floor_1', name: '第一层', rooms: [] },
      {
        id: 'floor_2',
        name: '第二层',
        rooms: [{
          roomNumber: '202',
          roomName: '刘思琪家',
          residents: ['刘思琪'],
        }],
      },
    ],
    zones: [],
  }, '锦苑小区3栋');
  assert.strictEqual(interior.floors.length, 2);
  assert.strictEqual(interior.floors[0].name, '第一层');
  assert.deepStrictEqual(interior.floors[0].rooms, []);
  assert.strictEqual(interior.floors[1].rooms[0].number, '202');
  assert.strictEqual(interior.floors[1].rooms[0].name, '刘思琪家');
});

test('room occupancy label always shows resident user and owner lines', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-interior-templates.js');
  loadScript(context, 'publish/real-world-map-interior.js');
  const interior = context.window.GameModules.realWorldMapInterior;
  const label = interior.roomOccupancyLabel({
    number: '601',
    ownerRefs: [{ type: 'character', id: 'owner-1', name: '乔一' }],
    usageContracts: [{
      status: 'active',
      userRefs: [{ type: 'character', id: 'user-1', name: '乔一' }],
      ownerRefs: [{ type: 'character', id: 'owner-1', name: '乔一' }],
      monthlyRent: 0,
      debtAmount: 0,
    }],
  });
  assert.ok(label.includes('房间：601'));
  assert.ok(label.includes('居住人：乔一'));
  assert.ok(label.includes('使用人：乔一'));
  assert.ok(label.includes('所有人：乔一'));
  const unknown = interior.roomOccupancyLabel({ number: '602' });
  assert.ok(unknown.includes('居住人：未知'));
  assert.ok(unknown.includes('使用人：未知'));
  assert.ok(unknown.includes('所有人：未知'));
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
  const merged = fog.mergeInteriorLayout(existing, payload.interiorLayout || {});
  const desk = merged.floors[0].rooms[0].slotObjects.bed_2.find((item) => item.name === '书桌');
  assert.deepStrictEqual(Array.from(desk.containerContents), ['书本', '台灯']);
  assert.strictEqual(merged.floors[0].rooms.length, 1);
  assert.strictEqual(payload.interiorLayout, undefined);
});

test('surround unlock accepts empty structural patch without retry completeness validation', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const full = fog.validateUnlockPayload({ surroundLocations: [] }, { name: '锦苑小区3栋' }, {}, 'full');
  assert.strictEqual(full.responseMode, 'neighbors');
  assert.deepStrictEqual(full.surroundLocations, []);
  assert.strictEqual(full.interiorLayout, undefined);
  const patch = fog.validateUnlockPayload({ surroundLocations: [] }, { name: '锦苑小区3栋' }, {}, 'patch');
  assert.strictEqual(patch.responseMode, 'neighbors');
  assert.strictEqual(patch.noChange, true);
});

test('surround unlock debug is enabled by default and records raw shape', () => {
  const context = { window: { GameModules: {
    realWorldMap: {
      cleanName: (value) => String(value || '').trim(),
      isAbstractName: () => false,
      isInteriorLocationName: () => false,
      isMapExteriorNode: () => true,
      isCommunityLevelNode: () => false,
    },
  } }, console };
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const state = {};
  assert.strictEqual(fog.debugMode(state), true);
  fog.surroundUnlockDebug(state, 'unit-test', { ok: true });
  assert.strictEqual(state.realWorldMapSurroundUnlockDebugLog.length, 1);
  const payload = fog.validateUnlockPayload({
    当前节点: '锦苑小区3栋',
    周围地点: [{ 距离: '约30米', 地点名: '锦苑小区2栋', 势力: '中华人民共和国·四川省成都市·武侯区' }],
    势力: ['锦苑小区物业·社区管理组织·楼栋管理'],
    地点信息: ['1. 当前节点位于小区内部。'],
    出场人物位置: [{ 姓名: '刘思琪', 当前位置: '2026 现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元202' }],
  }, { name: '锦苑小区3栋' }, {}, 'full');
  assert.strictEqual(payload.debugShape.hasInteriorLayout, false);
  assert.strictEqual(payload.currentNode, '锦苑小区3栋');
  assert.strictEqual(payload.locationInfo.length, 1);
  assert.strictEqual(payload.factionInfo[0], '锦苑小区物业·社区管理组织·楼栋管理');
  assert.strictEqual(payload.debugShape.factionInfoCount, 1);
  assert.strictEqual(payload.surroundLocations[0].name, '锦苑小区2栋');
  assert.strictEqual(payload.surroundLocations[0].distanceText, '约30米');
  assert.strictEqual(payload.surroundLocations[0].faction, '中华人民共和国·四川省成都市·武侯区');
  assert.strictEqual(payload.characterLocations[0].name, '刘思琪');
  assert.strictEqual(payload.characterLocations[0].location, '2026 现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元202');
  assert.strictEqual(payload.characterLocations[0].mapNodeName, '锦苑小区3栋');
});

test('visited unlocked building with empty interior still bootstraps full interior on indoor action', () => {
  const context = {
    window: {
      GameModules: {
        realWorldMap: {
          isInteriorLocationName(name) {
            return /房间|卧室|客厅|厨房|卫生间/u.test(String(name || ''));
          },
        },
      },
    },
    console,
  };
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  assert.strictEqual(
    fog.shouldBootstrapMissingInterior(
      { realWorldInput: '我前往刘思思房间' },
      { narration: '推开门进入卧室，看到床和书桌。' },
      { name: '刘思思房间' },
      { name: '锦苑小区3栋', interiorLayout: { summary: '', zones: [] }, visited: true, exteriorRingUnlocked: true },
    ),
    true,
  );
  assert.strictEqual(
    fog.shouldBootstrapMissingInterior(
      { realWorldInput: '我前往刘思思房间' },
      { narration: '推开门进入卧室，看到床和书桌。' },
      { name: '刘思思房间' },
      { name: '锦苑小区3栋', interiorLayout: { floors: [{ id: 'floor_2', rooms: [{ id: 'room_201', name: '201' }] }] } },
    ),
    false,
  );
});

test('surround unlock no longer applies interior json', () => {
  const source = read('publish/real-world-map-fog.js');
  assert.ok(!source.includes('finalAnchor.interiorLayout = this.mergeInteriorLayout'));
  assert.ok(!source.includes('syncInteriorLayoutAliases'));
  assert.ok(!source.includes('findProjectedAnchorNode'));
  assert.ok(!source.includes('applyInteriorObjectPatchToGraph'));
  assert.ok(!source.includes('apply-audit-fill-patch'));
});

test('surround unlock logs prompt freshness and apply boundaries', () => {
  const source = read('publish/real-world-map-fog.js');
  assert.ok(source.includes('promptForbidsInteriorLayout'));
  assert.ok(source.includes('promptHasSurroundFactionRule'));
  assert.ok(source.includes('promptHasCharacterLocationField'));
  assert.ok(source.includes('promptHasProfileLocationFormat'));
  assert.ok(source.includes('raw-response'));
  assert.ok(source.includes('parsed-response'));
  assert.ok(source.includes('apply-done'));
  assert.ok(source.includes('applyCharacterLocations'));
});

test('surround unlock applies neighbor faction and appearing character locations', async () => {
  const context = {
    window: {
      GameModules: {
        realWorldMap: {
          cleanName: (value) => String(value || '').trim(),
          isAbstractName: () => false,
          isInteriorLocationName: () => false,
          isMapExteriorNode: () => true,
          isCommunityLevelNode: () => false,
          isMapDisplayNode: () => true,
          resolveExteriorAnchorNode: (map, node) => node,
          factTime: () => '2026-07-23T12:00:00.000Z',
          applyRouteLinks: () => {},
        },
        orgTerritory: { ensureMapControls() {}, bumpOrgExposureOnScheduleLocation() {} },
        realWorldLocationGraph: {
          poiAncestor: () => null,
          getNode(state, ref) {
            const name = String(ref || '').trim();
            const nodes = Object.values(state.locationGraph?.nodesById || {});
            return nodes.find((node) => node.id === name || node.name === name) || null;
          },
          ensurePoiFromPayload(state, payload = {}) {
            state.locationGraph = state.locationGraph || { nodesById: {}, poiGraph: { nodes: [], edges: [] } };
            const id = `loc_${payload.name}`;
            const node = {
              id,
              name: payload.name,
              parentId: payload.parentId || '',
              descriptionFacts: Array.isArray(payload.descriptionFacts) ? payload.descriptionFacts.slice() : [],
              effectiveAuthorityRef: payload.effectiveAuthorityRef || null,
            };
            state.locationGraph.nodesById[id] = node;
            if (!state.locationGraph.poiGraph.nodes.includes(id)) state.locationGraph.poiGraph.nodes.push(id);
            return node;
          },
          ensureRouteEdge() { return { ok: true }; },
          standardPoiGraph(state) {
            return {
              nodes: Object.values(state.locationGraph?.nodesById || {}),
              edges: state.locationGraph?.poiGraph?.edges || [],
            };
          },
          setCharacterCurrentNode(state, characterId, nodeId, data = {}) {
            state.locationGraph = state.locationGraph || { characterLocations: {} };
            state.locationGraph.characterLocations = state.locationGraph.characterLocations || {};
            const node = this.getNode(state, nodeId);
            state.locationGraph.characterLocations[characterId] = {
              characterId,
              nodeId,
              locationName: node?.name || '',
              characterName: data.characterName || characterId,
            };
            return state.locationGraph.characterLocations[characterId];
          },
          findCharacterByRef(state, ref = {}) {
            return (state.rpgStates && Object.values(state.rpgStates).find((item) => item?.name === ref.name || item?.profile?.name === ref.name)) || null;
          },
          characterKey(character) {
            if (character && typeof character === 'object') {
              return String(character.id || character.profile?.name || character.name || 'player-self').trim();
            }
            return String(character || 'player-self').trim();
          },
        },
      },
    },
    console,
  };
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const fullLocation = '2026 现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元202';
  const state = {
    locationGraph: {
      nodesById: {
        loc_home: { id: 'loc_home', name: '锦苑小区3栋', identityKey: 'home' },
      },
      poiGraph: { nodes: ['loc_home'], edges: [] },
      characterLocations: {},
    },
    characterSchedules: {},
    rpgStates: {
      sis: { id: 'sis', name: '刘思琪', profile: { name: '刘思琪', currentLocation: '当前位置未知' }, values: { current_location: { name: '当前位置未知' } } },
    },
    realWorldMap: {
      currentId: 'home',
      current: '锦苑小区3栋',
      nodes: [{ id: 'home', name: '锦苑小区3栋', mapVisible: true, revealed: true, descriptionFacts: [] }],
      edges: [],
    },
  };
  const map = state.realWorldMap;
  const anchor = map.nodes[0];
  const payload = fog.validateUnlockPayload({
    当前节点: '锦苑小区3栋',
    周围地点: [{ 距离: '约30米', 地点名: '锦苑小区2栋', 势力: '中华人民共和国·四川省成都市·武侯区' }],
    势力: [
      '中华人民共和国·四川省成都市·武侯区',
      '玉林街道玉林北路社区·基层治理组织·社区管辖',
    ],
    地点信息: ['1. 当前节点位于锦苑小区内部，为住宅楼栋。'],
    出场人物位置: [{ 姓名: '刘思琪', 当前位置: fullLocation }],
  }, anchor, map, 'full', { requiredLocationNames: ['刘思琪'] });

  await fog.applySurroundUnlock(state, map, anchor, anchor, payload);

  const neighbor = Object.values(state.locationGraph.nodesById).find((node) => node.name === '锦苑小区2栋');
  assert.ok(neighbor);
  assert.ok(neighbor.descriptionFacts.some((item) => item.includes('势力：中华人民共和国·四川省成都市·武侯区')));
  assert.strictEqual(neighbor.effectiveAuthorityRef?.name, '中华人民共和国·四川省成都市·武侯区');
  assert.ok(anchor.descriptionFacts.some((item) => item.includes('势力：中华人民共和国·四川省成都市·武侯区')));
  assert.strictEqual(state.characterSchedules.sis.currentLocation, '锦苑小区3栋');
  assert.strictEqual(state.rpgStates.sis.profile.currentLocation, fullLocation);
  assert.ok(!Object.prototype.hasOwnProperty.call(state.rpgStates.sis.values, 'current_location'));
});

test('surround unlock keeps AI character location text even when map format is invalid', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const payload = fog.validateUnlockPayload({
    周围地点: [],
    出场人物位置: [{ 姓名: '刘思琪', ID: 'rel-ai-247528', 当前位置: '锦苑小区3栋' }],
  }, { name: '锦苑小区3栋' }, {}, 'full');
  assert.strictEqual(payload.characterLocations.length, 1);
  assert.strictEqual(payload.characterLocations[0].location, '锦苑小区3栋');
  assert.strictEqual(payload.characterLocations[0].id, 'rel-ai-247528');
  assert.strictEqual(payload.characterLocations[0].mapNodeName, '');
});

test('surround unlock keeps six-part admin chain and uses second-last as map node', () => {
  const context = { window: { GameModules: {} }, console };
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const six = '中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室';
  const payload = fog.validateUnlockPayload({
    周围地点: [],
    出场人物位置: [{
      姓名: '刘思琪',
      当前位置: six,
    }],
  }, { name: '锦苑小区3栋' }, {}, 'full');
  assert.strictEqual(payload.characterLocations.length, 1);
  assert.strictEqual(payload.characterLocations[0].location, six);
  assert.strictEqual(payload.characterLocations[0].mapNodeName, '锦苑小区3栋');
  assert.strictEqual(payload.characterLocations[0].interiorPosition, '2单元601室');
});

test('surround unlock missing required names does not fail validation', () => {
  const context = { window: { GameModules: {
    realWorldMap: {
      cleanName: (value) => String(value || '').trim(),
      isAbstractName: () => false,
      isInteriorLocationName: () => false,
      isMapExteriorNode: () => true,
      isCommunityLevelNode: () => false,
    },
  } }, console };
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const payload = fog.validateUnlockPayload({
    当前节点: '锦苑小区3栋',
    周围地点: [],
    势力: [],
    地点信息: [],
    出场人物位置: [{ 姓名: '刘思琪', 当前位置: '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601' }],
  }, { name: '锦苑小区3栋' }, {}, 'full', { requiredLocationNames: ['刘思琪', '刘悠'] });
  assert.strictEqual(payload.characterLocations.length, 1);
  assert.strictEqual(payload.characterLocations[0].name, '刘思琪');
});

test('surround unlock writes profile.currentLocation for matched character', async () => {
  const context = {
    window: {
      GameModules: {
        realWorldMap: {
          cleanName: (value) => String(value || '').trim(),
          isAbstractName: () => false,
          isInteriorLocationName: () => false,
          isMapExteriorNode: () => true,
          isCommunityLevelNode: () => false,
          isMapDisplayNode: () => true,
          resolveExteriorAnchorNode: (map, node) => node,
          factTime: () => '2026-07-23T12:00:00.000Z',
          applyRouteLinks: () => {},
        },
        orgTerritory: { ensureMapControls() {}, bumpOrgExposureOnScheduleLocation() {} },
        characterStateStore: { saved: [], save(state) { this.saved.push(state); return state; } },
        realWorldLocationGraph: {
          poiAncestor: () => null,
          getNode() { return null; },
          ensurePoiFromPayload() { return null; },
          ensureRouteEdge() { return null; },
          standardPoiGraph() { return { nodes: [], edges: [] }; },
          setCharacterCurrentNode() { return null; },
          findCharacterByRef(state, ref = {}) {
            return Object.values(state.rpgStates || {}).find((item) => item?.name === ref.name || item?.profile?.name === ref.name) || null;
          },
          characterKey(character) {
            return String(character?.id || character?.name || 'player-self').trim();
          },
        },
      },
    },
    console,
  };
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const full = '2026 现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601';
  const state = {
    rpgStates: {
      sis: { id: 'sis', name: '刘思琪', profile: { name: '刘思琪' }, values: { current_location: { name: '当前位置未知' } } },
    },
    characterSchedules: {},
    realWorldMap: { currentId: 'home', current: '锦苑小区3栋', nodes: [{ id: 'home', name: '锦苑小区3栋', revealed: true }], edges: [] },
  };
  const map = state.realWorldMap;
  const payload = fog.validateUnlockPayload({
    周围地点: [],
    出场人物位置: [{ 姓名: '刘思琪', 当前位置: full }],
  }, map.nodes[0], map, 'full');
  await fog.applySurroundUnlock(state, map, map.nodes[0], map.nodes[0], payload);
  assert.strictEqual(state.rpgStates.sis.profile.currentLocation, full);
  assert.ok(!Object.prototype.hasOwnProperty.call(state.rpgStates.sis.values, 'current_location'));
  assert.strictEqual(context.window.GameModules.characterStateStore.saved[0]?.profile?.currentLocation, full);
});

test('surround unlock matches by ID and merges onto live card', async () => {
  const context = {
    window: {
      GameModules: {
        realWorldMap: {
          cleanName: (value) => String(value || '').trim(),
          isAbstractName: () => false,
          isInteriorLocationName: () => false,
          isMapExteriorNode: () => true,
          isCommunityLevelNode: () => false,
          isMapDisplayNode: () => true,
          resolveExteriorAnchorNode: (map, node) => node,
          factTime: () => '2026-07-23T12:00:00.000Z',
          applyRouteLinks: () => {},
        },
        orgTerritory: { ensureMapControls() {}, bumpOrgExposureOnScheduleLocation() {} },
        characterStateStore: null,
        realWorldLocationGraph: {
          poiAncestor: () => null,
          getNode() { return null; },
          ensurePoiFromPayload() { return null; },
          ensureRouteEdge() { return null; },
          standardPoiGraph() { return { nodes: [], edges: [] }; },
          setCharacterCurrentNode() { return null; },
          findCharacterByRef() { return null; },
          characterKey(character) {
            return String(character?.id || character?.name || '').trim();
          },
        },
      },
    },
    console,
  };
  loadScript(context, 'publish/character-state-store.js');
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/real-world-map-fog.js');
  const fog = context.window.GameModules.realWorldMapFog;
  const storeApi = context.window.GameModules.characterStateStore;
  const full = '2026 现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室内楼梯上第一间房间床上';
  const live = {
    id: 'rel-ai-247528',
    name: '刘思琪',
    profile: { id: 'rel-ai-247528', name: '刘思琪' },
    values: { current_location: { name: '当前位置未知' } },
  };
  const state = {
    rpgStates: { 'rel-ai-247528': live },
    characterSchedules: {},
    realWorldMap: { currentId: 'home', current: '锦苑小区3栋', nodes: [{ id: 'home', name: '锦苑小区3栋', revealed: true }], edges: [] },
  };
  storeApi.bindLiveHost(state);
  const stale = {
    id: 'rel-ai-247528',
    name: '刘思琪',
    profile: { id: 'rel-ai-247528', name: '刘思琪' },
    values: { current_location: { name: '当前位置未知' } },
  };
  const payload = fog.validateUnlockPayload({
    周围地点: [],
    出场人物位置: [{ 姓名: '刘思琪', ID: 'rel-ai-247528', 当前位置: full }],
  }, state.realWorldMap.nodes[0], state.realWorldMap, 'full');
  assert.strictEqual(payload.characterLocations[0].id, 'rel-ai-247528');
  assert.strictEqual(payload.characterLocations[0].interiorPosition, '2单元601室内楼梯上第一间房间床上');
  // Simulate a stale copy being present; write must still land on live.
  state.rpgStates['rel-ai-247528'] = live;
  await fog.applyCharacterLocations(state, payload.characterLocations);
  assert.strictEqual(live.profile.currentLocation, full);
  assert.strictEqual(state.rpgStates['rel-ai-247528'].profile.currentLocation, full);
  assert.strictEqual(state.characterSchedules['rel-ai-247528'].profileCurrentLocation, full);
  // adopt/mergeOntoLive must not clobber a live recorded location with a stale clone's alternate value
  stale.profile.currentLocation = '2026 现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·客厅沙发上';
  storeApi.adopt(stale, state);
  assert.strictEqual(live.profile.currentLocation, full);
});

test('surround unlock request retries when prompt carries structure rules', () => {
  const source = read('publish/real-world-map-fog.js');
  assert.ok(source.includes('max: 2'));
  assert.ok(source.includes('需更新=否且正文未改地点'));
  assert.ok(!source.includes('出场人物位置未覆盖全部需更新人物'));
  assert.ok(!source.includes("throw new Error('出场人物位置缺少需更新人物"));
  assert.ok(!source.includes("throw new Error('surroundLocations 为空')"));
  assert.ok(!source.includes("throw new Error('interiorLayout 为空')"));
  assert.ok(!source.includes("throw new Error('patch 为空')"));
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
