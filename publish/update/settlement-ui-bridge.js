window.GameModules = window.GameModules || {};

(function installSettlementUiBridge() {
  const registry = window.GameModules.updateRegistry;
  if (!registry || registry.settlementUiBridgeInstalled) return;

  registry.legacySettlementType = function legacySettlementType(row = {}) {
    const text = `${row.updateType || ''} ${row.field || ''} ${row.name || ''} ${row.group || ''} ${row.section || ''}`;
    if (/情绪/u.test(text)) return 'emotion';
    if (/感觉/u.test(text)) return 'feeling';
    if (/生命体征|精力|饱食|水分|疲劳|精神稳定/u.test(text)) return 'vital';
    if (/物品|装备|穿着|购买|转交|丢弃|消耗/u.test(text)) return 'item';
    if (/地图|地点|路线/u.test(text)) return 'map';
    if (/组织架构|职位|部门|岗位|成员/u.test(text)) return 'faction-structure';
    if (/势力|公司|社群|社区|家庭|组织/u.test(text)) return 'faction-overview';
    if (/身份|角色卡|职业|外貌|性格|技能|状态/u.test(text)) return 'role-card';
    return 'system';
  };

  registry.legacySettlementSubject = function legacySettlementSubject(row = {}) {
    const cardId = String(row.cardId || '');
    const title = row.cardTitle || row.group || row.name || '';
    if (cardId.startsWith('role:')) return { type: 'player', id: cardId.slice(5) || 'player-self', name: title };
    if (cardId.startsWith('faction:')) return { type: 'faction', id: cardId.slice(8), name: title };
    if (cardId.startsWith('map:')) return { type: 'location', id: title || 'real-world-map', name: title };
    if (cardId.startsWith('system:')) return { type: title || 'system', id: cardId.slice(7), name: title };
    return { type: 'player', id: 'player-self', name: title };
  };

  registry.legacySettlementField = function legacySettlementField(type = '', row = {}) {
    const name = row.name || this.leafName?.(row.field) || type || '结算';
    if (type === 'emotion') return `metrics.emotions.${name}`;
    if (type === 'feeling') return `metrics.playerFeelings.${name}`;
    if (type === 'vital') return `vitals.${name}`;
    if (type === 'item') return `inventory.${name}`;
    if (type === 'map') return `map.${name}`;
    if (type === 'faction-overview') return `factions.${name}`;
    if (type === 'faction-structure') return `structure.${name}`;
    if (type === 'role-card') return row.field || `profile.${name}`;
    return row.field || `system.${name}`;
  };

  registry.legacySettlementUpdate = function legacySettlementUpdate(row = {}) {
    if (row && typeof row === 'object' && row.updateType && row.change) return row;
    const source = row && typeof row === 'object' ? row : {
      field: '系统记录', name: '结算', value: String(row || ''), reason: String(row || ''), group: '系统记录', section: '系统卡',
    };
    const updateType = this.legacySettlementType(source);
    const value = source.uiValue ?? source.value ?? '';
    const reason = source.reason || '现实推演结算。';
    return {
      updateType,
      subject: this.legacySettlementSubject(source),
      field: this.legacySettlementField(updateType, source),
      name: source.uiName || source.name || this.leafName?.(source.field) || source.field || '结算',
      change: { mode: 'set', value },
      reasons: [{ trigger: '现实推演结算', evidence: reason, confidence: 'settled' }],
      __settlementRow: source,
    };
  };

  registry.rowFromSettlement = function rowFromSettlement(row = {}, store = null) {
    const source = row && typeof row === 'object' ? row : null;
    const rendered = this.rowFromGeneric(this.legacySettlementUpdate(row), store);
    if (!source || source.updateType) return rendered;
    return this.decorateRow({
      ...rendered,
      at: source.at || rendered.at,
      group: source.group || rendered.group,
      cardId: rendered.cardId,
      cardTitle: rendered.cardTitle,
      section: rendered.section || source.section,
      applied: source.applied !== undefined ? source.applied : rendered.applied,
    });
  };

  registry.settlementRows = function settlementRows(entry = {}, store = null) {
    return [
      ...(entry.characterCardChanges || []).map((item) => this.rowFromSettlement(item, store)),
      ...((entry.genericUpdates || []).map((item) => this.rowFromGeneric(item, store))),
    ].filter(Boolean);
  };

  registry.settlementUiBridgeInstalled = true;
}());
