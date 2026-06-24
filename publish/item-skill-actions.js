window.GameModules = window.GameModules || {};

window.GameModules.itemSkillActions = {
  itemSkillWorldTag() {
    return window.GameModules.realWorld2026?.label || this.character?.work || '2026 现代都市现实世界';
  },

  itemSkillState(target = 'player-self') {
    if (!target || target === 'player' || target === '玩家' || target === '玩家本人') target = 'player-self';
    const key = String(target || 'player-self').trim();
    return this.rpgStates?.[key] || window.GameModules.sqliteSave.getCharacterState?.(key) || window.GameModules.sqliteSave.getCharacterStateByName?.(key) || (key === 'player-self' ? this.playerIdentityState?.() : null);
  },

  itemSkillStateLabel(state = null) {
    return state?.profile?.name || state?.name || state?.id || '未知角色';
  },

  itemSkillKnownEntries(keyword = '') {
    const key = String(keyword || '').trim();
    const kinds = ['物品', '装备'];
    const rows = kinds.flatMap((kind) => window.GameModules.sqliteSave.listLexiconEntries?.(this.itemSkillWorldTag(), kind) || []);
    return rows.filter((entry) => !key || this.itemSkillEntryText(entry).includes(key) || String(entry.name || '').includes(key));
  },

  itemSkillEntryText(entry = {}) {
    return `${entry.name || ''}\n${entry.summary || ''}\n${entry.description || ''}\n${JSON.stringify(entry.value || {})}\n${(entry.aliases || []).join('、')}`;
  },

  searchKnownItem(keyword = '') {
    const rows = this.itemSkillKnownEntries(keyword).slice(0, 8);
    return rows.length ? rows.map((entry) => this.itemSkillKnownLine(entry)).join('\n') : '未命中世界已知物品。';
  },

  itemSkillKnownLine(entry = {}) {
    const value = entry.value && typeof entry.value === 'object' ? entry.value : {};
    const slots = (value.equipSlots || entry.equipSlots || []).join?.('、') || '';
    return `- ${entry.name || '未命名物品'}｜${entry.kind || value.kind || '物品'}｜${entry.summary || entry.description || value.description || '暂无说明'}${slots ? `｜可装备：${slots}` : ''}`;
  },

  listCharacterItems(target = 'player-self') {
    const state = this.itemSkillState(target);
    if (!state?.values) return '未找到目标角色物品。';
    const items = this.inventoryItems(state).map((item) => `- ${this.inventoryName(item)}｜${this.inventoryDetail(item)}`).join('\n') || '背包暂无物品。';
    const wearing = this.wearingItems(state).filter((item) => !this.isEmptyWear(item)).map((item) => `- ${item.slot}：${this.wearingName(item)}｜${this.wearingDetail(item)}`).join('\n') || '当前无明确穿戴物。';
    return `目标：${this.itemSkillStateLabel(state)}\n持有物：\n${items}\n穿着：\n${wearing}`;
  },

  async generateItemSkill(payload = {}) {
    const known = this.itemSkillKnownEntries(payload.name || payload.keyword || '')[0];
    if (known) return { ok: true, reused: true, item: known.value || known, message: `已复用世界已知物品：${known.name}` };
    const item = this.normalizeItemSkillPayload(payload);
    await this.saveKnownItemSkill(item, payload.reason || '现实推演生成新物品。');
    return { ok: true, reused: false, item, message: `已生成世界已知物品：${item.name}` };
  },

  normalizeItemSkillPayload(payload = {}) {
    const detailed = payload.detailed !== false && !payload.briefOnly;
    const name = String(payload.name || payload.keyword || '未命名物品').slice(0, 32);
    const kind = String(payload.kind || payload.type || '物品') === '装备' ? '装备' : '物品';
    const description = detailed ? String(payload.description || payload.summary || `${name}是现实推演中确认出现的物品。`).slice(0, 240) : `${name}（仅作为文本中出现的物品名，未被玩家检查或实际到手，细节未知）`;
    return { name, kind, type: kind, quantity: Math.max(1, Number(payload.quantity) || 1), description, summary: String(payload.summary || description).slice(0, 80), equipSlots: Array.isArray(payload.equipSlots) ? payload.equipSlots.slice(0, 8).map(String) : [], price: Math.max(0, Math.floor(Number(payload.price) || 0)), source: payload.source || '现实推演', reason: String(payload.reason || '现实推演确认该物品。').slice(0, 120) };
  },

  async saveKnownItemSkill(item = {}, reason = '') {
    const kind = item.kind === '装备' ? '装备' : '物品';
    const entry = { worldTag: this.itemSkillWorldTag(), kind, name: item.name, value: item, summary: item.summary || item.description, description: item.description, reason, source: 'ai', aiGenerated: true, meta: { scope: 'real-world-item', modifyReason: reason } };
    await window.GameModules.rpgLexicon.saveMany?.([entry]);
    return entry;
  },

  async addItemToTarget(target = 'player-self', payload = {}) {
    const state = this.itemSkillState(target) || (target === 'player-self' ? await this.ensurePlayerRpgState?.() : null);
    if (!state?.values) return { ok: false, message: '未找到目标角色，无法新增物品。' };
    const generated = await this.generateItemSkill(payload);
    await this.applyInventoryUpdatesToState(state, [{ kind: generated.item.kind || '物品', name: generated.item.name, value: generated.item, reason: payload.reason || '现实推演新增物品' }]);
    return { ok: true, item: generated.item, message: `已给${this.itemSkillStateLabel(state)}新增${generated.item.name}` };
  },

  async transferItemSkill(fromTarget = 'player-self', toTarget = '', itemName = '', quantity = 1, reason = '') {
    const from = this.itemSkillState(fromTarget);
    const to = this.itemSkillState(toTarget) || (toTarget === 'player-self' ? await this.ensurePlayerRpgState?.() : null);
    if (!from?.values || !to?.values || !itemName) return { ok: false, message: '转移失败：缺少来源、目标或物品名。' };
    const item = this.removeInventoryItem(from, itemName, quantity, reason || '物品转移');
    if (!item) return { ok: false, message: `转移失败：${this.itemSkillStateLabel(from)}未持有${itemName}` };
    await this.persistInventoryState(from);
    await this.applyInventoryUpdatesToState(to, [{ kind: item.kind || item.type || '物品', name: item.name, value: { ...item, quantity }, reason: reason || '物品转移' }]);
    return { ok: true, item, message: `已将${item.name}从${this.itemSkillStateLabel(from)}转移给${this.itemSkillStateLabel(to)}` };
  },

  async deleteItemSkill(target = 'player-self', itemName = '', quantity = 1, reason = '') {
    const state = this.itemSkillState(target);
    if (!state?.values || !itemName) return { ok: false, message: '删除失败：缺少目标或物品名。' };
    const item = this.removeInventoryItem(state, itemName, quantity, reason || '物品删除');
    if (!item) return { ok: false, message: `删除失败：未持有${itemName}` };
    await this.persistInventoryState(state);
    return { ok: true, item, message: `已从${this.itemSkillStateLabel(state)}移除${item.name}` };
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
    if (money < price) return { ok: false, message: `余额不足：当前${money.toLocaleString('zh-CN')}元，需要${price.toLocaleString('zh-CN')}元。` };
    const result = await this.addItemToTarget(target, { ...payload, price, reason: payload.reason || '现实购物获得物品' });
    if (!result.ok) return result;
    this.playerProfile.wealthAmount = money - price;
    await this.save?.();
    return { ...result, paid: price, balance: this.playerProfile.wealthAmount, message: `${result.message}，扣除${price.toLocaleString('zh-CN')}元。` };
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
    return { ok: false, applied: false, action, name: name || action || '物品变化', itemName: name, target: this.itemActionTarget(raw), result: result || '未执行，仅记录', reason: raw?.reason || action || '未知物品动作未执行。' };
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
