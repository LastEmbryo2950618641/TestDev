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
context.window.GameModules.currentLocationField = {
  displayFromCharacterState(state = null) {
    return String(state?.profile?.currentLocation || '').trim();
  },
};
loadScript(context, 'publish/domain/control/state.js');
const api = context.window.GameModules.domain.control.state;

test('player location label reads player role-card currentLocation only', () => {
  const store = {
    hasActiveControlTarget: () => false,
    realWorldLocationName: '锦苑小区3栋',
    realWorldMap: { current: '锦苑小区3栋' },
    playerIdentityState: () => ({ id: 'player-self', profile: { currentLocation: '角色卡地址' }, values: { current_location: { name: '当前位置未登记' } } }),
    playerProfile: { currentLocation: '' },
    characterSchedules: {},
  };
  assert.strictEqual(api.realWorldLocationLabel.call(store), '角色卡地址');
});

test('controlled role location label reads controlled role-card currentLocation only', () => {
  const store = {
    hasActiveControlTarget: () => true,
    sharedControlTargetId: 'sis',
    sharedControlState: () => ({
      id: 'sis',
      name: '刘思琪',
      profile: { currentLocation: '被控者角色卡地址' },
      values: { current_location: { name: '锦苑小区2栋' } },
    }),
    activeControlTargetState: () => store.sharedControlState(),
    characterSchedules: { sis: { currentLocation: '旧日程地点' } },
  };
  assert.strictEqual(api.realWorldLocationLabel.call(store), '被控者角色卡地址');
});

test('controlled role without profile location ignores schedule fallback', () => {
  const store = {
    hasActiveControlTarget: () => true,
    sharedControlTargetId: 'sis',
    sharedControlState: () => ({
      id: 'sis',
      name: '刘思琪',
      profile: { currentLocation: '' },
      values: { current_location: { name: '当前位置未登记' } },
    }),
    activeControlTargetState: () => store.sharedControlState(),
    characterSchedules: { sis: { currentLocation: '锦苑小区正门' } },
    controlLinkLocationText() { return '当前位置未登记'; },
  };
  assert.strictEqual(api.realWorldLocationLabel.call(store), '现实位置未登记');
});

test('scene title binds realWorldSceneLocationText', () => {
  const html = read('publish/index.html');
  assert.ok(html.includes('$store.game.realWorldSceneLocationText()'));
  assert.ok(!html.includes("realWorldLocationName || '现实地点'"));
});

function test(name, fn) {
  fn();
  console.log(`PASS ${name}`);
}
