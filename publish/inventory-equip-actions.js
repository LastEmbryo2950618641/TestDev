window.GameModules = window.GameModules || {};

window.GameModules.inventoryEquipActions = {
  equipOptionsForSlot(slot, state = this.inventoryTargetState()) {
    return this.inventoryItems(state).filter((item) => this.canEquipToSlot(item, slot));
  },

  canEquipInventoryItem(item) {
    return Array.isArray(item?.equipSlots) && item.equipSlots.length > 0;
  },

  firstEquipSlot(item, state = this.inventoryTargetState()) {
    const slots = item?.equipSlots || [];
    const wearing = this.wearingItems(state);
    return slots.find((slot) => wearing.some((entry) => this.canEquipToSlot(item, entry.slot))) || slots[0] || '';
  },

  async equipInventoryItem(item, slot = '', state = this.inventoryTargetState()) {
    if (!item || !state?.values) return false;
    const targetSlot = slot || this.firstEquipSlot(item, state);
    if (!targetSlot) return false;
    return this.equipItemToSlot(this.inventoryName(item), targetSlot, state);
  },

  async chooseEquipForSlot(slot, state = this.inventoryTargetState()) {
    const options = this.equipOptionsForSlot(slot, state);
    if (!options.length) {
      this.taobaoState = this.taobaoState || {};
      this.taobaoState.message = `${slot}暂无可替换物品。`;
      return false;
    }
    const text = options.map((item, index) => `${index + 1}. ${this.inventoryName(item)}`).join('\n');
    const picked = window.prompt(`选择要替换到${slot}的物品：\n${text}\n输入序号`);
    const index = Number(picked) - 1;
    const item = options[index];
    if (!item) return false;
    return this.equipInventoryItem(item, slot, state);
  },
};
