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
    return [...tag('鐗╁搧', v.items)];
  },

  wearingItems(state = this.inventoryTargetState()) {
    const values = this.inventoryValues(state);
    window.GameModules.progression.ensureInventoryFields?.(values, state?.id || '');
    return values.wearing || [];
  },

  inventoryName(item) {
    return String(item?.name || item || '鏈懡鍚嶇墿鍝?);
  },

  inventoryDetail(item) {
    if (!item || typeof item === 'string') return '鏆傛棤璇︾粏璇存槑';
    const slots = (item.equipSlots || []).length ? `鍙澶囷細${item.equipSlots.join('銆?)}` : '';
    return [item.kind || item.type, item.slot, slots, item.quantity ? `鏁伴噺${item.quantity}` : '', item.description, item.source, item.changeMode].filter(Boolean).join('锝?) || '鏆傛棤璇︾粏璇存槑';
  },

  isEmptyWear(item) {
    return !item?.name || item.name === '鏈┛鎴? || item.name === '鏈褰?;
  },

  wearingName(item) {
    return this.isEmptyWear(item) ? '鏈┛鎴? : item.name;
  },

  wearingDetail(item) {
    const position = item?.clothing_position;
    const label = item?.slotLabel || position || item?.slot;
    const slot = item?.slot ? `妲戒綅锛?{item.slot}${label && label !== item.slot ? `锛?{label}锛塦 : ''}` : '';
    const part = position ? `浜轰綋鐫€瑁呴儴浣嶏細${position}` : '';
    if (this.isEmptyWear(item)) return [slot, part, item?.reason || '璇ユЫ浣嶅綋鍓嶆湭绌挎埓锛岃〃绀哄搴旈儴浣嶇┖缃€?].filter(Boolean).join('锝?);
    return [item.type || '绌跨潃', slot, part, item.description, item.reason, item.source].filter(Boolean).join('锝?);
  },

  async addWearSlot(base = '瑁呭', state = this.inventoryTargetState()) {
    if (!state?.values) return '';
    const slot = this.ensureWearSlot(state.values, base, true, state.id || '');
    await this.persistInventoryState(state);
    return slot;
  },

  ensureWearSlot(values, slot, alwaysNew = false, ownerId = '') {
    const p = window.GameModules.progression;
    p.ensureInventoryFields?.(values, ownerId);
    const raw = String(slot || '瑁呭').trim();
    const base = p.slotBase(raw);
    const dynamic = ['楗板搧', '瑁呭'].includes(base) && !/\d+$/.test(raw);
    const empty = (item) => !item?.name || this.isEmptyWear(item);
    let target = !alwaysNew && dynamic ? values.wearing.find((item) => p.slotBase(item.slot) === base && empty(item))?.slot : '';
    target = target || (dynamic || alwaysNew ? p.nextSlot(values.wearing, base) : raw);
    if (!values.wearing.some((item) => item.slot === target)) values.wearing.push({ id: ownerId ? p.itemId?.(ownerId, '绌跨潃', target, '鏈┛鎴?) : '', ownerId, characterId: ownerId, slot: target, name: '鏈┛鎴?, type: '绌跨潃', description: '鐜╁鎴朅I鏂板鐨勫彲绌挎埓妲戒綅銆?, reason: `${target}妲戒綅鐢辫澶?楗板搧鎿嶄綔鏂板锛屽綋鍓嶅皻鏈┛鎴寸墿鍝併€俙, changeMode: `${target}妲戒綅鐢辫澶?楗板搧鎿嶄綔鏂板锛屽綋鍓嶅皻鏈┛鎴寸墿鍝併€俙, level: -1 });
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
    if (current && !this.isEmptyWear(current)) v.items.push({ ...current, type: '瑁呭', kind: '瑁呭' });
    v.items.splice(index, 1);
    this.writeWearingItem(v, { ...item, slot: target }, state.id || '');
    await this.persistInventoryState(state);
    return true;
  },

  async unequipSlot(slot, state = this.inventoryTargetState()) {
    if (!state?.values || !slot) return false;
    const item = state.values.wearing?.find((entry) => entry.slot === slot);
    if (!item) return false;
    Object.assign(item, { name: '鏈┛鎴?, type: '绌跨潃', description: '璇ユЫ浣嶆殏鏃犲凡璁板綍绌跨潃銆?, reason: `${slot}妲戒綅鐨勫師绌挎埓鐗╄鍗镐笅锛屽洜姝ゅ綋鍓嶄负绌虹疆鐘舵€併€俙, changeMode: `${slot}妲戒綅鐨勫師绌挎埓鐗╄鍗镐笅锛屽洜姝ゅ綋鍓嶄负绌虹疆鐘舵€併€俙, level: -1 });
    await this.persistInventoryState(state);
    return true;
  },

  writeWearingItem(values, item, ownerId = '') {
    const target = this.ensureWearSlot(values, item.slot || item.equipSlots?.[0] || '瑁呭', false, ownerId);
    const finalOwnerId = item.ownerId || item.characterId || ownerId;
    const worn = { ...item, id: item.id || (finalOwnerId ? window.GameModules.progression.itemId?.(finalOwnerId, '绌跨潃', target, item.name || '鏈┛鎴?) : ''), ownerId: finalOwnerId, characterId: finalOwnerId, slot: target, type: '绌跨潃', level: -1 };
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
      const item = window.GameModules.progression.normalizeCarryItem({ ...value, name: raw?.name || value.name, slot: raw?.slot || value.slot, description: raw?.description || raw?.summary || value.description, changeMode: raw?.reason || raw?.changeMode || 'AI婕旂畻' }, kind, state.id || '');
      if (kind === '鐗╁搧' || kind === '瑁呭') upsert(values.items, item);
      if (kind === '绌跨潃') { this.writeWearingItem(values, item, state.id || ''); changed = true; }
    }
    if (changed) await this.persistInventoryState(state);
  },

  async persistInventoryState(state) {
    if (!state?.id) return;
    window.GameModules.progression.ensureInventoryFields?.(state.values, state.id || '');
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

