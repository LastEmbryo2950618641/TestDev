window.GameModules = window.GameModules || {};

window.GameModules.inventoryActions = {
  inventoryTargetState() {
    return this.realWorldOpen ? this.playerIdentityState?.() : this.currentRpgState;
  },

  inventoryValues(state = this.inventoryTargetState()) {
    const values = state?.values || {};
    window.GameModules.progression.ensureInventoryFields?.(values);
    return values;
  },

  inventoryItems(state = this.inventoryTargetState()) {
    const v = this.inventoryValues(state);
    const tag = (kind, list) => (Array.isArray(list) ? list : []).map((item) => (typeof item === 'string' ? { name: item, kind } : { kind, ...item }));
    return [...tag('装备', v.equipment), ...tag('物品', v.items)];
  },

  wearingItems(state = this.inventoryTargetState()) {
    return this.inventoryValues(state).wearing || [];
  },

  inventoryName(item) {
    return String(item?.name || item || '未命名物品');
  },

  inventoryDetail(item) {
    if (!item || typeof item === 'string') return '暂无详细说明';
    const slots = (item.equipSlots || []).length ? `可装备：${item.equipSlots.join('、')}` : '';
    return [item.kind || item.type, item.slot, slots, item.quantity ? `数量${item.quantity}` : '', item.description, item.source, item.changeMode].filter(Boolean).join('｜') || '暂无详细说明';
  },

  isEmptyWear(item) {
    return !item?.name || item.name === '未穿戴' || item.name === '未记录';
  },

  wearingName(item) {
    return this.isEmptyWear(item) ? '未穿戴' : item.name;
  },

  wearingDetail(item) {
    if (this.isEmptyWear(item)) return '该槽位当前未穿戴，表示对应部位空置；基础衣物缺失只应出现在特殊情况。';
    return [item.type || '穿着', item.description, item.source].filter(Boolean).join('｜');
  },

  async addWearSlot(base = '装备', state = this.inventoryTargetState()) {
    if (!state?.values) return '';
    const slot = this.ensureWearSlot(state.values, base, true);
    await this.persistInventoryState(state);
    return slot;
  },

  ensureWearSlot(values, slot, alwaysNew = false) {
    const p = window.GameModules.progression;
    p.ensureInventoryFields?.(values);
    const raw = String(slot || '装备').trim();
    const base = p.slotBase(raw);
    const dynamic = ['饰品', '装备'].includes(base) && !/\d+$/.test(raw);
    const empty = (item) => !item?.name || this.isEmptyWear(item);
    let target = !alwaysNew && dynamic ? values.wearing.find((item) => p.slotBase(item.slot) === base && empty(item))?.slot : '';
    target = target || (dynamic || alwaysNew ? p.nextSlot(values.wearing, base) : raw);
    if (!values.wearing.some((item) => item.slot === target)) values.wearing.push({ slot: target, name: '未穿戴', type: '穿着', description: '玩家或AI新增的可穿戴槽位。', level: -1 });
    return target;
  },

  canEquipToSlot(item, slot) {
    const slots = item?.equipSlots || [];
    if (!slots.length) return false;
    const base = window.GameModules.progression.slotBase(slot);
    return slots.includes(slot) || slots.includes(base);
  },

  async equipItemToSlot(itemName, slot, state = this.inventoryTargetState()) {
    if (!state?.values || !itemName || !slot) return false;
    const v = this.inventoryValues(state);
    const item = this.inventoryItems(state).find((entry) => this.inventoryName(entry) === itemName);
    if (!item) return false;
    const target = this.ensureWearSlot(v, slot);
    if (!this.canEquipToSlot(item, target)) return false;
    this.writeWearingItem(v, { ...item, slot: target });
    await this.persistInventoryState(state);
    return true;
  },

  async unequipSlot(slot, state = this.inventoryTargetState()) {
    if (!state?.values || !slot) return false;
    const item = state.values.wearing?.find((entry) => entry.slot === slot);
    if (!item) return false;
    Object.assign(item, { name: '未穿戴', type: '穿着', description: '该槽位暂无已记录穿着。', level: -1 });
    await this.persistInventoryState(state);
    return true;
  },

  writeWearingItem(values, item) {
    const target = this.ensureWearSlot(values, item.slot || item.equipSlots?.[0] || '装备');
    const worn = { ...item, slot: target, type: '穿着', level: -1 };
    const index = values.wearing.findIndex((entry) => entry.slot === target);
    if (index >= 0) values.wearing[index] = { ...values.wearing[index], ...worn };
    else values.wearing.push(worn);
  },

  async applyInventoryUpdatesToState(state, updates = []) {
    const values = state?.values;
    if (!values) return;
    window.GameModules.progression.ensureInventoryFields?.(values);
    let changed = false;
    const upsert = (list, item) => {
      const name = this.inventoryName(item);
      const index = list.findIndex((old) => this.inventoryName(old) === name);
      if (index >= 0) list[index] = { ...(typeof list[index] === 'string' ? { name: list[index] } : list[index]), ...item };
      else list.push(item);
      changed = true;
    };
    for (const raw of updates || []) {
      const kind = raw?.kind;
      const value = raw?.value && typeof raw.value === 'object' ? raw.value : {};
      const item = window.GameModules.progression.normalizeCarryItem({ ...value, name: raw?.name || value.name, slot: raw?.slot || value.slot, description: raw?.description || raw?.summary || value.description, changeMode: raw?.reason || raw?.changeMode || 'AI演算' }, kind);
      if (kind === '装备') upsert(values.equipment, item);
      if (kind === '物品') upsert(values.items, item);
      if (kind === '穿着') { this.writeWearingItem(values, item); changed = true; }
    }
    if (changed) await this.persistInventoryState(state);
  },

  async persistInventoryState(state) {
    if (!state?.id) return;
    window.GameModules.progression.ensureInventoryFields?.(state.values);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },

  realWorldInventoryItems() { return this.inventoryItems(this.playerIdentityState?.()); },
  realWorldWearingItems() { return this.wearingItems(this.playerIdentityState?.()); },
  realWorldInventoryName(item) { return this.inventoryName(item); },
  realWorldInventoryDetail(item) { return this.inventoryDetail(item); },
  realWorldWearingName(item) { return this.wearingName(item); },
  realWorldWearingDetail(item) { return this.wearingDetail(item); },
};
