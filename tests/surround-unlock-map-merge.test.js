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
    window: { GameModules: {} },
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
  };
  loadScript(context, 'publish/real-world-map.js');
  loadScript(context, 'publish/current-location-field.js');
  loadScript(context, 'publish/character-state-store.js');
  loadScript(context, 'publish/real-world-location-graph.js');
  loadScript(context, 'publish/real-world-map-fog.js');

  const mapApi = context.window.GameModules.realWorldMap;
  const fog = context.window.GameModules.realWorldMapFog;
  const graph = context.window.GameModules.realWorldLocationGraph;
  fog.mapApi = () => mapApi;

  assert.strictEqual(fog.parseDistanceMeters('约20米'), 20);
  assert.strictEqual(fog.parseDistanceMeters('约1.5公里'), 1500);

  const state = {
    realWorldLocationName: '锦苑小区3栋',
    realWorldMap: {
      current: '锦苑小区3栋',
      currentId: 'home',
      mapAnchorId: 'home',
      nodes: [{ id: 'home', name: '锦苑小区3栋', visited: true, revealed: true, mapVisible: true }],
      edges: [],
    },
    rpgStates: {},
    characterSchedules: {},
    appearingLocationById: {},
  };
  const map = state.realWorldMap;
  const anchor = map.nodes[0];
  const raw = {
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
  const payload = fog.validateUnlockPayload(raw, anchor, map, 'full');
  assert.strictEqual(payload.surroundLocations.length, 3);
  assert.strictEqual(payload.surroundLocations[0].distanceMeters, 20);

  await fog.applySurroundUnlock(state, map, anchor, anchor, payload);
  const std = graph.standardPoiGraph(state);
  assert.ok(std.nodes.length >= 4, `expected merged graph nodes, got ${std.nodes.length}`);
  assert.ok(std.edges.length >= 3, `expected route edges, got ${std.edges.length}`);
  assert.ok((state.realWorldMap.nodes || []).length >= 4, 'legacy big map must receive projected neighbors');
  assert.ok((state.realWorldMap.edges || []).length >= 3, 'legacy big map must receive projected edges');

  // Persist contract: locationGraph must be snapshotable.
  const storageSource = read('publish/storage.js');
  assert.ok(storageSource.includes('locationGraph: this.snapshotPlainValue(store.locationGraph)'));
  const restoreSource = read('publish/domain/storage/restore-state-helpers.js');
  assert.ok(restoreSource.includes('store.locationGraph = this.rawLargeValue(save.locationGraph'));

  console.log('PASS surround unlock projects into big map and persists locationGraph');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
