window.GameModules = window.GameModules || {};

window.GameModules.wechatChangePanelActions = {
  toggleWechatChangePanel(msg) {
    if (!msg) return;
    msg.changeReasonsOpen = !msg.changeReasonsOpen;
  },

  wechatHasChangeReasons(msg) {
    return this.wechatChangeGroups(msg).some((group) => group.items.length);
  },

  wechatChangeGroups(msg = {}) {
    const metrics = msg.metricUpdates || {};
    return [
      { title: '情绪变化', items: this.wechatMetricReasonItems(metrics.emotions, 'emotions', msg) },
      { title: '感觉变化', items: this.wechatMetricReasonItems(metrics.playerFeelings, 'playerFeelings', msg) },
      { title: '穿着变化', items: this.wechatWearingReasonItems(msg.lexiconUpdates) },
    ].filter((group) => group.items.length);
  },

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

  wechatMetricReasonItems(list = [], group = 'emotions', msg = {}) {
    const state = this.wechatMetricState(msg);
    const valueMap = group === 'emotions' ? state?.metrics?.emotions : state?.metrics?.playerFeelings;
    const notePrefix = group === 'emotions' ? 'emotion' : 'player';
    return (Array.isArray(list) ? list : []).map((item) => {
      const key = item?.key || '未命名';
      const delta = Number(item?.delta) || 0;
      const nextValue = Number.isFinite(Number(valueMap?.[key])) ? window.GameModules.metrics.clamp(valueMap[key]) : null;
      const prevValue = nextValue === null ? null : window.GameModules.metrics.clamp(nextValue - delta);
      const note = state?.metrics?.notes?.[`${notePrefix}:${key}`] || {};
      const profile = this.metricProfileItem(state, group, key) || {};
      const status = [item?.status, note.status, profile.status].find((text) => this.usefulMetricText(text, key)) || '';
      const reason = [item?.reason, note.reason, profile.reason].find((text) => this.usefulMetricText(text, key)) || '';
      const sign = delta > 0 ? `+${delta}` : String(delta);
      const formula = nextValue === null ? (delta ? sign : '') : `${prevValue}${sign}=${nextValue}`;
      return { name: key, summary: [formula, status].filter(Boolean).join('｜'), reason };
    }).filter((item) => item.reason || item.summary);
  },

  wechatWearingReasonItems(list = []) {
    return (Array.isArray(list) ? list : []).filter((item) => item?.kind === '穿着').map((item) => {
      const value = item?.value && typeof item.value === 'object' ? item.value : {};
      return {
        name: item?.name || value.name || value.slot || '穿着',
        summary: [item?.slot || value.slot, item?.summary || item?.description || value.description].filter(Boolean).join('｜'),
        reason: item?.reason || value.reason || '',
      };
    }).filter((item) => item.reason || item.summary);
  },
};
