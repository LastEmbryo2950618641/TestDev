window.GameModules = window.GameModules || {};

window.GameModules.itemSkillActions = {
  itemSkillWorldTag() {
    return window.GameModules.realWorld2026?.label || this.character?.work || '2026 鐜颁唬閮藉競鐜板疄涓栫晫';
  },

  itemSkillState(target = 'player-self') {
    if (!target || target === 'player' || target === '鐜╁' || target === '鐜╁鏈汉') target = 'player-self';
    const key = String(target || 'player-self').trim();
    return this.rpgStates?.[key] || window.GameModules.characterStateStore?.resolve?.(key) || (key === 'player-self' ? this.playerIdentityState?.() : null);
  },

  itemSkillStateLabel(state = null) {
    return state?.profile?.name || state?.name || state?.id || '鏈煡瑙掕壊';
  },

  itemSkillKnownEntries(keyword = '') {
    const key = String(keyword || '').trim();
    const kinds = ['鐗╁搧', '瑁呭'];
    const rows = kinds.flatMap((kind) => window.GameModules.sqliteSave.listLexiconEntries?.(this.itemSkillWorldTag(), kind) || []);
    return rows.filter((entry) => !key || this.itemSkillEntryText(entry).includes(key) || String(entry.name || '').includes(key));
  },

  itemSkillEntryText(entry = {}) {
    return `${entry.name || ''}\n${entry.summary || ''}\n${entry.description || ''}\n${JSON.stringify(entry.value || {})}\n${(entry.aliases || []).join('銆?)}`;
  },

  searchKnownItem(keyword = '') {
    const rows = this.itemSkillKnownEntries(keyword).slice(0, 8);
    return rows.length ? rows.map((entry) => this.itemSkillKnownLine(entry)).join('\n') : '鏈懡涓笘鐣屽凡鐭ョ墿鍝併€?;
  },

  itemSkillKnownLine(entry = {}) {
    const value = entry.value && typeof entry.value === 'object' ? entry.value : {};
    const slots = (value.equipSlots || entry.equipSlots || []).join?.('銆?) || '';
    return `- ${entry.name || '鏈懡鍚嶇墿鍝?}锝?{entry.kind || value.kind || '鐗╁搧'}锝?{entry.summary || entry.description || value.description || '鏆傛棤璇存槑'}${slots ? `锝滃彲瑁呭锛?{slots}` : ''}`;
  },

  listCharacterItems(target = 'player-self') {
    const state = this.itemSkillState(target);
    if (!state?.values) return '鏈壘鍒扮洰鏍囪鑹茬墿鍝併€?;
    const items = this.inventoryItems(state).map((item) => `- ${this.inventoryName(item)}锝?{this.inventoryDetail(item)}`).join('\n') || '鑳屽寘鏆傛棤鐗╁搧銆?;
    const wearing = this.wearingItems(state).filter((item) => !this.isEmptyWear(item)).map((item) => `- ${item.slot}锛?{this.wearingName(item)}锝?{this.wearingDetail(item)}`).join('\n') || '褰撳墠鏃犳槑纭┛鎴寸墿銆?;
    return `鐩爣锛?{this.itemSkillStateLabel(state)}\n鎸佹湁鐗╋細\n${items}\n绌跨潃锛歕n${wearing}`;
  },

  async generateItemSkill(payload = {}) {
    const known = this.itemSkillKnownEntries(payload.name || payload.keyword || '')[0];
    if (known) return { ok: true, reused: true, item: known.value || known, message: `宸插鐢ㄤ笘鐣屽凡鐭ョ墿鍝侊細${known.name}` };
    const item = this.normalizeItemSkillPayload(payload);
    await this.saveKnownItemSkill(item, payload.reason || '鐜板疄鎺ㄦ紨鐢熸垚鏂扮墿鍝併€?);
    return { ok: true, reused: false, item, message: `宸茬敓鎴愪笘鐣屽凡鐭ョ墿鍝侊細${item.name}` };
  },

  normalizeItemSkillPayload(payload = {}) {
    const detailed = payload.detailed !== false && !payload.briefOnly;
    const name = String(payload.name || payload.keyword || '鏈懡鍚嶇墿鍝?).slice(0, 32);
    const kind = String(payload.kind || payload.type || '鐗╁搧') === '瑁呭' ? '瑁呭' : '鐗╁搧';
    const description = detailed ? String(payload.description || payload.summary || `${name}鏄幇瀹炴帹婕斾腑纭鍑虹幇鐨勭墿鍝併€俙).slice(0, 240) : `${name}锛堜粎浣滀负鏂囨湰涓嚭鐜扮殑鐗╁搧鍚嶏紝鏈鐜╁妫€鏌ユ垨瀹為檯鍒版墜锛岀粏鑺傛湭鐭ワ級`;
    return { name, kind, type: kind, quantity: Math.max(1, Number(payload.quantity) || 1), description, summary: String(payload.summary || description).slice(0, 80), equipSlots: Array.isArray(payload.equipSlots) ? payload.equipSlots.slice(0, 8).map(String) : [], price: Math.max(0, Math.floor(Number(payload.price) || 0)), source: payload.source || '鐜板疄鎺ㄦ紨', reason: String(payload.reason || '鐜板疄鎺ㄦ紨纭璇ョ墿鍝併€?).slice(0, 120) };
  },

  async saveKnownItemSkill(item = {}, reason = '') {
    const kind = item.kind === '瑁呭' ? '瑁呭' : '鐗╁搧';
    const entry = { worldTag: this.itemSkillWorldTag(), kind, name: item.name, value: item, summary: item.summary || item.description, description: item.description, reason, source: 'ai', aiGenerated: true, meta: { scope: 'real-world-item', modifyReason: reason } };
    await window.GameModules.rpgLexicon.saveMany?.([entry]);
    return entry;
  },

  async addItemToTarget(target = 'player-self', payload = {}) {
    const state = this.itemSkillState(target) || (target === 'player-self' ? await this.ensurePlayerRpgState?.() : null);
    if (!state?.values) return { ok: false, message: '鏈壘鍒扮洰鏍囪鑹诧紝鏃犳硶鏂板鐗╁搧銆? };
    const generated = await this.generateItemSkill(payload);
    await this.applyInventoryUpdatesToState(state, [{ kind: generated.item.kind || '鐗╁搧', name: generated.item.name, value: generated.item, reason: payload.reason || '鐜板疄鎺ㄦ紨鏂板鐗╁搧' }]);
    return { ok: true, item: generated.item, message: `宸茬粰${this.itemSkillStateLabel(state)}鏂板${generated.item.name}` };
  },

  async transferItemSkill(fromTarget = 'player-self', toTarget = '', itemName = '', quantity = 1, reason = '') {
    const from = this.itemSkillState(fromTarget);
    const to = this.itemSkillState(toTarget) || (toTarget === 'player-self' ? await this.ensurePlayerRpgState?.() : null);
    if (!from?.values || !to?.values || !itemName) return { ok: false, message: '杞Щ澶辫触锛氱己灏戞潵婧愩€佺洰鏍囨垨鐗╁搧鍚嶃€? };
    const item = this.removeInventoryItem(from, itemName, quantity, reason || '鐗╁搧杞Щ');
    if (!item) return { ok: false, message: `杞Щ澶辫触锛?{this.itemSkillStateLabel(from)}鏈寔鏈?{itemName}` };
    await this.persistInventoryState(from);
    await this.applyInventoryUpdatesToState(to, [{ kind: item.kind || item.type || '鐗╁搧', name: item.name, value: { ...item, quantity }, reason: reason || '鐗╁搧杞Щ' }]);
    return { ok: true, item, message: `宸插皢${item.name}浠?{this.itemSkillStateLabel(from)}杞Щ缁?{this.itemSkillStateLabel(to)}` };
  },

  async deleteItemSkill(target = 'player-self', itemName = '', quantity = 1, reason = '') {
    const state = this.itemSkillState(target);
    if (!state?.values || !itemName) return { ok: false, message: '鍒犻櫎澶辫触锛氱己灏戠洰鏍囨垨鐗╁搧鍚嶃€? };
    const item = this.removeInventoryItem(state, itemName, quantity, reason || '鐗╁搧鍒犻櫎');
    if (!item) return { ok: false, message: `鍒犻櫎澶辫触锛氭湭鎸佹湁${itemName}` };
    await this.persistInventoryState(state);
    return { ok: true, item, message: `宸蹭粠${this.itemSkillStateLabel(state)}绉婚櫎${item.name}` };
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
    if (money < price) return { ok: false, message: `浣欓涓嶈冻锛氬綋鍓?{money.toLocaleString('zh-CN')}鍏冿紝闇€瑕?{price.toLocaleString('zh-CN')}鍏冦€俙 };
    const result = await this.addItemToTarget(target, { ...payload, price, reason: payload.reason || '鐜板疄璐墿鑾峰緱鐗╁搧' });
    if (!result.ok) return result;
    this.playerProfile.wealthAmount = money - price;
    window.GameModules.orgTerritoryActions?.syncPlayerWealthAsset?.(this);
    await this.save?.();
    return { ...result, paid: price, balance: this.playerProfile.wealthAmount, message: `${result.message}锛屾墸闄?{price.toLocaleString('zh-CN')}鍏冦€俙 };
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
    return { ok: false, applied: false, action, name: name || action || '鐗╁搧鍙樺寲', itemName: name, target: this.itemActionTarget(raw), result: result || '鏈墽琛岋紝浠呰褰?, reason: raw?.reason || action || '鏈煡鐗╁搧鍔ㄤ綔鏈墽琛屻€? };
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

