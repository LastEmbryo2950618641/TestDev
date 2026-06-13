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
};
