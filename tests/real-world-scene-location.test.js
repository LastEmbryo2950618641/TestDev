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
loadScript(context, 'publish/real-world-utility-actions.js');

const full = '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·2单元601室卧室床上';
const host = {
  realWorldLocationName: '锦苑小区3栋',
  playerProfile: { currentLocation: '' },
  appearingLocationById: {},
  characterSchedules: {},
  rpgStates: {
    'player-self': {
      id: 'player-self',
      profile: { id: 'player-self', name: '刘悠', currentLocation: '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·客厅' },
      values: {},
    },
    'rel-ai-247528': {
      id: 'rel-ai-247528',
      profile: { id: 'rel-ai-247528', name: '刘思琪', currentLocation: full },
      values: { current_location: { name: '锦苑小区3栋', currentLocation: full } },
    },
  },
  playerIdentityState() { return this.rpgStates['player-self']; },
  sharedControlState() { return null; },
  controlLinkLocationText(state) {
    return context.window.GameModules.currentLocationField.fromCharacterState(state) || '当前位置未登记';
  },
  ...context.window.GameModules.realWorldUtilityActions,
};

assert.strictEqual(host.realWorldSceneLocationText(), host.rpgStates['player-self'].profile.currentLocation);

host.rpgStates['player-self'].profile.currentLocation = '';
host.rpgStates['player-self'].values.current_location = { name: '当前位置未知' };
host.playerProfile.currentLocation = full;
host.characterSchedules['player-self'] = { profileCurrentLocation: full };
assert.strictEqual(host.realWorldSceneLocationText(), '');

host.rpgStates['player-self'].profile.currentLocation = '中华人民共和国·四川省成都市·武侯区·锦苑小区3栋·客厅';
host.rpgStates['player-self'].values = {};
host.playerProfile.currentLocation = '';
host.characterSchedules = {};

host.sharedControlState = function sharedControlState() { return this.rpgStates['rel-ai-247528']; };
assert.strictEqual(host.realWorldSceneLocationText(), full);

const indexHtml = read('publish/index.html');
assert.ok(indexHtml.includes('realWorldSceneLocationText()'));
assert.ok(!indexHtml.includes('`地点｜${entry.locationName}`'));
assert.ok(!indexHtml.includes("realWorldSceneLocationText() || '现实地点'"));

console.log('PASS real-world scene location shows full profile chain');
