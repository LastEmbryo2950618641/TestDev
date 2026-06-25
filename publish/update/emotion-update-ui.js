window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('emotion', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = Number(change.value ?? update.value) || 0;
    const sign = change.mode === 'delta' && value > 0 ? '+' : '';
    const reasons = Array.isArray(update.reasons) ? update.reasons : [];
    const first = reasons.find(Boolean) || {};
    return {
      field: '情绪变化',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: change.mode === 'delta' ? `${sign}${value}` : (change.value ?? ''),
      trigger: first.trigger || '',
      confidence: first.confidence || '',
      detailLines: [first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
