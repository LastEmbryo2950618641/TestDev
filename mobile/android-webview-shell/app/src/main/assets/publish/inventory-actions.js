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
    const values = this.inventoryValues(state);
    const tag = (kind, list) => (Array.isArray(list) ? list : []).map((item) => (typeof item === 'string' ? { name: item, kind } : { kind, ...item }));
    return [...tag('item', values.items)];
  },

  wearingItems(state = this.inventoryTargetState()) {
    const values = this.inventoryValues(state);
    window.GameModules.progression.ensureInventoryFields?.(values, state?.id || '');
    return Array.isArray(values.wearing) ? values.wearing : [];
  },

  inventoryName(item) {
    return String(item?.name || item || 'unknown-item');
  },

  inventoryDetail(item) {
    if (!item || typeof item === 'string') return 'no detail';
    const slots = Array.isArray(item.equipSlots) && item.equipSlots.length ? `equip: ${item.equipSlots.join(', ')}` : '';
    return [item.kind || item.type, item.slot, slots, item.quantity ? `qty ${item.quantity}` : '', item.description, item.source, item.changeMode].filter(Boolean).join(' | ') || 'no detail';
  },

  isEmptyWear(item) {
    return !item?.name || item.name === 'empty-slot' || item.name === 'unrecorded';
  },

  wearingName(item) {
    return this.isEmptyWear(item) ? 'empty-slot' : item.name;
  },

  wearingDetail(item) {
    const position = item?.clothing_position;
    const label = item?.slotLabel || position || item?.slot;
    const slot = item?.slot ? `slot: ${item.slot}${label && label !== item.slot ? ` (${label})` : ''}` : '';
    const part = position ? `part: ${position}` : '';
    if (this.isEmptyWear(item)) return [slot, part, item?.reason || 'slot is currently empty'].filter(Boolean).join(' | ');
    return [item.type || 'wearing', slot, part, item.description, item.reason, item.source].filter(Boolean).join(' | ');
  },

  async addWearSlot(base = 'equipment', state = this.inventoryTargetState()) {
    if (!state?.values) return '';
    const slot = this.ensureWearSlot(state.values, base, true, state.id || '');
    await this.persistInventoryState(state);
    return slot;
  },

  ensureWearSlot(values, slot, alwaysNew = false, ownerId = '') {
    const p = window.GameModules.progression;
    p.ensureInventoryFields?.(values, ownerId);
    const raw = String(slot || 'equipment').trim();
    const base = p.slotBase(raw);
    const dynamic = ['accessory', 'equipment'].includes(base) && !/\d+$/u.test(raw);
    const empty = (item) => !item?.name || this.isEmptyWear(item);
    let target = !alwaysNew && dynamic ? values.wearing.find((item) => p.slotBase(item.slot) === base && empty(item))?.slot : '';
    target = target || (dynamic || alwaysNew ? p.nextSlot(values.wearing, base) : raw);
    if (!values.wearing.some((item) => item.slot === target)) {
      values.wearing.push({
        id: ownerId ? p.itemId?.(ownerId, 'wearing', target, 'empty-slot') : '',
        ownerId,
        characterId: ownerId,
        slot: target,
        name: 'empty-slot',
        type: 'wearing',
        description: 'new wearable slot',
        reason: `slot ${target} created`,
        changeMode: `slot ${target} created`,
        level: -1,
      });
    }
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
    const values = this.inventoryValues(state);
    const index = values.items.findIndex((entry) => this.inventoryName(entry) === itemName);
    const item = index >= 0 ? values.items[index] : null;
    if (!item) return false;
    const target = this.ensureWearSlot(values, slot, false, state.id || '');
    if (!this.canEquipToSlot(item, target)) return false;
    const current = values.wearing.find((entry) => entry.slot === target);
    if (current && !this.isEmptyWear(current)) values.items.push({ ...current, type: 'equipment', kind: 'equipment' });
    values.items.splice(index, 1);
    this.writeWearingItem(values, { ...item, slot: target }, state.id || '');
    await this.persistInventoryState(state);
    return true;
  },

  async unequipSlot(slot, state = this.inventoryTargetState()) {
    if (!state?.values || !slot) return false;
    const item = state.values.wearing?.find((entry) => entry.slot === slot);
    if (!item) return false;
    Object.assign(item, {
      name: 'empty-slot',
      type: 'wearing',
      description: 'slot is empty',
      reason: `item removed from slot ${slot}`,
      changeMode: `item removed from slot ${slot}`,
      level: -1,
    });
    await this.persistInventoryState(state);
    return true;
  },

  writeWearingItem(values, item, ownerId = '') {
    const progression = window.GameModules.progression;
    const rawSlot = item?.slot || item?.equipSlots?.[0] || 'equipment';
    const slot = progression?.canonicalWearSlot?.({ ...(item || {}), slot: rawSlot }) || rawSlot;
    const target = this.ensureWearSlot(values, slot, false, ownerId);
    const finalOwnerId = item.ownerId || item.characterId || ownerId;
    const worn = {
      ...item,
      id: item.id || (finalOwnerId ? progression?.itemId?.(finalOwnerId, 'wearing', target, item.name || 'empty-slot') : ''),
      ownerId: finalOwnerId,
      characterId: finalOwnerId,
      slot: target,
      type: 'wearing',
      level: -1,
    };
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
      const item = window.GameModules.progression.normalizeCarryItem({ ...value, name: raw?.name || value.name, slot: raw?.slot || value.slot, description: raw?.description || raw?.summary || value.description, changeMode: raw?.reason || raw?.changeMode || 'AI merge' }, kind, state.id || '');
      if (kind === 'item' || kind === 'equipment' || kind === '物品' || kind === '装备') upsert(values.items, item);
      if (kind === 'wearing' || kind === '穿着') {
        this.writeWearingItem(values, item, state.id || '');
        changed = true;
      }
    }
    if (changed) await this.persistInventoryState(state);
  },

  syncInventoryProfileFromValues(state) {
    if (!state?.profile || !state?.values) return false;
    const progression = window.GameModules.progression;
    progression.ensureInventoryFields?.(state.values, state.id || '');
    const clone = (value) => JSON.parse(JSON.stringify(value || []));
    const nextItems = clone(state.values.items);
    const nextWearing = clone(state.values.wearing);
    const before = JSON.stringify({
      items: state.profile.items,
      wearing: state.profile.wearing,
      wearingItems: state.profile.wearingItems,
    });
    state.profile.items = nextItems;
    state.profile.wearingItems = nextWearing;
    state.profile.wearing = progression.mergeProfileWearing?.(state.profile.wearing || [], nextWearing) || nextWearing;
    state.profile.roleCardUpdatedAt = new Date().toISOString();
    return before !== JSON.stringify({
      items: state.profile.items,
      wearing: state.profile.wearing,
      wearingItems: state.profile.wearingItems,
    });
  },

  async persistInventoryState(state) {
    if (!state?.id) return;
    window.GameModules.progression.ensureInventoryFields?.(state.values, state.id || '');
    this.syncInventoryProfileFromValues?.(state);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.characterStateStore?.save?.(state);
  },

  realWorldInventoryItems() { return this.inventoryItems(this.playerIdentityState?.()); },
  realWorldWearingItems() { return this.wearingItems(this.playerIdentityState?.()); },
  realWorldInventoryName(item) { return this.inventoryName(item); },
  realWorldInventoryDetail(item) { return this.inventoryDetail(item); },
  realWorldWearingName(item) { return this.wearingName(item); },
  realWorldWearingDetail(item) { return this.wearingDetail(item); },
};
