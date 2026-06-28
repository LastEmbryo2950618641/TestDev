window.GameModules = window.GameModules || {};

window.GameModules.realWorldTargetUpdates = {
  targetKey(item = {}) {
    return String(item.target || item.targetId || item.characterId || item.character || item.name || item.subject?.characterId || item.subject?.id || item.subject?.name || item.owner || item.to || 'player-self').trim() || 'player-self';
  },

  targetState(store, target = 'player-self') {
    return store.itemSkillState?.(target) || (target === 'player-self' ? store.playerIdentityState?.() : null);
  },

  metricUpdateGroups(result = {}) {
    const direct = result.metricUpdates || {};
    const groups = [];
    if ((direct.emotions?.length || 0) || (direct.playerFeelings?.length || 0)) groups.push({ target: direct.target || direct.targetId || 'player-self', updates: direct });
    for (const item of Array.isArray(result.characterMetricUpdates) ? result.characterMetricUpdates : []) {
      if (item?.field && item?.change) continue;
      groups.push({ target: this.targetKey(item), updates: { emotions: item.emotions || [], playerFeelings: item.playerFeelings || [] } });
    }
    return groups;
  },

  normalizeMetricUpdatesForState(updates = {}, metrics = null) {
    return {
      emotions: window.GameModules.ai.normalizeMetricGroup?.(updates.emotions, window.GameModules.metrics.emotionKeys, metrics?.emotions) || [],
      playerFeelings: window.GameModules.ai.normalizeMetricGroup?.(updates.playerFeelings, window.GameModules.metrics.playerKeys, metrics?.playerFeelings) || [],
    };
  },

  async applyMetrics(store, result = {}) {
    const settlement = [];
    const groups = [];
    const groupMap = new Map();
    const addGroup = (group = {}) => {
      const target = String(group.target || 'player-self');
      const state = this.targetState(store, target);
      const key = state?.id ? `state:${state.id}` : `target:${target}`;
      const updates = group.updates || {};
      if (!groupMap.has(key)) {
        const next = { target, updates: { emotions: [], playerFeelings: [] } };
        groupMap.set(key, next);
        groups.push(next);
      }
      const current = groupMap.get(key).updates;
      current.emotions.push(...(Array.isArray(updates.emotions) ? updates.emotions : []));
      current.playerFeelings.push(...(Array.isArray(updates.playerFeelings) ? updates.playerFeelings : []));
    };
    this.metricUpdateGroups(result).forEach((group) => addGroup(group));
    const targets = new Set(groups.map((group) => String(group.target || 'player-self')));
    const targetStateIds = new Set(groups.map((group) => this.targetState(store, group.target)?.id).filter(Boolean));
    const addDecayTarget = (target, state) => {
      const metrics = state?.metrics;
      const hasTemporary = Object.keys(metrics?.temporaryEmotions || {}).length || Object.keys(metrics?.temporaryPlayerFeelings || {}).length;
      if (state?.id && hasTemporary && !targets.has(target) && !targetStateIds.has(state.id)) {
        targets.add(target);
        targetStateIds.add(state.id);
        groups.push({ target, updates: { emotions: [], playerFeelings: [] } });
      }
    };
    addDecayTarget('player-self', store.playerIdentityState?.());
    Object.values(store.rpgStates || {}).forEach((state) => addDecayTarget(state?.id, state));
    for (const group of groups) {
      const state = this.targetState(store, group.target);
      const metrics = state?.id ? store.ensureStateMetrics?.(state) : null;
      const updates = this.normalizeMetricUpdatesForState(group.updates, metrics);
      const fallback = state?.id === 'player-self' ? '' : (store.itemSkillStateLabel?.(state) || state?.id || group.target);
      const title = state?.id ? (store.realWorldSettlementTargetGroup?.(state.id, fallback) || fallback) : (store.realWorldSettlementTargetGroup?.(group.target, group.target) || group.target || '角色');
      settlement.push(...(store.realWorldMetricSettlement?.(state, updates, title) || []));
      if (state?.id) await store.applyMetricUpdatesToState?.(state, updates);
    }
    return settlement;
  },

  groupedLexicon(updates = []) {
    const map = new Map();
    for (const item of Array.isArray(updates) ? updates : []) {
      const key = this.targetKey(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map, ([target, items]) => ({ target, items }));
  },

  async applyLexicon(store, updates = []) {
    const settlement = [];
    const generic = [];
    for (const group of this.groupedLexicon(updates)) {
      const state = this.targetState(store, group.target);
      const cardItems = group.items.filter((item) => item?.kind === '角色卡' || item?.kind === '角色技能');
      const inventoryItems = group.items.filter((item) => ['物品', '装备', '穿着'].includes(item?.kind));
      const targetItems = group.items.map((item) => ({ ...item, target: state?.id || group.target }));
      if (state?.id && cardItems.length) {
        const cardChanges = await window.GameModules.characterCardLexicon?.applyToState?.(state, targetItems.filter((item) => item.kind === '角色卡' || item.kind === '角色技能')) || [];
        settlement.push(...(store.realWorldCardChangeSettlement?.(cardChanges.map((item) => ({ ...item, target: state.id }))) || []));
      }
      if (state?.id && inventoryItems.length) await store.applyInventoryUpdatesToState?.(state, targetItems.filter((item) => ['物品', '装备', '穿着'].includes(item.kind)));
      generic.push(...targetItems.filter((item) => !['角色卡', '角色技能', '物品', '装备', '穿着'].includes(item?.kind)));
      if (inventoryItems.length) settlement.push(...(store.realWorldInventorySettlement?.(targetItems.filter((item) => ['物品', '装备', '穿着'].includes(item.kind))) || []));
    }
    const lexiconChanges = await window.GameModules.rpgLexicon.applyLexiconSkill?.(generic) || [];
    settlement.push(...(store.realWorldLexiconSettlement?.(lexiconChanges.length ? lexiconChanges : generic) || []));
    return settlement;
  },
};
