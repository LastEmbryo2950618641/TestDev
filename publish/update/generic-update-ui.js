window.GameModules = window.GameModules || {};

window.GameModules.updateRegistry?.registerUi?.('generic', {
  row(update = {}, store = {}, row = {}) {
    const change = update.change || {};
    const value = change.value ?? row.value ?? '';
    const first = Array.isArray(update.reasons) ? update.reasons.find(Boolean) || {} : {};
    return {
      field: row.field || update.field || '通用固化',
      name: row.name || update.name || window.GameModules.updateRegistry.leafName(update.field) || update.updateType || '通用固化',
      value: value && typeof value === 'object' ? JSON.stringify(value) : value,
      detailLines: [change.mode ? `方式：${change.mode}` : '', first.trigger ? `触发：${first.trigger}` : '', first.confidence ? `确认：${first.confidence}` : ''].filter(Boolean),
    };
  },
});
