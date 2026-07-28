const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({
  console,
  window: { GameModules: { rpgState: { seed: (text = '') => Math.abs([...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) } } },
});
context.window.window = context.window;
context.window.GameModules.rpgState = {
  profileOwnedValueKeys: () => ['world_tag', 'age', 'age_label', 'factions', 'memberships', 'items', 'wearing', 'knowledge', 'skills', 'professions', 'control_experience', 'current_location'],
  stripProfileOwnedValues(state) {
    let changed = false;
    for (const key of this.profileOwnedValueKeys()) {
      if (state?.values && Object.prototype.hasOwnProperty.call(state.values, key)) {
        delete state.values[key];
        changed = true;
      }
    }
    return changed;
  },
  migrateProfileOwnedFields(state) {
    return this.stripProfileOwnedValues(state);
  },
};

for (const file of ['progression.js', 'progression-wearables.js', 'inventory-actions.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'publish', file), 'utf8'), context, { filename: `publish/${file}` });
}

const inventory = context.window.GameModules.inventoryActions;
const saves = [];
const store = {
  rpgStates: {},
  applyInventoryUpdatesToState: inventory.applyInventoryUpdatesToState,
  persistInventoryState: inventory.persistInventoryState,
  normalizeProfileInventoryFields: inventory.normalizeProfileInventoryFields,
  inventoryValues: inventory.inventoryValues,
  ensureProfileInventoryFields: inventory.ensureProfileInventoryFields,
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

  assert.ok(state.profile.items.some((item) => item.name === '英伟达RTX 5070显卡'), 'role card profile.items should mirror purchased item');
  assert.strictEqual(state.values.items, undefined, 'values.items should be stripped after profile-owned inventory update');
  assert.ok(state.profile.roleCardUpdatedAt, 'role card update timestamp should refresh');

  await store.applyInventoryUpdatesToState(state, [{
    kind: '穿着',
    name: '黑色鸭舌帽',
    value: { name: '黑色鸭舌帽', slot: 'head', description: '淘宝购买后戴上的帽子' },
    reason: '装备到头部',
  }]);

  assert.ok(state.profile.wearingItems.some((item) => item.slot === 'head' && item.name === '黑色鸭舌帽'), 'role card profile.wearingItems should mirror equipped item');
  assert.strictEqual(state.values.wearing, undefined, 'values.wearing should be stripped after profile-owned wearing update');
  assert.ok(saves.length >= 2, 'inventory changes should persist');
  console.log('PASS inventory-profile-sync');
})();
