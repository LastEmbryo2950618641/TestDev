window.GameModules = window.GameModules || {};

window.GameModules.realWorldSettlementActions = {
  realWorldSettlementRecord(field, name, value, reason, group = '', card = null) {
    const fallback = group || this.realWorldSettlementGroup(field, name);
    const inferred = card || this.realWorldSettlementCardForGroup?.(fallback);
    return { at: new Date().toISOString(), group: fallback, cardId: inferred?.id || `legacy:${fallback}`, cardTitle: inferred?.title || fallback, section: inferred?.section || fallback, field, name, value, reason: reason || '本轮正文确认的变化。', applied: true };
  },

  resolveCharacterSettlementCard(store = null, target = '', fallbackName = '') {
    const state = store?.itemSkillState?.(target)
      || window.GameModules.characterStateStore?.getByName?.(String(target || '').trim())
      || null;
    if (!state?.id) {
      const name = String(fallbackName || target || '').trim();
      if (!name) return null;
      return { id: `role:${name}`, title: name, section: '角色卡' };
    }
    const title = store?.itemSkillStateLabel?.(state) || state.profile?.name || state.name || state.id;
    return { id: `role:${state.id}`, title, section: '角色卡' };
  },

  realWorldSettlementRecordForCharacter(field, name, value, reason, store, target = '', fallbackName = '') {
    const card = this.resolveCharacterSettlementCard(store, target, fallbackName);
    const group = card?.title || fallbackName || target || '角色';
    return this.realWorldSettlementRecord(field, name, value, reason, group, card);
  },

  realWorldSettlementCardForGroup(group = '') {
    const text = String(group || '');
    const playerName = this.realWorldPlayerSettlementName?.() || '玩家';
    if (!text || text === playerName || text === '玩家' || text === '玩家本人') return { id: 'role:player-self', title: playerName, section: '角色卡' };
    if (/势力|公司/u.test(text)) return { id: `faction:${text}`, title: text, section: '势力卡' };
    if (/地图|地点/u.test(text)) return { id: 'map:real-world', title: '地图', section: '地图卡' };
    if (/物品|装备|穿着/u.test(text)) return { id: `role:player-self`, title: playerName, section: '角色卡' };
    if (/玩家|角色|生命体征|情绪|感觉|身份|职业|状态/u.test(text)) return { id: `role:${text}`, title: text, section: '角色卡' };
    const state = this.itemSkillState?.(text);
    if (state?.id) return { id: `role:${state.id}`, title: this.itemSkillStateLabel?.(state) || text, section: '角色卡' };
    return { id: `system:${text || 'other'}`, title: text || '其他', section: '系统卡' };
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
    return this.realWorldSettlementGroups(entry).map((group) => ({ id: group.id, title: group.title, section: group.section, count: group.items.length }));
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
    return window.GameModules.updateRegistry?.settlementGroups?.(entry, this) || [];
  },

  visibleRealWorldSettlementGroups(entry = {}) {
    const active = this.activeRealWorldSettlementTab(entry);
    return this.realWorldSettlementGroups(entry).filter((group) => group.id === active);
  },

  realWorldMetricSettlement(state, updates = {}, group = '') {
    group = group || this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    const metrics = state ? this.ensureStateMetrics(state) : null;
    const card = state?.id ? { id: `role:${state.id}`, title: group, section: '角色卡' } : null;
    const rows = [];
    const add = (field, list, current = {}) => (Array.isArray(list) ? list : []).forEach((item) => {
      const before = Number(current?.[item.key] || 0);
      const decayedBefore = item.temporary ? Math.max(0, window.GameModules.metrics.clamp(before) - 1) : before;
      const rawDelta = window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta;
      const isFeeling = field === '感觉' || field === '临时感觉';
      const delta = isFeeling && !item.temporary ? window.GameModules.metrics.lockedPlayerDelta(item.key, window.GameModules.metrics.clampDelta(rawDelta), decayedBefore) : window.GameModules.metrics.clampDelta(rawDelta);
      const after = Math.max(0, Math.min(100, decayedBefore + delta));
      rows.push(this.realWorldSettlementRecord(field, item.key, `${decayedBefore} → ${after}（${window.GameModules.updateRegistry.normalizeSettlementText(window.GameModules.metrics.cleanMetricStatus(item.status || '状态更新'))}）`, window.GameModules.updateRegistry.normalizeSettlementText(window.GameModules.metrics.cleanMetricReason(item.reason, item.key)), group, card));
    });
    add('情绪', (updates.emotions || []).filter((item) => !item?.temporary), metrics?.emotions);
    add('感觉', (updates.playerFeelings || []).filter((item) => !item?.temporary), metrics?.playerFeelings);
    add('临时情绪', (updates.emotions || []).filter((item) => item?.temporary), metrics?.temporaryEmotions);
    add('临时感觉', (updates.playerFeelings || []).filter((item) => item?.temporary), metrics?.temporaryPlayerFeelings);
    return rows;
  },

  realWorldVitalSettlement(state, updates = []) {
    const labels = { vitality: '生命力', stamina_pool: '精力', satiety: '饱食度', hydration: '水分', fatigue: '疲劳', mental_stability: '精神稳定' };
    const values = state?.values || {};
    const group = this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const pool = values[item.key];
      const before = pool?.max ? window.GameModules.progression.percent(pool) : null;
      const afterValue = before === null ? null : Math.max(0, Math.min(100, before + (Number(item.delta) || 0)));
      const after = afterValue === null ? '' : `：${before} → ${afterValue}%`;
      return {
        ...this.realWorldSettlementRecord('生命体征', labels[item.key] || item.key, `变化${Number(item.delta) || 0}${after}`, item.reason, group),
        detailLines: [before === null ? '' : `前后：${before}% → ${afterValue}%`].filter(Boolean),
      };
    });
  },

  realWorldCardChangeSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(`身份/${item.field || '角色卡'}`, item.name || item.field, typeof item.value === 'object' ? JSON.stringify(item.value) : item.value, item.reason, this.realWorldSettlementTargetGroup(item.target || item.targetId || item.characterId, '')));
  },

  realWorldLexiconSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(item.kind || '词条', item.name || item.term || item.field, item.value ?? item.definition ?? item.description ?? item.summary, item.meta?.modifyReason || item.reason || item.changeMode, this.realWorldSettlementTargetGroup(item.target || item.targetId || item.characterId, this.realWorldSettlementGroup(item.kind, item.name || item.term))));
  },

  realWorldInventorySettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => ['物品', '装备', '穿着'].includes(item?.kind)).map((item) => this.realWorldSettlementRecord(item.kind, item.name || item.value?.name, item.value?.description || item.description || item.summary || item.value, item.reason || item.changeMode, this.realWorldSettlementTargetGroup(item.target || item.owner || item.characterId, '物品')));
  },

  realWorldItemActionSettlement(results = []) {
    return (Array.isArray(results) ? results : []).filter(Boolean).map((item) => this.realWorldSettlementRecord('物品动作', item.name || item.itemName || item.item?.name || item.action || '物品变化', item.summary || item.description || item.result || item.status || item.message || (item.ok === false ? '未执行，仅记录' : '已处理'), item.reason || (item.ok === false ? '未知物品动作未执行。' : ''), this.realWorldSettlementTargetGroup(item.target || item.owner || item.characterId, '物品')));
  },

  realWorldFactionSettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const name = item.factionName || item.name || item.action || item.location || '势力变化';
      const group = /公司|岗位|职级|员工|老板/.test(`${name || ''} ${item.action || ''}`) ? '公司' : '势力';
      const value = item.position || item.status || item.value || item.action || item.timeEvent || item.room || item.location || item.type || '已记录';
      const reason = item.reason || item.timeEvent || item.description || item.summary || '现实推演确认势力或地点结构变化。';
      return this.realWorldSettlementRecord(group, name, value, reason, group);
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
      if (!['vitality', 'stamina_pool', 'satiety', 'hydration', 'fatigue', 'mental_stability'].includes(key)) continue;
      const changed = apply(key, Number(item.delta) || 0);
      if (!changed) continue;
      values.vital_update_notes[key] = { ...changed, delta: Math.round(Number(item.delta) || 0), reason: String(item.reason || '').slice(0, 120), at: this.phoneDate().toISOString() };
    }
    values.health = window.GameModules.progression.percent(values.vitality);
    values.stamina = window.GameModules.progression.percent(values.stamina_pool);
    this.rpgStates = { ...this.rpgStates, [state.id]: state };
    await window.GameModules.characterStateStore?.save?.(state);
  },
};
