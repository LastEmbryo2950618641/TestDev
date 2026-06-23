window.GameModules = window.GameModules || {};

window.GameModules.realWorldSettlementActions = {
  realWorldSettlementRecord(field, name, value, reason, group = '') {
    return { at: new Date().toISOString(), group: group || this.realWorldSettlementGroup(field, name), field, name, value, reason: reason || '现实推演结算。', applied: true };
  },

  realWorldPlayerSettlementName() {
    const display = this.playerDisplayCharacter?.();
    const state = this.playerIdentityState?.();
    return display?.name || state?.profile?.name || state?.name || this.playerProfile?.name || this.playerName || '手机主人';
  },

  realWorldSettlementTargetGroup(target = '', fallback = '') {
    const value = String(target || '').trim();
    const player = this.playerIdentityState?.();
    const playerName = this.realWorldPlayerSettlementName();
    if (!value || value === 'player-self' || value === 'player' || value === '玩家' || value === '玩家本人' || value === player?.id || value === this.playerProfile?.name || value === playerName) return playerName;
    const state = this.itemSkillState?.(value);
    if (state?.id) return this.itemSkillStateLabel?.(state) || state.profile?.name || state.name || state.id;
    return fallback && fallback !== '玩家' ? fallback.replace(/^角色[:：]/u, '') : value;
  },

  realWorldSettlementGroup(field = '', name = '') {
    const text = `${field} ${name}`;
    if (/公司|岗位|职级|员工|老板/.test(text)) return '公司';
    if (/势力|社群|社区|家庭|组织|部门/.test(text)) return '势力';
    if (/生命体征|情绪|感觉|玩家|身份|职业|状态|阵营/.test(text)) return '玩家';
    if (/物品|装备|穿着/.test(text)) return '物品';
    return /角色|关系|技能/.test(text) ? '角色' : '其他';
  },

  realWorldSettlementTabs(entry = {}) {
    return this.realWorldSettlementGroups(entry).map((group) => ({ id: group.title, title: group.title, count: group.items.length }));
  },

  activeRealWorldSettlementTab(entry = {}) {
    const tabs = this.realWorldSettlementTabs(entry);
    if (!tabs.length) return '';
    return tabs.some((tab) => tab.id === entry.settlementTab) ? entry.settlementTab : tabs[0].id;
  },

  selectRealWorldSettlementTab(entry, tab = '') {
    if (!entry || !tab) return;
    entry.settlementTab = tab;
    this.realWorldLog = [...(this.realWorldLog || [])];
  },

  realWorldSettlementGroups(entry = {}) {
    const groups = new Map();
    for (const item of entry.characterCardChanges || []) {
      const title = item.group || this.realWorldSettlementGroup(item.field, item.name);
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title).push(item);
    }
    return Array.from(groups, ([title, items]) => ({ title, items }));
  },

  visibleRealWorldSettlementGroups(entry = {}) {
    const active = this.activeRealWorldSettlementTab(entry);
    return this.realWorldSettlementGroups(entry).filter((group) => group.title === active);
  },

  realWorldMetricSettlement(state, updates = {}, group = '') {
    group = group || this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    const metrics = state ? this.ensureStateMetrics(state) : null;
    const rows = [];
    const add = (field, list, current = {}) => (Array.isArray(list) ? list : []).forEach((item) => {
      const before = Number(current[item.key] || 0);
      const after = Math.max(0, Math.min(100, before + (Number(item.delta) || 0)));
      rows.push(this.realWorldSettlementRecord(field, item.key, `${before} → ${after}（${item.status || '状态更新'}）`, item.reason, group));
    });
    add('情绪', updates.emotions, metrics?.emotions);
    add('感觉', updates.playerFeelings, metrics?.playerFeelings);
    return rows;
  },

  realWorldVitalSettlement(state, updates = []) {
    const labels = { stamina_pool: '精力池', satiety: '饱食度', hydration: '水分', fatigue: '疲劳度', mental_stability: '精神稳定' };
    const values = state?.values || {};
    const group = this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const pool = values[item.key];
      const before = pool?.max ? window.GameModules.progression.percent(pool) : null;
      const after = before === null ? '' : `：${before} → ${Math.max(0, Math.min(100, before + (Number(item.delta) || 0)))}%`;
      return this.realWorldSettlementRecord('生命体征', labels[item.key] || item.key, `变化${Number(item.delta) || 0}${after}`, item.reason, group);
    });
  },

  realWorldCardChangeSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(`身份/${item.field || '角色卡'}`, item.name || item.field, typeof item.value === 'object' ? JSON.stringify(item.value) : item.value, item.reason, this.realWorldSettlementTargetGroup(item.target || item.targetId || item.characterId, '')));
  },

  realWorldLexiconSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(item.kind || '词条', item.name, item.value ?? item.description ?? item.summary, item.meta?.modifyReason || item.changeMode, this.realWorldSettlementTargetGroup(item.target || item.targetId || item.characterId, this.realWorldSettlementGroup(item.kind, item.name))));
  },

  realWorldInventorySettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => ['物品', '装备', '穿着'].includes(item?.kind)).map((item) => this.realWorldSettlementRecord(item.kind, item.name || item.value?.name, item.value?.description || item.description || item.summary || item.value, item.reason || item.changeMode, this.realWorldSettlementTargetGroup(item.target || item.owner || item.characterId, '物品')));
  },

  realWorldItemActionSettlement(results = []) {
    return (Array.isArray(results) ? results : []).filter(Boolean).map((item) => this.realWorldSettlementRecord('物品动作', item.name || item.itemName || item.action || '物品变化', item.summary || item.description || item.result || item.status || '已处理', item.reason, this.realWorldSettlementTargetGroup(item.target || item.owner || item.characterId, '物品')));
  },

  realWorldFactionSettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const name = item.factionName || item.name || item.action;
      const group = /公司|岗位|职级|员工|老板/.test(`${name || ''} ${item.action || ''}`) ? '公司' : '势力';
      return this.realWorldSettlementRecord(group, name, item.position || item.status || item.value || item.action, item.reason, group);
    });
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
