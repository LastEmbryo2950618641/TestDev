window.GameModules = window.GameModules || {};

window.GameModules.wechatDomainHelpers = Object.assign(window.GameModules.wechatDomainHelpers || {}, {
  wechatMetricState(msg = {}) {
    const id = msg.characterId || '';
    return this.rpgStates?.[id] || null;
  },

  usefulMetricText(text = '', key = '') {
    const value = String(text || '').trim();
    return value && !/缺少AI生成/.test(value);
  },

  metricProfileItem(state, group, key) {
    const list = group === 'emotions' ? state?.profile?.initialMetrics?.emotions : state?.profile?.initialMetrics?.playerFeelings;
    return (Array.isArray(list) ? list : []).find((item) => item?.key === key) || null;
  },
});
