window.GameModules = window.GameModules || {};

window.GameModules.realWorldSettlementActions = {
  realWorldSettlementRecord(field, name, value, reason) {
    return { at: new Date().toISOString(), field, name, value, reason: reason || '现实推演结算。', applied: true };
  },

  realWorldMetricSettlement(state, updates = {}) {
    const metrics = state ? this.ensureStateMetrics(state) : null;
    const rows = [];
    const add = (field, list, current = {}) => (Array.isArray(list) ? list : []).forEach((item) => {
      const before = Number(current[item.key] || 0);
      const after = Math.max(0, Math.min(100, before + (Number(item.delta) || 0)));
      rows.push(this.realWorldSettlementRecord(field, item.key, `${before} → ${after}（${item.status || '状态更新'}）`, item.reason));
    });
    add('情绪', updates.emotions, metrics?.emotions);
    add('感觉', updates.playerFeelings, metrics?.playerFeelings);
    return rows;
  },

  realWorldVitalSettlement(state, updates = []) {
    const labels = { stamina_pool: '精力池', satiety: '饱食度', hydration: '水分', fatigue: '疲劳度', mental_stability: '精神稳定' };
    const values = state?.values || {};
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const pool = values[item.key];
      const before = pool?.max ? window.GameModules.progression.percent(pool) : null;
      const after = before === null ? '' : `：${before} → ${Math.max(0, Math.min(100, before + (Number(item.delta) || 0)))}%`;
      return this.realWorldSettlementRecord('生命体征', labels[item.key] || item.key, `变化${Number(item.delta) || 0}${after}`, item.reason);
    });
  },

  realWorldCardChangeSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(`身份/${item.field || '角色卡'}`, item.name || item.field, typeof item.value === 'object' ? JSON.stringify(item.value) : item.value, item.reason));
  },

  realWorldLexiconSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(item.kind || '词条', item.name, item.value ?? item.description ?? item.summary, item.meta?.modifyReason || item.changeMode));
  },

  realWorldInventorySettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => ['物品', '装备', '穿着'].includes(item?.kind)).map((item) => this.realWorldSettlementRecord(item.kind, item.name || item.value?.name, item.value?.description || item.description || item.summary || item.value, item.reason || item.changeMode));
  },

  realWorldItemActionSettlement(results = []) {
    return (Array.isArray(results) ? results : []).filter(Boolean).map((item) => this.realWorldSettlementRecord('物品动作', item.name || item.itemName || item.action || '物品变化', item.summary || item.description || item.result || item.status || '已处理', item.reason));
  },

  realWorldFactionSettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).map((item) => this.realWorldSettlementRecord('势力', item.factionName || item.name || item.action, item.position || item.status || item.value || item.action, item.reason));
  },

  async applyRealWorldVitalUpdates(state, updates = []) {
    if (!state?.values || !Array.isArray(updates)) return;
    const values = state.values;
    window.GameModules.progression.ensureStateMechanics(state, state.profile || {});
    values.vital_update_notes = values.vital_update_notes || {};
    const apply = (key, delta) => {
      const pool = values[key];
      if (!pool?.max) return null;
      const before = window.GameModules.progression.percent(pool);
      window.GameModules.progression.deltaPool(pool, delta);
      return { before, after: window.GameModules.progression.percent(pool) };
    };
    for (const item of updates) {
      const key = String(item?.key || '');
      if (!['stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].includes(key)) continue;
      const changed = apply(key, Number(item.delta) || 0);
      if (!changed) continue;
      values.vital_update_notes[key] = { ...changed, delta: Math.round(Number(item.delta) || 0), reason: String(item.reason || '').slice(0, 120), at: this.phoneDate().toISOString() };
    }
    values.health = window.GameModules.progression.percent(values.vitality);
    values.stamina = window.GameModules.progression.percent(values.stamina_pool);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.sqliteSave.saveCharacterState(state);
  },
};
