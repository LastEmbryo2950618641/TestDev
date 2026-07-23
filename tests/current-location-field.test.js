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
  playerProfile: {},
  rpgStates: { 'player-self': { id: 'player-self', profile: {}, values: { current_location: { name: '当前位置未知' } } } },
  characterSchedules: { 'rel-ai-247528': { currentLocation: '锦苑小区3栋' } },
  realWorldMap: {
    current: '锦苑小区3栋',
    mapAnchorId: 'home',
    nodes: [{ id: 'home', name: '锦苑小区3栋', descriptionFacts: ['势力：中华人民共和国·四川省成都市·武侯区'] }],
  },
}, { id: 'rel-ai-247528', profile: { id: 'rel-ai-247528' }, values: {} });
assert.strictEqual(sceneBuilt, '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·同场景室内');
const state = api.stateValueFromText('中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元202', null, 'test');
assert.strictEqual(state.name, '锦苑小区3栋');
assert.strictEqual(state.currentLocation, '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元202');
console.log('PASS current-location-field format helpers');
