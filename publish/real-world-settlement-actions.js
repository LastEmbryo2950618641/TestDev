window.GameModules = window.GameModules || {};

window.GameModules.realWorldSettlementActions = {
  realWorldSettlementRecord(field, name, value, reason, group = '', card = null) {
    const fallback = group || this.realWorldSettlementGroup(field, name);
    const inferred = card || this.realWorldSettlementCardForGroup?.(fallback);
    return { at: new Date().toISOString(), group: fallback, cardId: inferred?.id || `legacy:${fallback}`, cardTitle: inferred?.title || fallback, section: inferred?.section || fallback, field, name, value, reason: reason || '鏈疆姝ｆ枃纭鐨勫彉鍖栥€?, applied: true };
  },

  resolveCharacterSettlementCard(store = null, target = '', fallbackName = '') {
    const state = store?.itemSkillState?.(target)
      || window.GameModules.sqliteSave?.getCharacterStateByName?.(String(target || '').trim())
      || null;
    if (!state?.id) {
      const name = String(fallbackName || target || '').trim();
      if (!name) return null;
      return { id: `role:${name}`, title: name, section: '瑙掕壊鍗? };
    }
    const title = store?.itemSkillStateLabel?.(state) || state.profile?.name || state.name || state.id;
    return { id: `role:${state.id}`, title, section: '瑙掕壊鍗? };
  },

  realWorldSettlementRecordForCharacter(field, name, value, reason, store, target = '', fallbackName = '') {
    const card = this.resolveCharacterSettlementCard(store, target, fallbackName);
    const group = card?.title || fallbackName || target || '瑙掕壊';
    return this.realWorldSettlementRecord(field, name, value, reason, group, card);
  },

  realWorldSettlementCardForGroup(group = '') {
    const text = String(group || '');
    const playerName = this.realWorldPlayerSettlementName?.() || '鐜╁';
    if (!text || text === playerName || text === '鐜╁' || text === '鐜╁鏈汉') return { id: 'role:player-self', title: playerName, section: '瑙掕壊鍗? };
    if (/鍔垮姏|鍏徃/u.test(text)) return { id: `faction:${text}`, title: text, section: '鍔垮姏鍗? };
    if (/鍦板浘|鍦扮偣/u.test(text)) return { id: 'map:real-world', title: '鍦板浘', section: '鍦板浘鍗? };
    if (/鐗╁搧|瑁呭|绌跨潃/u.test(text)) return { id: `role:player-self`, title: playerName, section: '瑙掕壊鍗? };
    if (/鐜╁|瑙掕壊|鐢熷懡浣撳緛|鎯呯华|鎰熻|韬唤|鑱屼笟|鐘舵€?u.test(text)) return { id: `role:${text}`, title: text, section: '瑙掕壊鍗? };
    const state = this.itemSkillState?.(text);
    if (state?.id) return { id: `role:${state.id}`, title: this.itemSkillStateLabel?.(state) || text, section: '瑙掕壊鍗? };
    return { id: `system:${text || 'other'}`, title: text || '鍏朵粬', section: '绯荤粺鍗? };
  },

  realWorldPlayerSettlementName() {
    const display = this.playerDisplayCharacter?.();
    const state = this.playerIdentityState?.();
    return display?.name || state?.profile?.name || state?.name || this.playerProfile?.name || this.playerName || '鎵嬫満涓讳汉';
  },

  realWorldSettlementTargetGroup(target = '', fallback = '') {
    const value = String(target || '').trim();
    const player = this.playerIdentityState?.();
    const playerName = this.realWorldPlayerSettlementName();
    if (!value || value === 'player-self' || value === 'player' || value === '鐜╁' || value === '鐜╁鏈汉' || value === player?.id || value === this.playerProfile?.name || value === playerName) return playerName;
    const state = this.itemSkillState?.(value);
    if (state?.id) return this.itemSkillStateLabel?.(state) || state.profile?.name || state.name || state.id;
    return fallback && fallback !== '鐜╁' ? fallback.replace(/^瑙掕壊[:锛歖/u, '') : value;
  },

  realWorldSettlementGroup(field = '', name = '') {
    const text = `${field} ${name}`;
    if (/鍏徃|宀椾綅|鑱岀骇|鍛樺伐|鑰佹澘/.test(text)) return '鍏徃';
    if (/鍔垮姏|绀剧兢|绀惧尯|瀹跺涵|缁勭粐|閮ㄩ棬/.test(text)) return '鍔垮姏';
    if (/鐢熷懡浣撳緛|鎯呯华|鎰熻|鐜╁|韬唤|鑱屼笟|鐘舵€亅闃佃惀/.test(text)) return '鐜╁';
    if (/鐗╁搧|瑁呭|绌跨潃/.test(text)) return '鐗╁搧';
    return /瑙掕壊|鍏崇郴|鎶€鑳?.test(text) ? '瑙掕壊' : '鍏朵粬';
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
    const card = state?.id ? { id: `role:${state.id}`, title: group, section: '瑙掕壊鍗? } : null;
    const rows = [];
    const add = (field, list, current = {}) => (Array.isArray(list) ? list : []).forEach((item) => {
      const before = Number(current?.[item.key] || 0);
      const decayedBefore = item.temporary ? Math.max(0, window.GameModules.metrics.clamp(before) - 1) : before;
      const rawDelta = window.GameModules.metrics.metricDeltaValue?.(item) ?? item.delta;
      const isFeeling = field === '鎰熻' || field === '涓存椂鎰熻';
      const delta = isFeeling && !item.temporary ? window.GameModules.metrics.lockedPlayerDelta(item.key, window.GameModules.metrics.clampDelta(rawDelta), decayedBefore) : window.GameModules.metrics.clampDelta(rawDelta);
      const after = Math.max(0, Math.min(100, decayedBefore + delta));
      rows.push(this.realWorldSettlementRecord(field, item.key, `${decayedBefore} 鈫?${after}锛?{window.GameModules.updateRegistry.normalizeSettlementText(window.GameModules.metrics.cleanMetricStatus(item.status || '鐘舵€佹洿鏂?))}锛塦, window.GameModules.updateRegistry.normalizeSettlementText(window.GameModules.metrics.cleanMetricReason(item.reason, item.key)), group, card));
    });
    add('鎯呯华', (updates.emotions || []).filter((item) => !item?.temporary), metrics?.emotions);
    add('鎰熻', (updates.playerFeelings || []).filter((item) => !item?.temporary), metrics?.playerFeelings);
    add('涓存椂鎯呯华', (updates.emotions || []).filter((item) => item?.temporary), metrics?.temporaryEmotions);
    add('涓存椂鎰熻', (updates.playerFeelings || []).filter((item) => item?.temporary), metrics?.temporaryPlayerFeelings);
    return rows;
  },

  realWorldVitalSettlement(state, updates = []) {
    const labels = { vitality: '鐢熷懡鍔?, stamina_pool: '绮惧姏', satiety: '楗遍搴?, hydration: '姘村垎', fatigue: '鐤插姵', mental_stability: '绮剧绋冲畾' };
    const values = state?.values || {};
    const group = this.realWorldSettlementTargetGroup(state?.id || 'player-self', '');
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const pool = values[item.key];
      const before = pool?.max ? window.GameModules.progression.percent(pool) : null;
      const afterValue = before === null ? null : Math.max(0, Math.min(100, before + (Number(item.delta) || 0)));
      const after = afterValue === null ? '' : `锛?{before} 鈫?${afterValue}%`;
      return {
        ...this.realWorldSettlementRecord('鐢熷懡浣撳緛', labels[item.key] || item.key, `鍙樺寲${Number(item.delta) || 0}${after}`, item.reason, group),
        detailLines: [before === null ? '' : `鍓嶅悗锛?{before}% 鈫?${afterValue}%`].filter(Boolean),
      };
    });
  },

  realWorldCardChangeSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(`韬唤/${item.field || '瑙掕壊鍗?}`, item.name || item.field, typeof item.value === 'object' ? JSON.stringify(item.value) : item.value, item.reason, this.realWorldSettlementTargetGroup(item.target || item.targetId || item.characterId, '')));
  },

  realWorldLexiconSettlement(changes = []) {
    return (Array.isArray(changes) ? changes : []).map((item) => this.realWorldSettlementRecord(item.kind || '璇嶆潯', item.name || item.term || item.field, item.value ?? item.definition ?? item.description ?? item.summary, item.meta?.modifyReason || item.reason || item.changeMode, this.realWorldSettlementTargetGroup(item.target || item.targetId || item.characterId, this.realWorldSettlementGroup(item.kind, item.name || item.term))));
  },

  realWorldInventorySettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).filter((item) => ['鐗╁搧', '瑁呭', '绌跨潃'].includes(item?.kind)).map((item) => this.realWorldSettlementRecord(item.kind, item.name || item.value?.name, item.value?.description || item.description || item.summary || item.value, item.reason || item.changeMode, this.realWorldSettlementTargetGroup(item.target || item.owner || item.characterId, '鐗╁搧')));
  },

  realWorldItemActionSettlement(results = []) {
    return (Array.isArray(results) ? results : []).filter(Boolean).map((item) => this.realWorldSettlementRecord('鐗╁搧鍔ㄤ綔', item.name || item.itemName || item.item?.name || item.action || '鐗╁搧鍙樺寲', item.summary || item.description || item.result || item.status || item.message || (item.ok === false ? '鏈墽琛岋紝浠呰褰? : '宸插鐞?), item.reason || (item.ok === false ? '鏈煡鐗╁搧鍔ㄤ綔鏈墽琛屻€? : ''), this.realWorldSettlementTargetGroup(item.target || item.owner || item.characterId, '鐗╁搧')));
  },

  realWorldFactionSettlement(updates = []) {
    return (Array.isArray(updates) ? updates : []).map((item) => {
      const name = item.factionName || item.name || item.action || item.location || '鍔垮姏鍙樺寲';
      const group = /鍏徃|宀椾綅|鑱岀骇|鍛樺伐|鑰佹澘/.test(`${name || ''} ${item.action || ''}`) ? '鍏徃' : '鍔垮姏';
      const value = item.position || item.status || item.value || item.action || item.timeEvent || item.room || item.location || item.type || '宸茶褰?;
      const reason = item.reason || item.timeEvent || item.description || item.summary || '鐜板疄鎺ㄦ紨纭鍔垮姏鎴栧湴鐐圭粨鏋勫彉鍖栥€?;
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

