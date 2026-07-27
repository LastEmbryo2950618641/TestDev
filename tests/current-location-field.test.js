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

const context = { window: { GameModules: {} }, console };
loadScript(context, 'publish/current-location-field.js');
const api = context.window.GameModules.currentLocationField;

const canonical = '2026现代都市现实世界·中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601号卧室右侧床边';
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.parse(canonical))), {
  valid: true,
  value: canonical,
  currentWorld: '2026现代都市现实世界',
  currentFaction: '中华人民共和国',
  hierarchyParts: ['四川省', '成都市', '武侯区'],
  mapNodeName: '锦苑小区3栋',
  detailPosition: '2单元601号卧室右侧床边',
});
assert.strictEqual(api.isValidProfileFormat('世界甲·势力乙·地图节点·详细位置'), true);
assert.strictEqual(api.isValidProfileFormat('世界甲·势力乙·地图节点'), false);
assert.strictEqual(api.isValidProfileFormat('世界甲·未知·地图节点·详细位置'), false);
assert.strictEqual(api.currentWorld(canonical), '2026现代都市现实世界');
assert.strictEqual(api.currentFaction(canonical), '中华人民共和国');
assert.deepStrictEqual(Array.from(api.hierarchyParts(canonical)), ['四川省', '成都市', '武侯区']);

assert.strictEqual(api.isValidProfileFormat('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元202'), true);
assert.strictEqual(api.isValidProfileFormat('中华人民共和国・四川省成都市・武侯区・锦苑小区3栋・2单元601'), true);
assert.strictEqual(api.isValidProfileFormat('中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室'), true);
assert.strictEqual(api.isValidProfileFormat('锦苑小区3栋'), false);
assert.strictEqual(api.isValidProfileFormat('当前位置未知'), false);
assert.strictEqual(api.isValidProfileFormat('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·未知'), false);
assert.strictEqual(
  api.coerceToProfileFormat('中华人民共和国·四川省·成都市·武侯区锦苑小区3栋·2单元601号'),
  '中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601号',
);
assert.strictEqual(
  api.isValidProfileFormat('中华人民共和国·四川省·成都市·武侯区锦苑小区3栋·2单元601号'),
  true,
);
// Persist path stores AI text as-is (normalize only); coerce is for map helpers only.
assert.strictEqual(
  api.stateValueFromText('中华人民共和国·四川省·成都市·武侯区锦苑小区3栋·2单元601号').currentLocation,
  '中华人民共和国·四川省·成都市·武侯区锦苑小区3栋·2单元601号',
);
assert.strictEqual(
  api.isRecordedLocation('中华人民共和国·四川省·成都市·武侯区锦苑小区3栋·2单元601号'),
  true,
);
assert.strictEqual(api.isRecordedLocation('当前位置未知'), false);
assert.strictEqual(api.fromCharacterState({ values: { current_location: { name: '当前位置未知' } } }), '');
assert.strictEqual(api.displayFromCharacterState({ values: { current_location: { name: '当前位置未知' } } }), '');
assert.strictEqual(api.displayFromCharacterState({ values: { current_location: { currentLocation: '锦苑小区3栋' } } }), '');
assert.strictEqual(api.displayFromCharacterState({ profile: { currentLocation: '锦苑小区3栋' } }), '锦苑小区3栋');
assert.strictEqual(
  api.coerceToProfileFormat('中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室'),
  '中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室',
);
assert.strictEqual(api.mapNodeName('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元202'), '锦苑小区3栋');
assert.strictEqual(api.mapNodeName('中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室'), '锦苑小区3栋');
assert.strictEqual(api.interiorPosition('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元202'), '2单元202');
assert.strictEqual(api.interiorPosition('中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室'), '2单元601室');
assert.strictEqual(
  api.interiorPosition('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601室内楼梯上第一间房间床上'),
  '2单元601室内楼梯上第一间房间床上',
);
assert.strictEqual(
  api.mapNodeName('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601室内楼梯上第一间房间床上'),
  '锦苑小区3栋',
);
assert.strictEqual(api.isValidProfileFormat('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601室内楼梯上第一间房间床上'), true);
assert.strictEqual(api.forceChain('中华人民共和国·四川省·成都市·武侯区·锦苑小区3栋·2单元601室'), '中华人民共和国·四川省·成都市·武侯区');
const sceneBuilt = api.buildSceneProfileLocation({
  selectedWork: '2026现代都市现实世界',
  playerProfile: {},
  rpgStates: { 'player-self': { id: 'player-self', profile: {}, values: { current_location: { name: '当前位置未知' } } } },
  characterSchedules: { 'rel-ai-247528': { currentLocation: '锦苑小区3栋' } },
  realWorldMap: {
    current: '锦苑小区3栋',
    mapAnchorId: 'home',
    nodes: [{ id: 'home', name: '锦苑小区3栋', descriptionFacts: ['势力：中华人民共和国·四川省成都市·武侯区'] }],
  },
}, { id: 'rel-ai-247528', profile: { id: 'rel-ai-247528' }, values: {} });
assert.strictEqual(sceneBuilt, '2026现代都市现实世界·中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·同场景室内');
const state = api.stateValueFromText('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元202', null, 'test');
assert.strictEqual(state.name, '锦苑小区3栋');
assert.strictEqual(state.currentLocation, '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元202');
const canonicalState = api.stateValueFromText(canonical, null, 'test');
assert.strictEqual(canonicalState.currentWorld, '2026现代都市现实世界');
assert.strictEqual(canonicalState.currentFaction, '中华人民共和国');
assert.deepStrictEqual(Array.from(canonicalState.hierarchyParts), ['四川省', '成都市', '武侯区']);
assert.strictEqual(canonicalState.mapNodeName, '锦苑小区3栋');
assert.strictEqual(canonicalState.detailPosition, '2单元601号卧室右侧床边');
console.log('PASS current-location-field format helpers');
