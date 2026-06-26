window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('feeling', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = Number(change.value ?? update.value) || 0;
    const sign = change.mode === 'delta' && value > 0 ? '+' : '';
    const reasons = Array.isArray(update.reasons) ? update.reasons : [];
    const first = reasons.find(Boolean) || {};
    const evidence = first.evidence || update.reason || update.evidence || '';
    return {
      field: '感觉变化',
      name: row.name || window.GameModules.updateRegistry.leafName(update.field),
      value: change.mode === 'delta' ? `${sign}${value}` : (change.value ?? ''),
      reason: evidence || row.reason,
      trigger: first.trigger || '',
      confidence: first.confidence || '',
      detailLines: [evidence ? `说明：${evidence}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
