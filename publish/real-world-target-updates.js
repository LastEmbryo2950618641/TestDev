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

  async applyMetrics(store, result = {}) {
    const settlement = [];
    for (const group of this.metricUpdateGroups(result)) {
      const state = this.targetState(store, group.target);
      const fallback = state?.id === 'player-self' ? '' : (store.itemSkillStateLabel?.(state) || state?.id || group.target);
      const title = state?.id ? (store.realWorldSettlementTargetGroup?.(state.id, fallback) || fallback) : (store.realWorldSettlementTargetGroup?.(group.target, group.target) || group.target || '角色');
      settlement.push(...(store.realWorldMetricSettlement?.(state, group.updates, title) || []));
      if (state?.id) await store.applyMetricUpdatesToState?.(state, group.updates);
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
