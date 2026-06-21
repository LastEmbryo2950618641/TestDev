window.GameModules = window.GameModules || {};

window.GameModules.inventoryActions = {
  inventoryTargetState() {
    return this.realWorldOpen ? this.playerIdentityState?.() : this.currentRpgState;
  },

  inventoryValues(state = this.inventoryTargetState()) {
    const values = state?.values || {};
    window.GameModules.progression.ensureInventoryFields?.(values, state?.id || '');
    return values;
  },

  inventoryItems(state = this.inventoryTargetState()) {
    const v = this.inventoryValues(state);
    const tag = (kind, list) => (Array.isArray(list) ? list : []).map((item) => (typeof item === 'string' ? { name: item, kind } : { kind, ...item }));
    return [...tag('物品', v.items)];
  },

  wearingItems(state = this.inventoryTargetState()) {
    const values = this.inventoryValues(state);
    window.GameModules.progression.ensureInventoryFields?.(values, state?.id || '');
    return values.wearing || [];
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
    const position = item?.clothing_position;
    const label = item?.slotLabel || position || item?.slot;
    const slot = item?.slot ? `槽位：${item.slot}${label && label !== item.slot ? `（${label}）` : ''}` : '';
    const part = position ? `人体着装部位：${position}` : '';
    if (this.isEmptyWear(item)) return [slot, part, item?.reason || '该槽位当前未穿戴，表示对应部位空置。'].filter(Boolean).join('｜');
    return [item.type || '穿着', slot, part, item.description, item.reason, item.source].filter(Boolean).join('｜');
  },

  async addWearSlot(base = '装备', state = this.inventoryTargetState()) {
    if (!state?.values) return '';
    const slot = this.ensureWearSlot(state.values, base, true, state.id || '');
    await this.persistInventoryState(state);
    return slot;
  },

  ensureWearSlot(values, slot, alwaysNew = false, ownerId = '') {
    const p = window.GameModules.progression;
    p.ensureInventoryFields?.(values, ownerId);
    const raw = String(slot || '装备').trim();
    const base = p.slotBase(raw);
    const dynamic = ['饰品', '装备'].includes(base) && !/\d+$/.test(raw);
    const empty = (item) => !item?.name || this.isEmptyWear(item);
    let target = !alwaysNew && dynamic ? values.wearing.find((item) => p.slotBase(item.slot) === base && empty(item))?.slot : '';
    target = target || (dynamic || alwaysNew ? p.nextSlot(values.wearing, base) : raw);
    if (!values.wearing.some((item) => item.slot === target)) values.wearing.push({ id: ownerId ? p.itemId?.(ownerId, '穿着', target, '未穿戴') : '', ownerId, characterId: ownerId, slot: target, name: '未穿戴', type: '穿着', description: '玩家或AI新增的可穿戴槽位。', reason: `${target}槽位由装备/饰品操作新增，当前尚未穿戴物品。`, changeMode: `${target}槽位由装备/饰品操作新增，当前尚未穿戴物品。`, level: -1 });
    return target;
  },

  canEquipToSlot(item, slot) {
    const slots = item?.equipSlots || [];
    if (!slots.length) return false;
    const p = window.GameModules.progression;
    const base = p.slotBase(slot);
    const canonical = p.canonicalWearSlot?.(slot) || slot;
    const targets = slots.map((entry) => p.canonicalWearSlot?.(entry) || entry);
    return slots.includes(slot) || slots.includes(base) || targets.includes(canonical) || targets.includes(base);
  },

  async equipItemToSlot(itemName, slot, state = this.inventoryTargetState()) {
    if (!state?.values || !itemName || !slot) return false;
    const v = this.inventoryValues(state);
    const index = v.items.findIndex((entry) => this.inventoryName(entry) === itemName);
    const item = index >= 0 ? v.items[index] : null;
    if (!item) return false;
    const target = this.ensureWearSlot(v, slot, false, state.id || '');
    if (!this.canEquipToSlot(item, target)) return false;
    const current = v.wearing.find((entry) => entry.slot === target);
    if (current && !this.isEmptyWear(current)) v.items.push({ ...current, type: '装备', kind: '装备' });
    v.items.splice(index, 1);
    this.writeWearingItem(v, { ...item, slot: target }, state.id || '');
    await this.persistInventoryState(state);
    return true;
  },

  async unequipSlot(slot, state = this.inventoryTargetState()) {
    if (!state?.values || !slot) return false;
    const item = state.values.wearing?.find((entry) => entry.slot === slot);
    if (!item) return false;
    Object.assign(item, { name: '未穿戴', type: '穿着', description: '该槽位暂无已记录穿着。', reason: `${slot}槽位的原穿戴物被卸下，因此当前为空置状态。`, changeMode: `${slot}槽位的原穿戴物被卸下，因此当前为空置状态。`, level: -1 });
    await this.persistInventoryState(state);
    return true;
  },

  writeWearingItem(values, item, ownerId = '') {
    const target = this.ensureWearSlot(values, item.slot || item.equipSlots?.[0] || '装备', false, ownerId);
    const finalOwnerId = item.ownerId || item.characterId || ownerId;
    const worn = { ...item, id: item.id || (finalOwnerId ? window.GameModules.progression.itemId?.(finalOwnerId, '穿着', target, item.name || '未穿戴') : ''), ownerId: finalOwnerId, characterId: finalOwnerId, slot: target, type: '穿着', level: -1 };
    const index = values.wearing.findIndex((entry) => entry.slot === target);
    if (index >= 0) values.wearing[index] = { ...values.wearing[index], ...worn };
    else values.wearing.push(worn);
  },

  async applyInventoryUpdatesToState(state, updates = []) {
    const values = state?.values;
    if (!values) return;
    window.GameModules.progression.ensureInventoryFields?.(values, state.id || '');
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
      const item = window.GameModules.progression.normalizeCarryItem({ ...value, name: raw?.name || value.name, slot: raw?.slot || value.slot, description: raw?.description || raw?.summary || value.description, changeMode: raw?.reason || raw?.changeMode || 'AI演算' }, kind, state.id || '');
      if (kind === '物品' || kind === '装备') upsert(values.items, item);
      if (kind === '穿着') { this.writeWearingItem(values, item, state.id || ''); changed = true; }
    }
    if (changed) await this.persistInventoryState(state);
  },

  async persistInventoryState(state) {
    if (!state?.id) return;
    window.GameModules.progression.ensureInventoryFields?.(state.values, state.id || '');
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
