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
loadScript(context, 'publish/domain/control/state.js');
const api = context.window.GameModules.domain.control.state;

test('player location label prefers map/current when not controlling', () => {
  const store = {
    hasActiveControlTarget: () => false,
    realWorldLocationName: '锦苑小区3栋',
    realWorldMap: { current: '锦苑小区3栋' },
    playerIdentityState: () => ({ id: 'player-self', values: { current_location: { name: '当前位置未登记' } } }),
    playerProfile: { currentLocation: '' },
    characterSchedules: {},
    controlLinkLocationText(state) {
      const location = state?.values?.current_location;
      return location?.name || '当前位置未登记';
    },
  };
  assert.strictEqual(api.realWorldLocationLabel.call(store), '锦苑小区3栋');
});

test('controlled role location label uses shared control location', () => {
  const store = {
    hasActiveControlTarget: () => true,
    sharedControlTargetId: 'sis',
    sharedControlState: () => ({
      id: 'sis',
      name: '刘思琪',
      values: { current_location: { name: '锦苑小区2栋' } },
    }),
    activeControlTargetState: () => store.sharedControlState(),
    characterSchedules: { sis: { currentLocation: '旧日程地点' } },
    controlLinkLocationText(state) {
      return state?.values?.current_location?.name || '当前位置未登记';
    },
  };
  assert.strictEqual(api.realWorldLocationLabel.call(store), '锦苑小区2栋');
});

test('controlled role falls back to character schedule location', () => {
  const store = {
    hasActiveControlTarget: () => true,
    sharedControlTargetId: 'sis',
    sharedControlState: () => ({
      id: 'sis',
      name: '刘思琪',
      values: { current_location: { name: '当前位置未登记' } },
    }),
    activeControlTargetState: () => store.sharedControlState(),
    characterSchedules: { sis: { currentLocation: '锦苑小区正门' } },
    controlLinkLocationText() { return '当前位置未登记'; },
  };
  assert.strictEqual(api.realWorldLocationLabel.call(store), '锦苑小区正门');
});

test('scene title binds realWorldLocationLabel', () => {
  const html = read('publish/index.html');
  assert.ok(html.includes('$store.game.realWorldLocationLabel()'));
  assert.ok(!html.includes("realWorldLocationName || '现实地点'"));
});

function test(name, fn) {
  fn();
  console.log(`PASS ${name}`);
}
