window.GameModules = window.GameModules || {};

window.GameModules.rpgProfileMetrics = {
  apply(state, profile) {
    const source = profile?.initialMetrics;
    if (!state || state.id === 'player-self' || !source || state.metrics?.profileInitialApplied) return false;
    const before = JSON.stringify(state.metrics || {});
    state.metrics = state.metrics || {};
    state.metrics.emotions = state.metrics.emotions || {};
    state.metrics.playerFeelings = state.metrics.playerFeelings || {};
    state.metrics.notes = state.metrics.notes || {};
    this.applyGroup(state.metrics.emotions, source.emotions, window.GameModules.metrics.emotionKeys, state.metrics.notes, 'emotion');
    this.applyGroup(state.metrics.playerFeelings, source.playerFeelings, window.GameModules.metrics.playerKeys, state.metrics.notes, 'player');
    state.metrics.profileInitialApplied = true;
    state.metrics.profileInitialSignature = profile.roleCardInputSignature || profile.roleCardUpdatedAt || '';
    return before !== JSON.stringify(state.metrics);
  },
  rebase(state, profile, previousProfile = {}) {
    const source = profile?.initialMetrics;
    if (!state || state.id === 'player-self' || !source) return false;
    if (!state.metrics?.profileInitialApplied) return this.apply(state, profile);
    const before = JSON.stringify(state.metrics || {}), fresh = window.GameModules.metrics.fresh();
    state.metrics = state.metrics || {};
    state.metrics.emotions = window.GameModules.metrics.fill(state.metrics.emotions, window.GameModules.metrics.emotionKeys, fresh.emotions);
    state.metrics.playerFeelings = window.GameModules.metrics.fill(state.metrics.playerFeelings, window.GameModules.metrics.playerKeys, fresh.playerFeelings);
    state.metrics.notes = state.metrics.notes || {};
    this.rebaseGroup(state.metrics.emotions, source.emotions, previousProfile.initialMetrics?.emotions, window.GameModules.metrics.emotionKeys, state.metrics.notes, 'emotion', fresh.emotions);
    this.rebaseGroup(state.metrics.playerFeelings, source.playerFeelings, previousProfile.initialMetrics?.playerFeelings, window.GameModules.metrics.playerKeys, state.metrics.notes, 'player', fresh.playerFeelings);
    state.metrics.profileInitialSignature = profile.roleCardInputSignature || profile.roleCardUpdatedAt || '';
    return before !== JSON.stringify(state.metrics);
  },
  applyGroup(target, list, keys, notes, type) {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (!keys.includes(item?.key)) return;
      const value = window.GameModules.metrics.clamp(item.value);
      window.GameModules.metrics.writeMetric(target, notes, type, item, value, '根据角色初始资料与玩家关系生成。');
    });
  },
  rebaseGroup(target, list, oldList, keys, notes, type, defaults) {
    if (!Array.isArray(list)) return;
    const oldMap = new Map(Array.isArray(oldList) ? oldList.map((item) => [item?.key, window.GameModules.metrics.clamp(item?.value)]) : []);
    list.forEach((item) => {
      if (!keys.includes(item?.key)) return;
      const value = window.GameModules.metrics.clamp(item.value);
      const current = window.GameModules.metrics.clamp(target[item.key]);
      const base = oldMap.has(item.key) ? oldMap.get(item.key) : window.GameModules.metrics.clamp(defaults?.[item.key]);
      if (current !== base) return;
      window.GameModules.metrics.writeMetric(target, notes, type, item, value, '根据更新后的角色初始资料与玩家关系生成。');
    });
  },
};
