window.GameModules = window.GameModules || {};

window.GameModules.inventoryActions = {
  inventoryTargetState() {
    return this.realWorldOpen ? this.playerIdentityState?.() : this.currentRpgState;
  },

  inventoryValues(state = this.inventoryTargetState()) {
    const profile = state?.profile || {};
    this.ensureProfileInventoryFields?.(state);
    return profile;
  },

  ensureProfileInventoryFields(state = this.inventoryTargetState()) {
    if (!state?.profile) return false;
    window.GameModules.rpgState?.migrateProfileOwnedFields?.(state);
    const profile = state.profile;
    const progression = window.GameModules.progression;
    const before = JSON.stringify({ items: profile.items, wearingItems: profile.wearingItems, wearing: profile.wearing });
    profile.items = (Array.isArray(profile.items) ? profile.items : []).map((item) => progression.normalizeCarryItem(item, item?.type || item?.kind || '物品', state.id || ''));
    const rawWearing = Array.isArray(profile.wearingItems)
      ? profile.wearingItems
      : (Array.isArray(profile.wearing) ? profile.wearing : (progression.profileWearingItems?.(profile) || []));
    profile.wearingItems = progression.defaultWearing(rawWearing, state.id || '');
    profile.wearing = profile.wearingItems;
    return before !== JSON.stringify({ items: profile.items, wearingItems: profile.wearingItems, wearing: profile.wearing });
  },

  inventoryItems(state = this.inventoryTargetState()) {
    const inventory = this.inventoryValues(state);
    const tag = (kind, list) => (Array.isArray(list) ? list : []).map((item) => (typeof item === 'string' ? { name: item, kind } : { kind, ...item }));
    return [...tag('item', inventory.items)];
  },

  wearingItems(state = this.inventoryTargetState()) {
    const inventory = this.inventoryValues(state);
    return Array.isArray(inventory.wearingItems) ? inventory.wearingItems : [];
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
    if (!state?.profile) return '';
    const slot = this.ensureWearSlot(this.inventoryValues(state), base, true, state.id || '');
    if (state.profile) state.profile.roleCardUpdatedAt = new Date().toISOString();
    await this.persistInventoryState(state);
    return slot;
  },

  ensureWearSlot(values, slot, alwaysNew = false, ownerId = '') {
    const p = window.GameModules.progression;
    values.items = Array.isArray(values.items) ? values.items : [];
    values.wearing = Array.isArray(values.wearing) ? values.wearing : [];
    values.wearingItems = values.wearing;
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
    if (!state?.profile || !itemName || !slot) return false;
    const inventory = this.inventoryValues(state);
    const index = inventory.items.findIndex((entry) => this.inventoryName(entry) === itemName);
    const item = index >= 0 ? inventory.items[index] : null;
    if (!item) return false;
    const target = this.ensureWearSlot(inventory, slot, false, state.id || '');
    if (!this.canEquipToSlot(item, target)) return false;
    const current = inventory.wearing.find((entry) => entry.slot === target);
    if (current && !this.isEmptyWear(current)) inventory.items.push({ ...current, type: 'equipment', kind: 'equipment' });
    inventory.items.splice(index, 1);
    this.writeWearingItem(inventory, { ...item, slot: target }, state.id || '');
    if (state.profile) state.profile.roleCardUpdatedAt = new Date().toISOString();
    await this.persistInventoryState(state);
    return true;
  },

  async unequipSlot(slot, state = this.inventoryTargetState()) {
    if (!state?.profile || !slot) return false;
    const inventory = this.inventoryValues(state);
    const item = inventory.wearingItems?.find((entry) => entry.slot === slot);
    if (!item) return false;
    Object.assign(item, {
      name: 'empty-slot',
      type: 'wearing',
      description: 'slot is empty',
      reason: `item removed from slot ${slot}`,
      changeMode: `item removed from slot ${slot}`,
      level: -1,
    });
    if (state.profile) state.profile.roleCardUpdatedAt = new Date().toISOString();
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
    const inventory = this.inventoryValues(state);
    if (!inventory) return;
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
      if (kind === 'item' || kind === 'equipment' || kind === '物品' || kind === '装备') upsert(inventory.items, item);
      if (kind === 'wearing' || kind === '穿着') {
        this.writeWearingItem(inventory, item, state.id || '');
        changed = true;
      }
    }
    if (changed) {
      if (state.profile) state.profile.roleCardUpdatedAt = new Date().toISOString();
      await this.persistInventoryState(state);
    }
  },

  normalizeProfileInventoryFields(state) {
    return this.ensureProfileInventoryFields?.(state) || false;
  },

  async persistInventoryState(state) {
    if (!state?.id) return;
    const changed = this.ensureProfileInventoryFields?.(state);
    window.GameModules.rpgState?.stripProfileOwnedValues?.(state);
    if (changed && state.profile) state.profile.roleCardUpdatedAt = new Date().toISOString();
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
