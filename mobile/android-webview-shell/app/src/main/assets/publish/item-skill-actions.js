window.GameModules = window.GameModules || {};

window.GameModules.itemSkillActions = {
  itemSkillWorldTag() {
    return window.GameModules.realWorld2026?.label || this.character?.work || '2026 real-world';
  },

  itemSkillState(target = 'player-self') {
    if (!target || target === 'player' || target === '鐜╁' || target === '鐜╁鏈汉') target = 'player-self';
    const key = String(target || 'player-self').trim();
    return this.rpgStates?.[key] || window.GameModules.characterStateStore?.resolve?.(key) || (key === 'player-self' ? this.playerIdentityState?.() : null);
  },

  itemSkillStateLabel(state = null) {
    return state?.profile?.name || state?.name || state?.id || 'unknown-character';
  },

  itemSkillKnownEntries(keyword = '') {
    const key = String(keyword || '').trim();
    const kinds = ['item', 'equipment', '鐗╁搧', '瑁呭'];
    const rows = kinds.flatMap((kind) => window.GameModules.lexiconStore?.list?.(this.itemSkillWorldTag(), kind) || []);
    return rows.filter((entry) => !key || this.itemSkillEntryText(entry).includes(key) || String(entry.name || '').includes(key));
  },

  itemSkillEntryText(entry = {}) {
    return [entry.name || '', entry.summary || '', entry.description || '', JSON.stringify(entry.value || {}), (entry.aliases || []).join(', ')].join('\n');
  },

  searchKnownItem(keyword = '') {
    const rows = this.itemSkillKnownEntries(keyword).slice(0, 8);
    return rows.length ? rows.map((entry) => this.itemSkillKnownLine(entry)).join('\n') : 'no known item';
  },

  itemSkillKnownLine(entry = {}) {
    const value = entry.value && typeof entry.value === 'object' ? entry.value : {};
    const slots = (value.equipSlots || entry.equipSlots || []).join?.(', ') || '';
    return `- ${entry.name || 'unknown-item'} | ${entry.kind || value.kind || 'item'} | ${entry.summary || entry.description || value.description || 'no detail'}${slots ? ` | equip: ${slots}` : ''}`;
  },

  listCharacterItems(target = 'player-self') {
    const state = this.itemSkillState(target);
    if (!state?.values) return 'target has no inventory';
    const items = this.inventoryItems(state).map((item) => `- ${this.inventoryName(item)} | ${this.inventoryDetail(item)}`).join('\n') || 'backpack empty';
    const wearing = this.wearingItems(state).filter((item) => !this.isEmptyWear(item)).map((item) => `- ${item.slot}: ${this.wearingName(item)} | ${this.wearingDetail(item)}`).join('\n') || 'no wearing items';
    return `target: ${this.itemSkillStateLabel(state)}\nitems:\n${items}\nwearing:\n${wearing}`;
  },

  async generateItemSkill(payload = {}) {
    const known = this.itemSkillKnownEntries(payload.name || payload.keyword || '')[0];
    if (known) return { ok: true, reused: true, item: known.value || known, message: `reused known item: ${known.name}` };
    const item = this.normalizeItemSkillPayload(payload);
    await this.saveKnownItemSkill(item, payload.reason || 'generated from real-world flow');
    return { ok: true, reused: false, item, message: `generated item: ${item.name}` };
  },

  normalizeItemSkillPayload(payload = {}) {
    const detailed = payload.detailed !== false && !payload.briefOnly;
    const name = String(payload.name || payload.keyword || 'unknown-item').slice(0, 32);
    const kind = String(payload.kind || payload.type || 'item') === 'equipment' || String(payload.kind || payload.type || 'item') === '瑁呭' ? 'equipment' : 'item';
    const description = detailed ? String(payload.description || payload.summary || `${name} was confirmed in the current scene.`).slice(0, 240) : `${name} appeared in text only, details remain unknown.`;
    return { name, kind, type: kind, quantity: Math.max(1, Number(payload.quantity) || 1), description, summary: String(payload.summary || description).slice(0, 80), equipSlots: Array.isArray(payload.equipSlots) ? payload.equipSlots.slice(0, 8).map(String) : [], price: Math.max(0, Math.floor(Number(payload.price) || 0)), source: payload.source || 'real-world', reason: String(payload.reason || 'real-world item confirmed').slice(0, 120) };
  },

  async saveKnownItemSkill(item = {}, reason = '') {
    const kind = item.kind === 'equipment' ? 'equipment' : 'item';
    const entry = { worldTag: this.itemSkillWorldTag(), kind, name: item.name, value: item, summary: item.summary || item.description, description: item.description, reason, source: 'ai', aiGenerated: true, meta: { scope: 'real-world-item', modifyReason: reason } };
    await window.GameModules.rpgLexicon.saveMany?.([entry]);
    return entry;
  },

  async addItemToTarget(target = 'player-self', payload = {}) {
    const state = this.itemSkillState(target) || (target === 'player-self' ? await this.ensurePlayerRpgState?.() : null);
    if (!state?.values) return { ok: false, message: 'target not found' };
    const generated = await this.generateItemSkill(payload);
    await this.applyInventoryUpdatesToState(state, [{ kind: generated.item.kind || 'item', name: generated.item.name, value: generated.item, reason: payload.reason || 'add item' }]);
    return { ok: true, item: generated.item, message: `added ${generated.item.name} to ${this.itemSkillStateLabel(state)}` };
  },

  async transferItemSkill(fromTarget = 'player-self', toTarget = '', itemName = '', quantity = 1, reason = '') {
    const from = this.itemSkillState(fromTarget);
    const to = this.itemSkillState(toTarget) || (toTarget === 'player-self' ? await this.ensurePlayerRpgState?.() : null);
    if (!from?.values || !to?.values || !itemName) return { ok: false, message: 'transfer missing source, target, or item name' };
    const item = this.removeInventoryItem(from, itemName, quantity, reason || 'transfer item');
    if (!item) return { ok: false, message: `item not found on ${this.itemSkillStateLabel(from)}: ${itemName}` };
    await this.persistInventoryState(from);
    await this.applyInventoryUpdatesToState(to, [{ kind: item.kind || item.type || 'item', name: item.name, value: { ...item, quantity }, reason: reason || 'transfer item' }]);
    return { ok: true, item, message: `transferred ${item.name} from ${this.itemSkillStateLabel(from)} to ${this.itemSkillStateLabel(to)}` };
  },

  async deleteItemSkill(target = 'player-self', itemName = '', quantity = 1, reason = '') {
    const state = this.itemSkillState(target);
    if (!state?.values || !itemName) return { ok: false, message: 'delete missing target or item name' };
    const item = this.removeInventoryItem(state, itemName, quantity, reason || 'delete item');
    if (!item) return { ok: false, message: `item not found: ${itemName}` };
    await this.persistInventoryState(state);
    return { ok: true, item, message: `removed ${item.name} from ${this.itemSkillStateLabel(state)}` };
  },

  removeInventoryItem(state, itemName = '', quantity = 1) {
    const values = this.inventoryValues(state);
    const index = values.items.findIndex((entry) => this.inventoryName(entry) === itemName);
    if (index < 0) return null;
    const item = values.items[index];
    const count = Math.max(1, Number(quantity) || 1);
    const current = Math.max(1, Number(item.quantity) || 1);
    if (current > count) values.items[index] = { ...item, quantity: current - count };
    else values.items.splice(index, 1);
    return { ...(typeof item === 'string' ? { name: item } : item), quantity: Math.min(count, current) };
  },

  async purchaseItemSkill(target = 'player-self', payload = {}) {
    const price = Math.max(1, Math.floor(Number(payload.price) || 1));
    const money = Number(this.playerProfile?.wealthAmount || 0);
    if (money < price) return { ok: false, message: `insufficient funds: need ${price}, have ${money}` };
    const result = await this.addItemToTarget(target, { ...payload, price, reason: payload.reason || 'purchase item' });
    if (!result.ok) return result;
    this.playerProfile.wealthAmount = money - price;
    window.GameModules.orgTerritoryActions?.syncPlayerWealthAsset?.(this);
    await this.save?.();
    return { ...result, paid: price, balance: this.playerProfile.wealthAmount, message: `${result.message}; paid ${price}` };
  },

  normalizeItemActionType(raw = {}) {
    const action = String(raw?.actionType || raw?.action || raw?.type || '').trim();
    const map = { remove: 'delete', removed: 'delete', use: 'delete', consume: 'delete', consumed: 'delete', create: 'generate' };
    return map[action] || action;
  },

  itemActionName(raw = {}) {
    return String(raw?.item?.name || raw?.itemName || raw?.name || (typeof raw?.item === 'string' ? raw.item : '')).trim();
  },

  itemActionTarget(raw = {}) {
    return window.GameModules.realWorldTargetUpdates?.targetKey?.(raw) || 'player-self';
  },

  itemActionRecordedResult(raw = {}, action = '') {
    const name = this.itemActionName(raw);
    const result = String(raw?.result || raw?.summary || raw?.description || raw?.reason || '').trim();
    if (!action && !name && !result) return null;
    return { ok: false, applied: false, action, name: name || action || 'item-change', itemName: name, target: this.itemActionTarget(raw), result: result || 'not executed, record only', reason: raw?.reason || action || 'unknown item action was not executed' };
  },

  async applyRealWorldItemActions(actions = []) {
    const results = [];
    for (const raw of (Array.isArray(actions) ? actions : []).slice(0, 20)) {
      const action = this.normalizeItemActionType(raw);
      if (action === 'add') results.push({ ...await this.addItemToTarget(raw.target || 'player-self', raw.item || raw), target: this.itemActionTarget(raw) });
      else if (action === 'transfer') results.push({ ...await this.transferItemSkill(raw.from || 'player-self', raw.to || raw.target || '', raw.itemName || raw.name || raw.item?.name, raw.quantity, raw.reason), target: raw.to || raw.target || '' });
      else if (action === 'delete') results.push({ ...await this.deleteItemSkill(raw.target || 'player-self', this.itemActionName(raw), raw.quantity, raw.reason), target: this.itemActionTarget(raw) });
      else if (action === 'purchase') results.push({ ...await this.purchaseItemSkill(raw.target || 'player-self', raw.item || raw), target: this.itemActionTarget(raw) });
      else if (action === 'generate') results.push(await this.generateItemSkill(raw.item || raw));
      else {
        const recorded = this.itemActionRecordedResult(raw, action);
        if (recorded) results.push(recorded);
      }
    }
    return results;
  },
};
