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

async function main() {
  const context = {
    window: { GameModules: {}, Alpine: { raw: (value) => value } },
    console,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Set,
    Map,
    Error,
    Promise,
    WeakSet,
  };
  loadScript(context, 'publish/storage.js');
  loadScript(context, 'publish/domain/storage/restore-state-helpers.js');
  loadScript(context, 'publish/real-world-map.js');
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/character-state-store.js');
  loadScript(context, 'publish/real-world-location-graph.js');
  loadScript(context, 'publish/real-world-map-fog.js');

  const mapApi = context.window.GameModules.realWorldMap;
  const fog = context.window.GameModules.realWorldMapFog;
  const graph = context.window.GameModules.realWorldLocationGraph;
  const storage = context.window.GameModules.storage;
  const restoreHelpers = context.window.GameModules.domain.storage.restoreStateHelpers;
  fog.mapApi = () => mapApi;

  const aiJson = {
    当前节点: '锦苑小区3栋',
    周围地点: [
      { 距离: '约20米', 地点名: '锦苑小区2栋', 势力: '中华人民共和国·四川省成都市·武侯区' },
      { 距离: '约25米', 地点名: '锦苑小区4栋', 势力: '中华人民共和国·四川省成都市·武侯区' },
      { 距离: '约40米', 地点名: '锦苑小区正门', 势力: '中华人民共和国·四川省成都市·武侯区' },
    ],
    势力: ['中华人民共和国·四川省成都市·武侯区'],
    地点信息: ['1. 当前节点位于锦苑小区内部，为住宅楼栋。'],
    出场人物位置: [],
  };

  const state = {
    started: true,
    phoneSetupDone: true,
    playerProfile: {},
    playerName: '刘悠',
    roleCardSetup: {},
    log: [],
    choices: [],
    realWorldThinkMode: false,
    realWorldSceneTitle: '现实世界',
    realWorldLocationName: '锦苑小区3栋',
    realWorldMap: {
      current: '锦苑小区3栋',
      currentId: 'home',
      mapAnchorId: 'home',
      nodes: [{
        id: 'home',
        name: '锦苑小区3栋',
        visited: true,
        revealed: true,
        mapVisible: true,
        // Legacy false-positive: marked unlocked but no neighbors persisted.
        exteriorRingUnlocked: true,
      }],
      edges: [],
    },
    locationGraph: null,
    realWorldQuest: '',
    realWorldStatus: '',
    realWorldChoices: [],
    realWorldLog: [],
    realWorldLongingEvents: [],
    realWorldlineState: { events: [], plots: [], pendingPlot: null },
    realWorldSystemRecords: [],
    realWorldAgentKvByMode: {},
    characterSchedules: {},
    appearingLocationById: {},
    metricsReady: true,
    metricNotes: '',
    quest: '',
    mindText: '',
    feedbackSource: '',
    characterIntent: '',
    mood: '',
    trust: 0,
    resistance: 0,
    rpgPanelCharacterId: '',
    saves: [],
    async save() {
      this.saves.push(storage.snapshot(this));
    },
    refreshRealWorldMapJsonDump() {
      const payload = graph.standardPoiGraph(this) || { currentId: '', nodes: [], edges: [] };
      this.realWorldMapJsonDump = JSON.stringify(payload, null, 2);
      return this.realWorldMapJsonDump;
    },
  };

  const map = state.realWorldMap;
  const anchor = map.nodes[0];
  graph.ensureGraphState(state);

  const before = graph.standardPoiGraph(state);
  assert.strictEqual(before.nodes.length, 1, 'orphan home should still appear in dump');
  assert.strictEqual(before.edges.length, 0);
  assert.strictEqual(
    fog.shouldUnlockSurroundings(map, anchor, state),
    true,
    'false-positive exteriorRingUnlocked must not block Stage4 when graph has no neighbors',
  );

  fog.generateSurroundUnlock = async () => fog.validateUnlockPayload(aiJson, anchor, map, 'full');
  fog.applyCharacterLocations = async () => [];
  fog.healMissingCharacterLocationsLocally = async () => [];
  fog.appearingCharacterNames = () => [];
  fog.appearingCharacterLocationSnapshots = () => [];
  fog.charactersNeedingProfileLocation = () => [];
  fog.shouldBootstrapMissingInterior = () => false;
  fog.shouldReviewKnownLocationPatch = () => false;
  fog.markVisited = () => ({ firstVisit: false, anchor });
  fog.syncRevealed = () => {};
  fog.surroundUnlockDebug = () => {};

  const result = await fog.afterLocationUpdate(state, { narration: '你站在锦苑小区3栋门口。' });
  assert.ok((result.unlocked || []).length >= 3, `expected unlocked neighbors, got ${JSON.stringify(result.unlocked)}`);

  const dump = JSON.parse(state.refreshRealWorldMapJsonDump());
  assert.ok(dump.nodes.length >= 4, `dump nodes after AI apply: ${dump.nodes.length}`);
  assert.ok(dump.edges.length >= 3, `dump edges after AI apply: ${dump.edges.length}`);
  assert.ok(state.saves.length >= 1, 'afterLocationUpdate must call save()');

  const saved = state.saves[0];
  assert.ok(saved.locationGraph, 'save snapshot must include locationGraph');
  assert.ok((saved.locationGraph.poiGraph?.nodes || []).length >= 4, 'saved poiGraph.nodes');
  assert.ok((saved.locationGraph.poiGraph?.edges || []).length >= 3, 'saved poiGraph.edges');
  assert.ok((saved.realWorldMap?.nodes || []).length >= 4, 'saved legacy map nodes');

  const restored = {
    ...state,
    locationGraph: null,
    realWorldMap: {
      current: '锦苑小区3栋',
      currentId: 'home',
      mapAnchorId: 'home',
      nodes: [{ id: 'home', name: '锦苑小区3栋', visited: true, revealed: true, mapVisible: true }],
      edges: [],
    },
  };
  restoreHelpers.normalizeRealWorldState(restored, saved);
  const restoredDump = graph.standardPoiGraph(restored);
  assert.ok(restoredDump.nodes.length >= 4, `restored dump nodes: ${restoredDump.nodes.length}`);
  assert.ok(restoredDump.edges.length >= 3, `restored dump edges: ${restoredDump.edges.length}`);
  assert.strictEqual(
    fog.shouldUnlockSurroundings(restored.realWorldMap, restored.realWorldMap.nodes.find((n) => n.name === '锦苑小区3栋') || restored.realWorldMap.nodes[0], restored),
    false,
    'after neighbors persist, Stage4 surround unlock should skip',
  );

  console.log('PASS surround unlock AI JSON inserts into save snapshot and dump roundtrip');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
