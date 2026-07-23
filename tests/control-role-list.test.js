const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

function loadCoreActions(storeList = []) {
  const windowObj = {
    GameModules: {
      catalog: { find: () => null },
      characterStateStore: { list: () => storeList },
    },
  };
  windowObj.window = windowObj;
  const context = vm.createContext({ console, window: windowObj });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish/core-actions.js'), 'utf8'), context);
  return context.window.GameModules.coreActions;
}

test('controlRoleList merges store role cards and skips player-self', () => {
  const actions = loadCoreActions([
    { id: 'rel-ai-247528', name: '刘思琪', profile: { roleCard: true, name: '刘思琪', role: '三胞胎妹妹之二', work: '现实' } },
    { id: 'rel-ai-242269', name: '刘思怡', profile: { roleCardSource: 'ai', name: '刘思怡', role: '三胞胎妹妹之三', work: '现实' } },
    { id: 'rel-ai-247463', name: '刘思瑶', profile: { roleCardUpdatedAt: '2026-01-01', name: '刘思瑶', role: '三胞胎妹妹之一', work: '现实' } },
    { id: 'npc-temp', name: '路人', profile: { name: '路人' } },
  ]);
  const store = {
    rpgStates: {
      'player-self': { id: 'player-self', name: '刘悠', profile: { roleCard: true, name: '刘悠' } },
    },
  };
  const list = actions.controlRoleList.call(store);
  assert.strictEqual(list.length, 3);
  const names = new Set(list.map((item) => item.state.name));
  assert.ok(names.has('刘思琪'));
  assert.ok(names.has('刘思怡'));
  assert.ok(names.has('刘思瑶'));
  assert.ok(!list.some((item) => item.state.id === 'player-self'));
  assert.ok(!list.some((item) => item.state.id === 'npc-temp'));
});

test('hydrateControlRoleStates copies missing solidified cards into rpgStates', () => {
  const actions = loadCoreActions([
    { id: 'rel-ai-247528', name: '刘思琪', profile: { roleCard: true, name: '刘思琪' } },
  ]);
  const store = { rpgStates: { 'player-self': { id: 'player-self', name: '刘悠' } } };
  const changed = actions.hydrateControlRoleStates.call(store);
  assert.strictEqual(changed, true);
  assert.strictEqual(store.rpgStates['rel-ai-247528'].name, '刘思琪');
});
