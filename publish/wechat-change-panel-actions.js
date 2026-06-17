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
      { title: '情绪变化', items: this.wechatMetricReasonItems(metrics.emotions) },
      { title: '感觉变化', items: this.wechatMetricReasonItems(metrics.playerFeelings) },
      { title: '穿着变化', items: this.wechatWearingReasonItems(msg.lexiconUpdates) },
    ].filter((group) => group.items.length);
  },

  wechatMetricReasonItems(list = []) {
    return (Array.isArray(list) ? list : []).map((item) => {
      const delta = Number(item?.delta) || 0;
      const sign = delta > 0 ? `+${delta}` : String(delta);
      return {
        name: item?.key || '未命名',
        summary: [delta ? sign : '', item?.status].filter(Boolean).join('｜'),
        reason: item?.reason || '',
      };
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
