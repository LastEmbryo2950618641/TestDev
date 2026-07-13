window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('sexual-experience', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value || {};
    const total = value.totalDelta ?? change.value ?? row.value;
    const parts = value.parts && typeof value.parts === 'object' ? Object.entries(value.parts).map(([k, v]) => `${k}${Number(v) >= 0 ? '+' : ''}${v}`).join('、') : '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: '经历次数',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: change.mode === 'delta' ? `变化${Number(total) >= 0 ? '+' : ''}${total}` : total,
      detailLines: [parts ? `分类：${parts}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
