const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({
  console,
  window: { GameModules: { rpgState: { seed: (text = '') => Math.abs([...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) } } },
});
context.window.window = context.window;

for (const file of ['progression.js', 'progression-wearables.js', 'inventory-actions.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', file), 'utf8'), context, { filename: `publish/${file}` });
}

const inventory = context.window.GameModules.inventoryActions;
const saves = [];
const store = {
  rpgStates: {},
  applyInventoryUpdatesToState: inventory.applyInventoryUpdatesToState,
  persistInventoryState: inventory.persistInventoryState,
  syncInventoryProfileFromValues: inventory.syncInventoryProfileFromValues,
  writeWearingItem: inventory.writeWearingItem,
  ensureWearSlot: inventory.ensureWearSlot,
  inventoryName: inventory.inventoryName,
  isEmptyWear: inventory.isEmptyWear,
};
context.window.GameModules.characterStateStore = {
  async save(state) {
    saves.push(JSON.parse(JSON.stringify(state)));
  },
};

(async () => {
  const state = {
    id: 'player-self',
    profile: { name: '玩家', items: [], wearingItems: [] },
    values: { items: [], wearing: [] },
  };

  await store.applyInventoryUpdatesToState(state, [{
    kind: '物品',
    name: '英伟达RTX 5070显卡',
    value: { name: '英伟达RTX 5070显卡', description: '淘宝购买的电脑配件', price: 4599 },
    reason: '淘宝购买',
  }]);

  assert.ok(state.values.items.some((item) => item.name === '英伟达RTX 5070显卡'), 'runtime inventory should contain purchased item');
  assert.ok(state.profile.items.some((item) => item.name === '英伟达RTX 5070显卡'), 'role card profile.items should mirror purchased item');
  assert.ok(state.profile.roleCardUpdatedAt, 'role card update timestamp should refresh');

  await store.applyInventoryUpdatesToState(state, [{
    kind: '穿着',
    name: '黑色鸭舌帽',
    value: { name: '黑色鸭舌帽', slot: 'head', description: '淘宝购买后戴上的帽子' },
    reason: '装备到头部',
  }]);

  assert.ok(state.values.wearing.some((item) => item.slot === 'head' && item.name === '黑色鸭舌帽'), 'runtime wearing should contain equipped item');
  assert.ok(state.profile.wearingItems.some((item) => item.slot === 'head' && item.name === '黑色鸭舌帽'), 'role card profile.wearingItems should mirror equipped item');
  assert.ok(saves.length >= 2, 'inventory changes should persist');
  console.log('PASS inventory-profile-sync');
})();
